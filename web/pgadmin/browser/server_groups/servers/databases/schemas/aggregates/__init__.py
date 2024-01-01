##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Aggregate Node """

from functools import wraps

from flask import render_template
from flask_babel import gettext

import pgadmin.browser.server_groups.servers.databases as database
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.utils.driver import get_driver


class AggregateModule(SchemaChildModule):
    """
     class AggregateModule(SchemaChildModule)

        A module class for Aggregate node derived from SchemaChildModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Aggregate and it's base module.

    * get_nodes(gid, sid, did, scid, agid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """

    _NODE_TYPE = 'aggregate'
    _COLLECTION_LABEL = gettext("Aggregates")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the AggregateModule and it's base module.

        Args:
            *args:
            **kwargs:
        """

        super().__init__(*args, **kwargs)
        self.min_ver = 90100
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the collection node
        """
        if self.has_nodes(sid, did, scid=scid,
                          base_template_path=AggregateView.BASE_TEMPLATE_PATH):
            yield self.generate_browser_collection_node(scid)

    @property
    def script_load(self):
        """
        Load the module script for database, when any of the database node is
        initialized.
        """
        return database.DatabaseModule.node_type

    @property
    def node_inode(self):
        return False


blueprint = AggregateModule(__name__)


class AggregateView(PGChildNodeView):
    """
    This class is responsible for generating routes for Aggregate node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the AggregateView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Aggregate nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Aggregate node.

    * properties(gid, sid, did, scid, agid)
      - This function will show the properties of the selected Aggregate node


    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the
        selected Aggregate node.
    """

    node_type = blueprint.node_type
    node_label = "Aggregate"
    BASE_TEMPLATE_PATH = 'aggregates/sql/#{0}#'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'agid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}]
    })

    def check_precondition(f):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,did
            self = args[0]
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
                kwargs['sid']
            )
            self.conn = self.manager.connection(did=kwargs['did'])
            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                kwargs['did'] in self.manager.db_info and
                'datistemplate' in self.manager.db_info[kwargs['did']]
            ):
                self.datistemplate = self.manager.db_info[
                    kwargs['did']]['datistemplate']

            # Set the template path for the SQL scripts
            self.template_path = \
                self.BASE_TEMPLATE_PATH.format(self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the aggregate nodes within that
        collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available aggregate nodes
        """

        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), scid=scid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid):
        """
        This function will used to create all the child node within that
        collection.
        Here it will create all the aggregate node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available aggregate child nodes
        """

        res = []
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), scid=scid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-aggregate",
                    description=row['description']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, agid):
        """
        This function will fetch properties of the aggregate node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            agid: Aggregate ID

        Returns:
            JSON of given aggregate node
        """

        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), agid=agid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-aggregate"
                ),
                status=200
            )

        return gone(self.not_found_error_msg())

    @check_precondition
    def properties(self, gid, sid, did, scid, agid):
        """
        This function will show the properties of the selected aggregate node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            agid: Aggregate ID

        Returns:
            JSON of selected aggregate node
        """

        status, res = self._fetch_properties(scid, agid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, agid):
        """
        This function fetch the properties for the specified object.

        :param scid: Schema ID
        :param agid: Aggregate ID
        """

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, agid=agid,
                              datlastsysoid=self._DATABASE_LAST_SYSTEM_OID)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(self.not_found_error_msg())

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
            self.datistemplate)

        return True, res['rows'][0]

    @check_precondition
    def sql(self, gid, sid, did, scid, agid, **kwargs):
        """
        This function will generates reverse engineered sql for aggregate
        object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           agid: Aggregate ID
           json_resp: True then return json response
        """

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, agid=agid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        data = res['rows'][0]

        SQL = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=data)

        sql_header = "-- Aggregate: {0};\n\n-- ".format(data['name'])

        sql_header += render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      data=data)
        SQL = sql_header + '\n' + SQL.strip('\n')

        return ajax_response(response=SQL)


AggregateView.register_node_view(blueprint)
