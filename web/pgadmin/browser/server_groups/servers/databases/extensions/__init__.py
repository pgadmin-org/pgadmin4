##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Extension Node """

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as databases
from flask import render_template, make_response, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error
from pgadmin.utils.driver import get_driver
from pgadmin.utils.ajax import gone

from config import PG_DEFAULT_DRIVER

# As unicode type is not available in python3
# If we check a variable is "isinstance(variable, str)
# it breaks in python 3 as variable type is not string its unicode.
# We assign basestring as str type if it is python3, unicode
# if it is python2.

try:
    unicode = unicode
except NameError:
    # 'unicode' is undefined, must be Python 3
    str = str
    unicode = str
    bytes = bytes
    basestring = (str, bytes)
else:
    # 'unicode' exists, must be Python 2
    str = str
    unicode = unicode
    bytes = str
    basestring = basestring


class ExtensionModule(CollectionNodeModule):
    """
    class ExtensionModule(Object):

        A collection Node which inherits CollectionNodeModule
        class and define methods to get child nodes, to load its own
        javascript file.
    """
    NODE_TYPE = "extension"
    COLLECTION_LABEL = gettext("Extensions")

    def __init__(self, *args, **kwargs):
        """
        Initialising the base class
        """
        super(ExtensionModule, self).__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did):
        """
        Generate the collection node
        """
        yield self.generate_browser_collection_node(did)

    @property
    def node_inode(self):
        """
        If a node have child return True otherwise False
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for extension, when any of the database nodes are
        initialized.
        """
        return databases.DatabaseModule.NODE_TYPE


# Create blueprint of extension module
blueprint = ExtensionModule(__name__)


class ExtensionView(PGChildNodeView):
    """
    This is a class for extension nodes which inherits the
    properties and methods from NodeView class and define
    various methods to list, create, update and delete extension.

    Variables:
    ---------
    * node_type - tells which type of node it is
    * parent_ids - id with its type and name of parent nodes
    * ids - id with type and name of extension module being used.
    * operations - function routes mappings defined.
    """
    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'}
    ]
    ids = [
        {'type': 'int', 'id': 'eid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'delete': [{'delete': 'delete'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'avails': [{}, {'get': 'avails'}],
        'schemas': [{}, {'get': 'schemas'}],
        'children': [{'get': 'children'}]
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
            self.manager = get_driver(
                PG_DEFAULT_DRIVER
            ).connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            self.template_path = 'extensions/sql'

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did):
        """
        Fetches all extensions properties and render into properties tab
        """
        SQL = render_template("/".join([self.template_path, 'properties.sql']))
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did):
        """
        Lists all extensions under the Extensions Collection node
        """
        res = []
        SQL = render_template("/".join([self.template_path, 'properties.sql']))
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['eid'],
                    did,
                    row['name'],
                    'icon-extension'
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, eid):
        """
        This function will fetch the properties of extension
        """
        SQL = render_template("/".join([self.template_path, 'properties.sql']),
                              eid=eid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['eid'],
                    did,
                    row['name'],
                    'icon-extension'
                ),
                status=200
            )

        return gone(gettext("Could not find the specified event trigger."))

    @check_precondition
    def properties(self, gid, sid, did, eid):
        """
        Fetch the properties of a single extension and render in properties tab
        """
        SQL = render_template("/".join(
            [self.template_path, 'properties.sql']), eid=eid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext("Couldnot find the extension information.")
            )

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def create(self, gid, sid, did):
        """
        Create a new extension object
        """
        required_args = [
            'name'
        ]

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter (%s)." % arg
                    )
                )

        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, 'create.sql']),
                data=data
            )
        )

        if not status:
            return internal_server_error(errormsg=res)

        status, rset = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, 'properties.sql']),
                ename=data['name']
            )
        )

        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return jsonify(
                node=self.blueprint.generate_browser_node(
                    row['eid'],
                    did,
                    row['name'],
                    'icon-extension'
                )
            )

    @check_precondition
    def update(self, gid, sid, did, eid):
        """
        This function will update an extension object
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        try:
            SQL, name = self.getSQL(gid, sid, data, did, eid)
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    eid,
                    did,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, eid):
        """
        This function will drop/drop cascade a extension object
        """
        cascade = True if self.cmd == 'delete' else False
        try:
            # check if extension with eid exists
            SQL = render_template("/".join(
                [self.template_path, 'delete.sql']), eid=eid)
            status, name = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=name)

            if name is None:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        'Error: Object not found.'
                    ),
                    info=gettext(
                        'The specified extension could not be found.\n'
                    )
                )

            # drop extension
            SQL = render_template("/".join(
                [self.template_path, 'delete.sql']
            ), name=name, cascade=cascade)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Extension dropped"),
                data={
                    'id': did,
                    'sid': sid,
                    'gid': gid,
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, eid=None):
        """
        This function returns modified SQL
        """
        data = request.args.copy()
        try:
            SQL, name = self.getSQL(gid, sid, data, did, eid)
            SQL = SQL.strip('\n').strip(' ')
            if SQL == '':
                SQL = "--modified SQL"

            return make_json_response(
                data=SQL,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def getSQL(self, gid, sid, data, did, eid=None):
        """
        This function will generate sql from model data
        """
        required_args = [
            'name'
        ]

        if eid is not None:
            SQL = render_template("/".join(
                [self.template_path, 'properties.sql']
            ), eid=eid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    gettext("Couldnot find the extension information.")
                )

            old_data = res['rows'][0]
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]
            SQL = render_template("/".join(
                [self.template_path, 'update.sql']
            ), data=data, o_data=old_data)
            return SQL, data['name'] if 'name' in data else old_data['name']
        else:
            SQL = render_template("/".join(
                [self.template_path, 'create.sql']
            ), data=data)
            return SQL, data['name']

    @check_precondition
    def avails(self, gid, sid, did):
        """
        This function with fetch all the available extensions
        """
        SQL = render_template("/".join([self.template_path, 'extensions.sql']))
        status, rset = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=rset)
        return make_json_response(
            data=rset['rows'],
            status=200
        )

    @check_precondition
    def schemas(self, gid, sid, did):
        """
        This function with fetch all the schemas
        """
        SQL = render_template("/".join([self.template_path, 'schemas.sql']))
        status, rset = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=rset)
        return make_json_response(
            data=rset['rows'],
            status=200
        )

    def module_js(self):
        """
        This property defines whether javascript exists for this node.
        """
        return make_response(
            render_template(
                "extensions/js/extensions.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

    @check_precondition
    def sql(self, gid, sid, did, eid):
        """
        This function will generate sql for the sql panel
        """
        SQL = render_template("/".join(
            [self.template_path, 'properties.sql']
        ), eid=eid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        result = res['rows'][0]

        SQL = render_template("/".join(
            [self.template_path, 'create.sql']
        ),
            data=result,
            conn=self.conn,
            display_comments=True
        )

        return ajax_response(response=SQL)

    @check_precondition
    def dependents(self, gid, sid, did, eid):
        """
        This function gets the dependents and returns an ajax response
        for the extension node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            eid: Extension ID
        """
        dependents_result = self.get_dependents(self.conn, eid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, eid):
        """
        This function gets the dependencies and returns an ajax response
        for the extension node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Extension ID
        """
        dependencies_result = self.get_dependencies(self.conn, eid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )


# Register and add ExtensionView as blueprint
ExtensionView.register_node_view(blueprint)
