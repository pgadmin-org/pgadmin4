##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Extension Node """

import json
from functools import wraps

from pgadmin.browser.server_groups.servers import databases
from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error, gone
from pgadmin.utils.driver import get_driver
from pgadmin.browser.server_groups.servers.databases.extensions.utils \
    import get_extension_details
from config import PG_DEFAULT_DRIVER
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare


class ExtensionModule(CollectionNodeModule):
    """
    class ExtensionModule():

        A collection Node which inherits CollectionNodeModule
        class and define methods to get child nodes, to load its own
        javascript file.
    """
    _NODE_TYPE = "extension"
    _COLLECTION_LABEL = gettext("Extensions")

    def __init__(self, *args, **kwargs):
        """
        Initialising the base class
        """
        super().__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did):
        """
        Generate the collection node
        """
        if self.has_nodes(sid, did,
                          base_template_path=ExtensionView.EXT_TEMPLATE_PATH):
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
        Load the module script for extension, when any of the database nodes
        are initialized.
        """
        return databases.DatabaseModule.node_type

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


# Create blueprint of extension module
blueprint = ExtensionModule(__name__)


class ExtensionView(PGChildNodeView, SchemaDiffObjectCompare):
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
    EXT_TEMPLATE_PATH = 'extensions/sql'
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
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'avails': [{}, {'get': 'avails'}],
        'schemas': [{}, {'get': 'schemas'}],
        'children': [{'get': 'children'}]
    })

    keys_to_ignore = ['oid', 'oid-2', 'owner']

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
            self.template_path = self.EXT_TEMPLATE_PATH

            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                kwargs['did'] in self.manager.db_info and
                'datistemplate' in self.manager.db_info[kwargs['did']]
            ):
                self.datistemplate = self.manager.db_info[
                    kwargs['did']]['datistemplate']

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did):
        """
        Fetches all extensions properties and render into properties tab
        """
        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              conn=self.conn)
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
        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              conn=self.conn)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    'icon-extension',
                    description=row['comment']
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
        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              eid=eid, conn=self.conn)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    'icon-extension'
                ),
                status=200
            )

        return gone(gettext("Could not find the specified extension."))

    @check_precondition
    def properties(self, gid, sid, did, eid):
        """
        Fetch the properties of a single extension and render in properties tab
        """
        status, res = self._fetch_properties(did, eid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, did, eid):
        """
        This function fetch the properties of the extension.
        :param did:
        :param eid:
        :return:
        """
        SQL = render_template("/".join(
            [self.template_path, self._PROPERTIES_SQL]), eid=eid,
            conn=self.conn)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                gettext("Could not find the extension information.")
            )

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
            self.datistemplate)

        return True, res['rows'][0]

    @check_precondition
    def create(self, gid, sid, did):
        """
        Create a new extension object
        """
        required_args = [
            'name'
        ]

        data = request.form if request.form else json.loads(
            request.data
        )

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )

        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data
            )
        )

        if not status:
            return internal_server_error(errormsg=res)

        status, res = get_extension_details(
            self.conn, data['name'],
            "/".join([self.template_path, self._PROPERTIES_SQL]))
        if not status:
            return internal_server_error(errormsg=res)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                res['oid'],
                did,
                res['name'],
                'icon-extension'
            )
        )

    @check_precondition
    def update(self, gid, sid, did, eid):
        """
        This function will update an extension object
        """
        data = request.form if request.form else json.loads(
            request.data
        )

        try:
            SQL, name = self.getSQL(gid, sid, data, did, eid)
            # Most probably this is due to error
            if not isinstance(SQL, str):
                return SQL
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            other_node_info = {}
            if 'comment' in data:
                other_node_info['description'] = data['comment']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    eid,
                    did,
                    name,
                    icon="icon-%s" % self.node_type,
                    **other_node_info
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, eid=None, only_sql=False):
        """
        This function will drop/drop cascade a extension object
        """

        if eid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [eid]}

        cascade = self._check_cascade_operation()

        try:
            for eid in data['ids']:
                # check if extension with eid exists
                SQL = render_template("/".join(
                    [self.template_path, self._DELETE_SQL]), eid=eid)
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
                    [self.template_path, self._DELETE_SQL]
                ), name=name, cascade=cascade)

                # Used for schema diff tool
                if only_sql:
                    return SQL

                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Extension dropped")
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, eid=None):
        """
        This function returns modified SQL
        """
        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v)
            except ValueError:
                data[k] = v

        try:
            SQL, name = self.getSQL(gid, sid, data, did, eid)
            # Most probably this is due to error
            if not isinstance(SQL, str):
                return SQL
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
                [self.template_path, self._PROPERTIES_SQL]
            ), eid=eid, conn=self.conn)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    gettext("Could not find the extension information.")
                )

            old_data = res['rows'][0]
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]
            SQL = render_template("/".join(
                [self.template_path, self._UPDATE_SQL]
            ), data=data, o_data=old_data)
            return SQL, data['name'] if 'name' in data else old_data['name']
        else:
            SQL = render_template("/".join(
                [self.template_path, self._CREATE_SQL]
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

    @check_precondition
    def sql(self, gid, sid, did, eid, json_resp=True):
        """
        This function will generate sql for the sql panel
        """
        SQL = render_template("/".join(
            [self.template_path, self._PROPERTIES_SQL]
        ), eid=eid, conn=self.conn)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the extension on the server.")
            )

        result = res['rows'][0]

        SQL = render_template("/".join(
            [self.template_path, self._CREATE_SQL]
        ),
            data=result,
            conn=self.conn,
            display_comments=True,
            add_not_exists_clause=True
        )

        if not json_resp:
            return SQL

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

    @check_precondition
    def fetch_objects_to_compare(self, sid, did):
        """
        This function will fetch the list of all the extensions for
        specified database id.

        :param sid: Server Id
        :param did: Database Id
        :return:
        """
        res = dict()

        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              conn=self.conn)
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            status, data = self._fetch_properties(did, row['oid'])
            if status:
                res[row['name']] = data

        return res

    def get_sql_from_diff(self, **kwargs):
        """
        This function is used to get the DDL/DML statements.
        :param kwargs
        :return:
        """
        gid = kwargs.get('gid')
        sid = kwargs.get('sid')
        did = kwargs.get('did')
        oid = kwargs.get('oid')
        data = kwargs.get('data', None)
        drop_sql = kwargs.get('drop_sql', False)

        if data:
            sql, name = self.getSQL(gid=gid, sid=sid, did=did, data=data,
                                    eid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  eid=oid, only_sql=True)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, eid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, ExtensionView, 'Database')
# Register and add ExtensionView as blueprint
ExtensionView.register_node_view(blueprint)
