##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Edb Functions/Edb Procedures Node."""

from functools import wraps

from flask import render_template, make_response
from flask_babel import gettext

from pgadmin.browser.server_groups.servers.databases.schemas import packages
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    DataTypeReader
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error, gone
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver


class EdbVarModule(CollectionNodeModule):
    """
    class EdbvarModule(CollectionNodeModule):

        This class represents The Functions Module.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Initialize the Functions Module.

    * get_nodes(gid, sid, did, scid)
      - Generate the Functions collection node.

    * node_inode():
      - Returns Functions node as leaf node.

    * script_load()
      - Load the module script for Functions, when schema node is
        initialized.

    * csssnippets()
      - Returns a snippet of css.
    """

    _NODE_TYPE = 'edbvar'
    _COLLECTION_LABEL = gettext("Variables")

    def __init__(self, *args, **kwargs):
        """
        Initialize the Variable Module.
        Args:
            *args:
            **kwargs:
        """
        super().__init__(*args, **kwargs)

        self.min_ver = 90100
        self.max_ver = None
        self.server_type = ['ppas']

    def get_nodes(self, gid, sid, did, scid, pkgid):
        """
        Generate Functions collection node.
        """
        yield self.generate_browser_collection_node(pkgid)

    @property
    def script_load(self):
        """
        Load the module script for Functions, when the
        package node is initialized.
        """
        return packages.PackageModule.node_type

    @property
    def node_inode(self):
        """
        Make the node as leaf node.
        Returns:
            False as this node doesn't have child nodes.
        """
        return False

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = EdbVarModule(__name__)


class EdbVarView(PGChildNodeView, DataTypeReader):
    """
    class EdbFuncView(PGChildNodeView, DataTypeReader)

    This class inherits PGChildNodeView and DataTypeReader to get the different
    routes for
    the module.

    The class is responsible to Create, Read, Update and Delete operations for
    the Functions.

    Methods:
    -------
    * validate_request(f):
      - Works as a decorator.
        Validating request on the request of create, update and modified SQL.

    * check_precondition(f):
      - Works as a decorator.
      - Checks database connection status.
      - Attach connection object and template path.

    * list(gid, sid, did, scid, pkgid):
      - List the Functions.

    * nodes(gid, sid, did, scid, pkgid):
      - Returns all the Functions to generate Nodes in the browser.

    * properties(gid, sid, did, scid, pkgid, varid):
      - Returns the Functions properties.

    * sql(gid, sid, did, scid, pkgid, varid):
      - Returns the SQL for the Functions object.

    * compare(**kwargs):
      - This function will compare the nodes from two different schemas.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'},
        {'type': 'int', 'id': 'pkgid'}
    ]
    ids = [
        {'type': 'int', 'id': 'varid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties'},
            {'get': 'list'}
        ],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'compare': [{'get': 'compare'}, {'get': 'compare'}]
    })

    def check_precondition(f):
        """
        Works as a decorator.
        Checks the database connection status.
        Attaches the connection object and template path to the class object.
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            self = args[0]
            driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = driver.connection_manager(kwargs['sid'])

            # Get database connection
            self.conn = self.manager.connection(did=kwargs['did'])

            self.qtIdent = driver.qtIdent
            self.qtLiteral = driver.qtLiteral

            if not self.conn.connected():
                return precondition_required(
                    gettext(
                        "Connection to the server has been lost."
                    )
                )

            self.sql_template_path = "/edbvars/ppas"

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid, pkgid):
        """
        List all the Functions.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            pkgid: Package Id
        """

        SQL = render_template("/".join([self.sql_template_path,
                                        self._NODE_SQL]),
                              pkgid=pkgid,
                              conn=self.conn)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, pkgid):
        """
        Returns all the Functions to generate the Nodes.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            pkgid: Package Id
        """

        res = []
        SQL = render_template(
            "/".join([self.sql_template_path, self._NODE_SQL]),
            pkgid=pkgid, conn=self.conn
        )
        status, rset = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    pkgid,
                    row['name'],
                    icon="icon-" + self.node_type
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, pkgid, varid=None):
        """
        Returns the Function properties.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            pkgid: Package Id
            varid: Variable Id
        """
        resp_data = {}
        SQL = render_template("/".join([self.sql_template_path,
                                        self._PROPERTIES_SQL]),
                              pkgid=pkgid, varid=varid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                errormsg=gettext("Could not find the variables")
            )

        resp_data = res['rows'][0]

        return ajax_response(
            response=resp_data,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, did, scid, pkgid, varid=None):
        """
        Returns the SQL for the Function object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            pkgid: Package Id
            varid: variable Id
        """
        SQL = render_template(
            "/".join([self.sql_template_path, self._PROPERTIES_SQL]),
            varid=varid,
            pkgid=pkgid)

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                errormsg=gettext("Could not find the variables")
            )

        var = res['rows'][0]

        sql = "-- Package Variable: {}".format(var['name'])
        sql += "\n\n"
        sql += "{} {};".format(var['name'], var['datatype'])

        return ajax_response(response=sql)


EdbVarView.register_node_view(blueprint)
