##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Catalog objects Node."""

from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response
from pgadmin.utils.driver import get_driver
from pgadmin.utils.ajax import gone

from config import PG_DEFAULT_DRIVER


class CatalogObjectModule(SchemaChildModule):
    """
     class CatalogObjectModule(SchemaChildModule)

        A module class for Catalog objects node derived from SchemaChildModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Catalog objects and it's base module.

    * get_nodes(gid, sid, did, scid, coid)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for Catalog objects, when any of the server node
        is initialized.
    """
    NODE_TYPE = 'catalog_object'
    COLLECTION_LABEL = gettext("Catalog Objects")

    # Flag for not to show node under Schema/Catalog node
    # By default its set to True to display node in schema/catalog
    # We do not want to display 'Catalog Objects' under Schema/Catalog
    # but only in information_schema/sys/dbo
    CATALOG_DB_SUPPORTED = False
    SUPPORTED_SCHEMAS = ['information_schema', 'sys', 'dbo']

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the CatalogObjectModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        super(CatalogObjectModule, self).__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the collection node
        """
        yield self.generate_browser_collection_node(scid)

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the database node is
        initialized.
        """
        return database.DatabaseModule.NODE_TYPE


blueprint = CatalogObjectModule(__name__)


class CatalogObjectView(PGChildNodeView):
    """
    This class is responsible for generating routes for Catalog objects node.

    Methods:
    -------
    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - Lists all the Catalog objects nodes within that collection.

    * nodes()
      - Creates all the nodes of type Catalog objects.

    * properties(gid, sid, did, scid, coid)
      - Shows the properties of the selected Catalog objects node.

    * dependency(gid, sid, did, scid):
      - Returns the dependencies list for the given catalog object node.

    * dependent(gid, sid, did, scid):
      - Returns the dependents list for the given Catalog objects node.
    """
    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'coid'}
    ]

    operations = dict({
        'obj': [{'get': 'properties'}, {'get': 'list'}],
        'children': [{'get': 'children'}],
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
            self.template_path = 'catalog_object/sql/{0}/9.1_plus'.format(
                'ppas' if self.manager.server_type == 'ppas' else 'pg'
            )

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the catalog objects
        nodes within that collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available catalog objects nodes
        """

        SQL = render_template("/".join([
            self.template_path, 'properties.sql'
        ]), scid=scid
        )

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
        This function will used to create all the child node within that collection.
        Here it will create all the catalog objects node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available catalog objects child nodes
        """
        res = []
        SQL = render_template(
            "/".join([self.template_path, 'nodes.sql']), scid=scid
        )

        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-catalog_object"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, coid):
        """
        This function will fetch properties of catalog objects node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: Catalog object ID

        Returns:
            JSON of given catalog objects child node
        """
        SQL = render_template(
            "/".join([self.template_path, 'nodes.sql']), coid=coid
        )

        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-catalog_object"
                ),
                status=200
            )

        return gone(errormsg=gettext("Could not find the specified catalog object."))

    @check_precondition
    def properties(self, gid, sid, did, scid, coid):
        """
        This function will show the properties of the selected
        catalog objects node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            coid: Catalog object ID

        Returns:
            JSON of selected catalog objects node
        """
        SQL = render_template(
            "/".join([self.template_path, 'properties.sql']),
            scid=scid, coid=coid
        )
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the specified catalog object."""))

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def dependents(self, gid, sid, did, scid, coid):
        """
        This function get the dependents and return ajax response
        for the catalog objects node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: catalog objects ID
        """
        dependents_result = self.get_dependents(self.conn, coid)

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, coid):
        """
        This function get the dependencies and return ajax response
        for the catalog objects node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            coid: catalog objects ID
        """
        dependencies_result = self.get_dependencies(self.conn, coid)

        return ajax_response(
            response=dependencies_result,
            status=200
        )


CatalogObjectView.register_node_view(blueprint)
