##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Columns Node (For Catalog objects) """

from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response
from pgadmin.utils.driver import get_driver
from pgadmin.utils.ajax import gone
from pgadmin.utils.preferences import Preferences

from config import PG_DEFAULT_DRIVER


class CatalogObjectColumnsModule(CollectionNodeModule):
    """
     class ColumnModule(CollectionNodeModule)

        A module class for column node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the column and it's base module.

    * get_nodes(gid, sid, did, scid, coid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for column, when any of the server node is
        initialized.
    """

    NODE_TYPE = 'catalog_object_column'
    COLLECTION_LABEL = gettext("Columns")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the ColumnModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        super(CatalogObjectColumnsModule, self).__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid, coid):
        """
        Generate the collection node
        """
        yield self.generate_browser_collection_node(coid)

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the database node is
        initialized.
        """
        return database.DatabaseModule.NODE_TYPE

    @property
    def node_inode(self):
        """
        Load the module node as a leaf node
        """
        return False

    def register_preferences(self):
        """
        Register preferences for this module.
        """
        # Add the node informaton for browser, not in respective
        # node preferences
        self.browser_preference = Preferences.module('browser')
        self.pref_show_system_objects = self.browser_preference.preference(
            'show_system_objects'
        )


blueprint = CatalogObjectColumnsModule(__name__)


class CatalogObjectColumnsView(PGChildNodeView):
    """
    This class is responsible for generating routes for column node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ColumnView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - Returns the properties of all the columns for the catalog object.

    * nodes()
      - Creates and returns all the children nodes of type - catalog object
        column.

    * properties(gid, sid, did, scid, coid, clid)
      - Returns the properties of the given catalog-object column node.

    * dependency(gid, sid, did, scid, coid, clid):
      - Returns the dependencies list of the given node.

    * dependent(gid, sid, did, scid, coid, clid):
      - Returns the dependents list of the given node.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'},
        {'type': 'int', 'id': 'coid'}
    ]
    ids = [
        {'type': 'int', 'id': 'clid'}
    ]

    operations = dict({
        'obj': [{'get': 'properties'}, {'get': 'list'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}]
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
            self.template_path = 'catalog_object_column/sql/9.1_plus'

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid, coid):
        """
        This function is used to list all the column
        nodes within that collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: Catalog objects ID

        Returns:
            JSON of available column nodes
        """
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']), coid=coid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, coid):
        """
        This function will used to create all the child node within that collection.
        Here it will create all the column node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: Catalog objects ID

        Returns:
            JSON of available column child nodes
        """
        res = []
        SQL = render_template("/".join([self.template_path,
                                        'nodes.sql']), coid=coid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['attnum'],
                    coid,
                    row['attname'],
                    icon="icon-catalog_object_column"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, coid, clid):
        """
        This function will show the properties of the selected
        column node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            coid: Catalog object ID
            clid: Column ID

        Returns:
            JSON of selected column node
        """
        SQL = render_template("/".join([self.template_path,
                              'properties.sql']), coid=coid, clid=clid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the specified column."""))

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def dependents(self, gid, sid, did, scid, coid, clid):
        """
        This function get the dependents and return ajax response
        for the column node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: Catalog object ID
            clid: Column ID
        """
        # Specific condition for column which we need to append
        where = "WHERE dep.refobjid={0}::OID AND dep.refobjsubid={1}".format(
            coid, clid
        )

        dependents_result = self.get_dependents(
            self.conn, clid, where=where
        )

        # Specific sql to run againt column to fetch dependents
        SQL = render_template("/".join([self.template_path,
                                        'depend.sql']), where=where)

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            ref_name = row['refname']
            if ref_name is None:
                continue

            dep_type = ''
            dep_str = row['deptype']
            if dep_str == 'a':
                dep_type = 'auto'
            elif dep_str == 'n':
                dep_type = 'normal'
            elif dep_str == 'i':
                dep_type = 'internal'

            dependents_result.append({'type': 'sequence', 'name': ref_name, 'field': dep_type})

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, coid, clid):
        """
        This function get the dependencies and return ajax response
        for the column node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: Catalog objects ID
            clid: Column ID

        """
        # Specific condition for column which we need to append
        where = "WHERE dep.objid={0}::OID AND dep.objsubid={1}".format(
            coid, clid
        )

        dependencies_result = self.get_dependencies(
            self.conn, clid, where=where
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )


CatalogObjectColumnsView.register_node_view(blueprint)
