##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements External Tables Node"""
import os
from functools import wraps
from gettext import gettext

from flask import render_template

from config import PG_DEFAULT_DRIVER
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers import databases
from pgadmin.browser.server_groups.servers.databases \
    .external_tables.mapping_utils import map_execution_location
from pgadmin.browser.server_groups.servers.databases \
    .external_tables.properties import Properties, \
    PropertiesTableNotFoundException, PropertiesException
from pgadmin.browser.server_groups.servers.databases \
    .external_tables.reverse_engineer_ddl import ReverseEngineerDDL
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, make_response, \
    internal_server_error
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.utils.driver import get_driver


class ExternalTablesModule(CollectionNodeModule):
    """
    class ExternalTablesModule(CollectionNodeModule)

        A module class for External Tables node derived from
        CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the External Tables module
        and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for External Tables, when any of
        the database node is initialized.
    """

    _NODE_TYPE = 'external_table'
    _COLLECTION_LABEL = gettext("External Tables")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the External tables module and
        it's base module.

        Args:
            *args:
            **kwargs:
        """

        super(ExternalTablesModule, self).__init__(*args, **kwargs)
        self.max_ver = 0
        self.server_type = ['gpdb']

    def get_nodes(self, gid, sid, did):
        yield self.generate_browser_collection_node(did)

    @property
    def script_load(self):
        """
        Load the module script for External tables,
        when any of the database node is initialized.

        Returns: node type of the database module.
        """
        return databases.DatabaseModule.node_type

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = ExternalTablesModule(__name__)


class ExternalTablesView(PGChildNodeView):
    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'server_group_id'},
        {'type': 'int', 'id': 'server_id'},
        {'type': 'int', 'id': 'database_id'}
    ]

    ids = [
        {'type': 'int', 'id': 'external_table_id'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'children': [{'get': 'children'}]
    })

    def check_precondition(function_wrapped):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """

        @wraps(function_wrapped)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,did
            self = args[0]
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
                kwargs['server_id']
            )
            self.connection = self.manager.connection(
                did=kwargs['database_id']
            )
            self.sql_template_path = compile_template_path(
                'sql',
                self.manager.server_type,
                self.manager.sversion
            )

            return function_wrapped(*args, **kwargs)

        return wrap

    def __init__(self, *args, **kwargs):
        super(ExternalTablesView, self).__init__(*args, **kwargs)
        self.connection = None
        self.manager = None
        self.sql_template_path = None

    @check_precondition
    def nodes(self, server_group_id, server_id, database_id):
        """
        This function will used to create all the child node within that
        collection.
        Here it will create all the foreign data wrapper node.

        Args:
            server_group_id: Server Group ID
            server_id: Server ID
            database_id: Database ID
        """
        sql_statement = render_template(
            os.path.join(self.sql_template_path, 'list.sql')
        )

        result = self.get_external_tables(database_id, sql_statement)

        if not isinstance(result, list):
            return result

        return make_json_response(
            data=result,
            status=200
        )

    @check_precondition
    def node(self, server_group_id, server_id, database_id, external_table_id):
        """
        This function will used to create all the child node within that
        collection.
        Here it will create all the foreign data wrapper node.

        Args:
            server_group_id: Server Group ID
            server_id: Server ID
            database_id: Database ID
            external_table_id: External Table ID
        """
        sql_statement = render_template(
            template_name_or_list=os.path.join(
                self.sql_template_path,
                self._NODE_SQL
            ),
            external_table_id=external_table_id
        )
        result = self.get_external_tables(database_id, sql_statement)

        if not isinstance(result, list):
            return result

        if not result:
            return make_json_response(
                data=gettext('Could not find the external table.'),
                status=404
            )

        return make_json_response(
            data=result[0],
            status=200
        )

    @check_precondition
    def sql(self, server_group_id, server_id, database_id, external_table_id):
        """
        This function will used to create all the child node within that
        collection.
        Here it will create all the foreign data wrapper node.

        Args:
            server_group_id: Server Group ID
            server_id: Server ID
            database_id: Database ID
            external_table_id: External Table ID
        """
        sql = ReverseEngineerDDL(self.sql_template_path,
                                 render_template,
                                 self.connection, server_group_id, server_id,
                                 database_id).execute(external_table_id)

        return make_response(
            sql.strip('\n')
        )

    @check_precondition
    def properties(self, server_group_id, server_id, database_id,
                   external_table_id):
        try:
            response = Properties(render_template, self.connection,
                                  self.sql_template_path).retrieve(
                external_table_id)
            return make_response(
                response=response,
                status=200)
        except PropertiesTableNotFoundException:
            return make_json_response(
                data=gettext('Could not find the external table.'),
                status=404
            )
        except PropertiesException as exception:
            return exception.response_object

    def children(self, **kwargs):
        return make_json_response(data=[])

    def get_external_tables(self, database_id, sql_statement):
        status, external_tables = self.connection \
            .execute_2darray(sql_statement)
        if not status:
            return internal_server_error(errormsg=external_tables)

        icon_css_class = 'icon-external_table'
        result = []
        for external_table in external_tables['rows']:
            result.append(self.blueprint.generate_browser_node(
                external_table['oid'],
                database_id,
                external_table['name'],
                inode=False,
                icon=icon_css_class
            ))
        return result


ExternalTablesView.register_node_view(blueprint)
