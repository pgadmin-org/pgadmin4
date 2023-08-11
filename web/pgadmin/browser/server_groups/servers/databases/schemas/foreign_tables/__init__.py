##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements the Foreign Table Module."""

import sys
import traceback
from functools import wraps

import json
from flask import render_template, make_response, request, jsonify, \
    current_app
from flask_babel import gettext

from pgadmin.browser.server_groups.servers import databases
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    SchemaChildModule, DataTypeReader
from pgadmin.browser.server_groups.servers.databases.utils import \
    parse_sec_labels_from_db
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.utils.driver import get_driver
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare


class ForeignTableModule(SchemaChildModule):
    """
    class ForeignTableModule(CollectionNodeModule):

        This class represents The Foreign Table Module.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Initialize the Foreign Table Module.

    * get_nodes(gid, sid, did, scid)
      - Generate the Foreign Table collection node.

    * node_inode():
      - Override this property to make the Foreign Table node as leaf node.

    * script_load()
      - Load the module script for Foreign Table, when schema node is
        initialized.
    """
    _NODE_TYPE = 'foreign_table'
    _COLLECTION_LABEL = gettext("Foreign Tables")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the Foreign Table collection node.
        """
        if self.has_nodes(
            sid, did, scid,
                base_template_path=ForeignTableView.BASE_TEMPLATE_PATH):
            yield self.generate_browser_collection_node(scid)

    @property
    def script_load(self):
        """
        Load the module script for foreign table, when the
        schema node is initialized.
        """
        return databases.DatabaseModule.node_type

    def register(self, app, options):
        from pgadmin.browser.server_groups.servers.databases.schemas.\
            tables.triggers import blueprint as module
        self.submodules.append(module)
        from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
            constraints import blueprint as module
        self.submodules.append(module)
        super().register(app, options)


blueprint = ForeignTableModule(__name__)


class ForeignTableView(PGChildNodeView, DataTypeReader,
                       SchemaDiffObjectCompare):
    """
    class ForeignTableView(PGChildNodeView)

    This class inherits PGChildNodeView to get the different routes for
    the module.

    The class is responsible to Create, Read, Update and Delete operations for
    the Foreign Table.

    Methods:
    -------
    * validate_request(f):
      - Works as a decorator.
        Validating request on the request of create, update and modified SQL.

    * check_precondition(f):
      - Works as a decorator.
      - Checks database connection status.
      - Attach connection object and template path.

    * list(gid, sid, did, scid):
      - List the Foreign Table.

    * nodes(gid, sid, did, scid):
      - Returns all the Foreign Table to generate Nodes in the browser.

    * properties(gid, sid, did, scid, foid):
      - Returns the Foreign Table properties.

    * get_collations(gid, sid, did, scid, foid=None):
      - Returns Collations.

    * get_types(gid, sid, did, scid, foid=None):
      - Returns Data Types.

    * get_foreign_servers(gid, sid, did, scid, foid=None):
      - Returns the Foreign Servers.

    * get_tables(gid, sid, did, scid, foid=None):
      - Returns the Foreign Tables as well as Plain Tables.

    * get_columns(gid, sid, did, scid, foid=None):
      - Returns the Table Columns.

    * create(gid, sid, did, scid):
      - Creates a new Foreign Table object.

    * update(gid, sid, did, scid, foid):
      - Updates the Foreign Table object.

    * delete(gid, sid, did, scid, foid):
      - Drops the Foreign Table object.

    * sql(gid, sid, did, scid, foid):
      - Returns the SQL for the Foreign Table object.

    * msql(gid, sid, did, scid, foid=None):
      - Returns the modified SQL.

    * get_sql(gid, sid, data, scid, foid=None):
      - Generates the SQL statements to create/update the Foreign Table object.

    * dependents(gid, sid, did, scid, foid):
      - Returns the dependents for the Foreign Table object.

    * dependencies(gid, sid, did, scid, foid):
      - Returns the dependencies for the Foreign Table object.

    * select_sql(gid, sid, did, scid, foid):
      - Returns sql for Script

    * insert_sql(gid, sid, did, scid, foid):
      - Returns sql for Script

    * update_sql(gid, sid, did, scid, foid):
      - Returns sql for Script

    * delete_sql(gid, sid, did, scid, foid):
      - Returns sql for Script

    * compare(**kwargs):
      - This function will compare the foreign table nodes from two different
        schemas.
    """

    node_type = blueprint.node_type
    node_label = "Foreign Table"
    BASE_TEMPLATE_PATH = 'foreign_tables/sql/#{0}#'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'foid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'get_collations': [
            {'get': 'get_collations'},
            {'get': 'get_collations'}
        ],
        'get_types': [{'get': 'types'}, {'get': 'types'}],
        'get_foreign_servers': [{'get': 'get_foreign_servers'},
                                {'get': 'get_foreign_servers'}],
        'get_tables': [{'get': 'get_tables'}, {'get': 'get_tables'}],
        'get_columns': [{'get': 'get_columns'}, {'get': 'get_columns'}],
        'select_sql': [{'get': 'select_sql'}],
        'insert_sql': [{'get': 'insert_sql'}],
        'update_sql': [{'get': 'update_sql'}],
        'delete_sql': [{'get': 'delete_sql'}],
        'compare': [{'get': 'compare'}, {'get': 'compare'}]
    })

    keys_to_ignore = ['oid', 'basensp', 'oid-2', 'attnum', 'strftoptions']

    def validate_request(f):
        """
        Works as a decorator.
        Validating request on the request of create, update and modified SQL.

        Required Args:
                    name: Name of the Foreign Table
                    ftsrvname: Foreign Server Name

        Above both the arguments will not be validated in the update action.
        """

        @wraps(f)
        def wrap(self, **kwargs):

            if request.data:
                req = json.loads(request.data)
            else:
                req = request.args or request.form

            invalid, arg = self._check_valid_foid_input(kwargs, req)

            if invalid:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )

            try:
                if request.method == 'GET':
                    list_params = ['constraints', 'columns', 'ftoptions',
                                   'seclabels', 'inherits', 'acl']
                else:
                    list_params = ['inherits']

                data = self._validate_req(req, list_params)

            except Exception as e:
                return internal_server_error(errormsg=str(e))

            self.request = data
            return f(self, **kwargs)

        return wrap

    @staticmethod
    def _check_valid_foid_input(kwargs, req):

        """
        check for valid Foreign Table id
        :param kwargs: user input
        :param req: request object
        """

        if 'foid' not in kwargs:
            required_args = [
                'name',
                'ftsrvname'
            ]

            for arg in required_args:
                if arg not in req or req[arg] == '':
                    return True, arg
        return False, ''

    def _validate_req(self, req, list_params):

        """
        Validate & convert the string to desired output format
        :param req: request data
        :param list_params: prepared list of inherit, constraints, etc.
        :return: data
        """

        data = {}

        try:
            for key in req:
                if (
                    key in list_params and req[key] != '' and
                    req[key] is not None
                ):
                    # Coverts string into python list as expected.
                    data[key] = []
                    self._convert_string_to_list(req, data, key)

                elif key == 'typnotnull':
                    if req[key] == 'true' or req[key] is True:
                        data[key] = True
                    elif req[key] == 'false' or req[key] is False:
                        data[key] = False
                    else:
                        data[key] = ''
                else:
                    data[key] = req[key]

        except Exception as e:
            current_app.logger.exception(e)
            raise e

        return data

    def _convert_string_to_list(self, req, data, key):

        """
        Convert the string with utf-8 base to list
        :param req: request data
        :param data: output
        :param key: index for data
        """

        if not isinstance(req[key], list) and req[key]:
            data[key] = json.loads(req[key])
        elif req[key]:
            data[key] = req[key]

        if key == 'inherits':
            # Convert Table ids from unicode/string to int
            # and make tuple for 'IN' query.
            inherits = tuple([int(x) for x in data[key]])

            if len(inherits) == 1:
                # Python tupple has , after the first param
                # in case of single parameter.
                # So, we need to make it tuple explicitly.
                inherits = "(" + str(inherits[0]) + ")"
            if inherits:
                # Fetch Table Names from their respective Ids,
                # as we need Table names to generate the SQL.
                SQL = render_template(
                    "/".join([self.template_path,
                              self._GET_TABLES_SQL]),
                    attrelid=inherits)
                status, res = self.conn.execute_dict(SQL)

                if not status:
                    return internal_server_error(errormsg=res)

                if 'inherits' in res['rows'][0]:
                    data[key] = res['rows'][0]['inherits']
                else:
                    data[key] = []

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
            self.datistemplate = \
                self.manager.db_info[kwargs['did']]['datistemplate'] \
                if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else False

            # Set template path for sql scripts depending
            # on the server version.
            self.template_path = \
                self.BASE_TEMPLATE_PATH.format(self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        List all the Foreign Tables.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
        """
        SQL = render_template("/".join([self.template_path, self._NODE_SQL]),
                              scid=scid)
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
        Returns the Foreign Tables to generate the Nodes.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
        """

        res = []
        SQL = render_template("/".join([self.template_path,
                                        self._NODE_SQL]), scid=scid)
        status, rset = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-foreign_table",
                    description=row['description']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, foid):
        """
        Returns the Foreign Tables to generate the Nodes.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """

        SQL = render_template("/".join([self.template_path,
                                        self._NODE_SQL]), foid=foid)
        status, rset = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-foreign_table"
                ),
                status=200
            )

        return gone(self.not_found_error_msg())

    @check_precondition
    def properties(self, gid, sid, did, scid, foid):
        """
        Returns the Foreign Table properties.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        status, data = self._fetch_properties(gid, sid, did, scid, foid)
        if not status:
            return data
        if not data:
            return gone(self.not_found_error_msg())

        return ajax_response(
            response=data,
            status=200
        )

    @check_precondition
    def get_collations(self, gid, sid, did, scid, foid=None):
        """
        Returns the Collations.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """

        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_collations.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['copy_collation'],
                     'value': row['copy_collation']}
                )

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def types(self, gid, sid, did, scid, foid=None):
        """
        Returns the Data Types.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """

        condition = render_template("/".join(
            [self.template_path, 'types_condition.sql']),
            server_type=self.manager.server_type,
            show_sys_objects=self.blueprint.show_system_objects)

        # Get Types
        status, types = self.get_types(self.conn, condition)

        if not status:
            return internal_server_error(errormsg=types)

        return make_json_response(
            data=types,
            status=200
        )

    @check_precondition
    def get_foreign_servers(self, gid, sid, did, scid, foid=None):
        """
        Returns the Foreign Servers.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_foreign_servers.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['srvname'], 'value': row['srvname']}
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_tables(self, gid, sid, did, scid, foid=None):
        """
        Returns the Foreign Tables as well as Plain Tables.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        res = []
        try:
            SQL = render_template("/".join(
                [self.template_path, self._GET_TABLES_SQL]),
                foid=foid, server_type=self.manager.server_type,
                show_sys_objects=self.blueprint.show_system_objects)
            status, rset = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                data=rset['rows'],
                status=200
            )

        except Exception:
            exc_type, exc_value, exc_traceback = sys.exc_info()
            return internal_server_error(errormsg=str(exc_value))

    @check_precondition
    def get_columns(self, gid, sid, did, scid, foid=None):
        """
        Returns the Table Columns.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
            attrelid: Table oid

        Returns:
              JSON Array with below parameters.
              attname: Column Name
              datatype: Column Data Type
              inherited_from: Parent Table from which the related column
                              is inheritted.
        """
        res = []
        data = request.args if request.args else None
        try:
            if data and 'attrelid' in data:
                SQL = render_template("/".join([self.template_path,
                                                'get_table_columns.sql']),
                                      attrelid=data['attrelid'])
                status, res = self.conn.execute_dict(SQL)

                if not status:
                    return internal_server_error(errormsg=res)
                return make_json_response(
                    data=res['rows'],
                    status=200
                )
        except Exception:
            exc_type, exc_value, exc_traceback = sys.exc_info()
            return internal_server_error(errormsg=str(exc_value))

    @check_precondition
    @validate_request
    def create(self, gid, sid, did, scid):
        """
        Creates a new Foreign Table object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
            name: Foreign Table Name
            basensp: Schema Name
            ftsrvname: Foreign Server Name

        Returns:
            Foreign Table object in json format.
        """
        try:
            # Get SQL to create Foreign Table
            SQL, name = self.get_sql(gid=gid, sid=sid, did=did, scid=scid,
                                     data=self.request)
            # Most probably this is due to error
            if not isinstance(SQL, str):
                return SQL

            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Need oid to add object in the tree at browser.
            basensp = self.request['basensp'] if ('basensp' in self.request) \
                else None
            SQL = render_template("/".join([self.template_path,
                                            self._OID_SQL]),
                                  basensp=basensp,
                                  name=self.request['name'],
                                  conn=self.conn)
            status, res = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            foid = res['rows'][0]['oid']
            scid = res['rows'][0]['scid']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    foid,
                    scid,
                    self.request['name'],
                    icon="icon-foreign_table"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, foid=None, only_sql=False):
        """
        Drops the Foreign Table.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
            only_sql: Return only sql if True
        """
        if foid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [foid]}

        cascade = self._check_cascade_operation()

        try:
            for foid in data['ids']:
                # Fetch Name and Schema Name to delete the foreign table.
                SQL = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]), scid=scid,
                                      foid=foid)
                status, res = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=res)
                elif not res['rows']:
                    return make_json_response(
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=self.not_found_error_msg()
                    )

                name = res['rows'][0]['name']
                basensp = res['rows'][0]['basensp']

                SQL = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      name=name,
                                      basensp=basensp,
                                      cascade=cascade)

                # Used for schema diff tool
                if only_sql:
                    return SQL

                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Foreign Table dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    @validate_request
    def update(self, gid, sid, did, scid, foid):
        """
        Updates the Foreign Table.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """

        try:
            SQL, name = self.get_sql(gid=gid, sid=sid, did=did, scid=scid,
                                     data=self.request, foid=foid)
            # Most probably this is due to error
            if not isinstance(SQL, str):
                return SQL

            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            SQL = render_template("/".join([self.template_path,
                                            self._OID_SQL]),
                                  foid=foid,
                                  conn=self.conn)
            status, res = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            scid = res['rows'][0]['scid']

            other_node_info = {}
            if 'description' in self.request:
                other_node_info['description'] = self.request['description']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    foid,
                    scid,
                    name,
                    icon="icon-%s" % self.node_type,
                    **other_node_info
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def sql(self, gid, sid, did, scid, foid=None, **kwargs):
        """
        Returns the SQL for the Foreign Table object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
            json_resp: True then return json response
        """
        json_resp = kwargs.get('json_resp', True)
        target_schema = kwargs.get('target_schema', None)

        status, data = self._fetch_properties(gid, sid, did, scid, foid,
                                              inherits=True)
        if not status:
            return data
        if not data:
            return gone(self.not_found_error_msg())

        col_data = []
        for c in data['columns']:
            if ('inheritedfrom' not in c) or (c['inheritedfrom'] is None):
                col_data.append(c)

        data['columns'] = col_data
        if target_schema:
            data['basensp'] = target_schema

        # Parse Privileges
        if 'relacl' in data:
            data['relacl'] = parse_priv_to_db(data['relacl'],
                                              ["a", "r", "w", "x"])

        SQL = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=data, is_sql=True,
                              add_not_exists_clause=True,
                              conn=self.conn
                              )

        if not json_resp:
            return SQL.strip('\n')

        sql_header = """-- FOREIGN TABLE: {0}.{1}\n\n""".format(
            data['basensp'], data['name'])

        sql_header += """-- DROP FOREIGN TABLE IF EXISTS {0};

""".format(self.qtIdent(self.conn, data['basensp'], data['name']))

        SQL = sql_header + SQL

        return ajax_response(response=SQL.strip('\n'))

    @check_precondition
    @validate_request
    def msql(self, gid, sid, did, scid, foid=None):
        """
        Returns the modified SQL.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
            name: Foreign Table Name
            ftsrvname: Foreign Server Name

        Returns:
            SQL statements to create/update the Foreign Table.
        """
        data = {}
        for k, v in self.request.items():
            try:
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('description',):
                    data[k] = v
                else:
                    data[k] = json.loads(v)
            except ValueError:
                data[k] = v
            except TypeError:
                data[k] = v
        try:
            SQL, name = self.get_sql(gid=gid, sid=sid, did=did, scid=scid,
                                     data=data, foid=foid)
            # Most probably this is due to error
            if not isinstance(SQL, str):
                return SQL

            if SQL == '':
                SQL = "--modified SQL"

            return make_json_response(
                data=SQL,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @staticmethod
    def _parse_privileges(data):
        """
        Parser privilege data as per type.
        :param data: Data.
        :return:
        """
        if 'relacl' in data and 'added' in data['relacl']:
            data['relacl']['added'] = parse_priv_to_db(
                data['relacl']['added'], ["a", "r", "w", "x"])
        if 'relacl' in data and 'changed' in data['relacl']:
            data['relacl']['changed'] = parse_priv_to_db(
                data['relacl']['changed'], ["a", "r", "w", "x"])
        if 'relacl' in data and 'deleted' in data['relacl']:
            data['relacl']['deleted'] = parse_priv_to_db(
                data['relacl']['deleted'], ["a", "r", "w", "x"])

    @staticmethod
    def _check_old_col_ops(old_col_frmt_options, option, col):
        """
        check old column options.
        :param old_col_frmt_options: old column option data.
        :param option: option data.
        :param col: column data.
        :return:
        """
        if (
            option['option'] in old_col_frmt_options and
            option['value'] != old_col_frmt_options[option['option']]
        ):
            col['coloptions_updated']['changed'].append(option)
        elif option['option'] not in old_col_frmt_options:
            col['coloptions_updated']['added'].append(option)
        if option['option'] in old_col_frmt_options:
            del old_col_frmt_options[option['option']]

    @staticmethod
    def _parse_column_options(data):
        """
        Parse columns data.
        :param data: Data.
        :return:
        """
        for c in data['columns']['changed']:
            old_col_options = c['attfdwoptions'] = []
            if 'attfdwoptions' in c and c['attfdwoptions']:
                old_col_options = c['attfdwoptions']

            old_col_frmt_options = {}

            for o in old_col_options:
                col_opt = o.split("=")
                old_col_frmt_options[col_opt[0]] = col_opt[1]

            c['coloptions_updated'] = {'added': [],
                                       'changed': [],
                                       'deleted': []}

            if 'coloptions' in c and len(c['coloptions']) > 0:
                for o in c['coloptions']:
                    ForeignTableView._check_old_col_ops(old_col_frmt_options,
                                                        o, c)

            for o in old_col_frmt_options:
                c['coloptions_updated']['deleted'].append(
                    {'option': o})

    def _format_columns_data(self, data, old_data):
        """
        Format columns.
        :param data: data.
        :param old_data: old data for compare.
        :return:
        """
        col_data = {}
        # Prepare dict of columns with key = column's attnum
        # Will use this in the update template when any column is
        # changed, to identify the columns.
        for c in old_data['columns']:
            col_data[c['attnum']] = c

        old_data['columns'] = col_data

        if 'columns' in data and 'added' in data['columns']:
            data['columns']['added'] = self._format_columns(
                data['columns']['added'])

        if 'columns' in data and 'changed' in data['columns']:
            data['columns']['changed'] = self._format_columns(
                data['columns']['changed'])

            # Parse Column Options
            ForeignTableView._parse_column_options(data)

    def get_sql(self, **kwargs):
        """
        Generates the SQL statements to create/update the Foreign Table.

        Args:
            kwargs: Server Group Id
        """
        gid = kwargs.get('gid')
        sid = kwargs.get('sid')
        did = kwargs.get('did')
        scid = kwargs.get('scid')
        data = kwargs.get('data')
        foid = kwargs.get('foid', None)
        is_schema_diff = kwargs.get('is_schema_diff', False)

        if foid is not None:
            status, old_data = self._fetch_properties(gid, sid, did, scid,
                                                      foid, inherits=True)
            if not status:
                return old_data
            elif not old_data:
                return gone(self.not_found_error_msg())

            if is_schema_diff:
                data['is_schema_diff'] = True
                old_data['columns_for_schema_diff'] = old_data['columns']

            self._format_columns_data(data, old_data)

            # Parse Privileges
            ForeignTableView._parse_privileges(data)

            # If ftsrvname is changed while comparing two schemas
            # then we need to drop foreign table and recreate it
            if is_schema_diff and 'ftsrvname' in data:
                # Modify the data required to recreate the foreign table.
                self.modify_data_for_schema_diff(data, old_data)

                sql = render_template(
                    "/".join([self.template_path,
                              'foreign_table_schema_diff.sql']),
                    data=data, o_data=old_data, conn=self.conn)
            else:
                sql = render_template(
                    "/".join([self.template_path, self._UPDATE_SQL]),
                    data=data, o_data=old_data, conn=self.conn
                )
            return sql, data['name'] if 'name' in data else old_data['name']
        else:
            data['columns'] = self._format_columns(data['columns'])

            # Parse Privileges
            if 'relacl' in data:
                data['relacl'] = parse_priv_to_db(data['relacl'],
                                                  ["a", "r", "w", "x"])

            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]), data=data,
                                  conn=self.conn)
            return sql, data['name']

    @check_precondition
    def dependents(self, gid, sid, did, scid, foid):
        """
        This function get the dependents and return ajax response
        for the Foreign Table object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        dependents_result = self.get_dependents(self.conn, foid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, foid):
        """
        This function get the dependencies and return ajax response
        for the  Foreign Table object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
        """
        dependencies_result = self.get_dependencies(self.conn, foid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    def _format_columns(self, columns):
        """
        Format Table Columns.
        """
        cols = []
        for c in columns:
            if len(c) > 0:
                if '[]' in c['datatype']:
                    c['datatype'] = c['datatype'].replace('[]', '')
                    c['isArrayType'] = True
                else:
                    c['isArrayType'] = False
                cols.append(c)

        return cols

    def _fetch_properties(self, gid, sid, did, scid, foid, inherits=False, ):
        """
        Returns the Foreign Table properties which will be used in
        properties, sql and get_sql functions.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
            inherits: If True then inherited table will be fetched from
                      database

        Returns:

        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, foid=foid)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return True, False

        data = res['rows'][0]
        data['is_sys_obj'] = (
            data['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
            self.datistemplate)

        if self.manager.version >= 90200:
            # Fetch privileges
            sql = render_template("/".join([self.template_path,
                                            self._ACL_SQL]),
                                  foid=foid)
            status, aclres = self.conn.execute_dict(sql)
            if not status:
                return False, internal_server_error(errormsg=aclres)

            # Get Formatted Privileges
            data.update(self._format_proacl_from_db(aclres['rows']))

        # Get formatted Security Labels
        if 'seclabels' in data:
            data.update(parse_sec_labels_from_db(data['seclabels']))

        # Get formatted Options
        if 'ftoptions' in data:
            data.update({'strftoptions': data['ftoptions']})
            data.update(self._parse_variables_from_db(data['ftoptions']))

        sql = render_template("/".join([self.template_path,
                                        self._GET_CONSTRAINTS_SQL]), foid=foid)
        status, cons = self.conn.execute_dict(sql)
        if not status:
            return False, internal_server_error(errormsg=cons)

        if cons and 'rows' in cons:
            data['constraints'] = cons['rows']

        sql = render_template("/".join([self.template_path,
                                        self._GET_COLUMNS_SQL]), foid=foid)
        status, cols = self.conn.execute_dict(sql)
        if not status:
            return False, internal_server_error(errormsg=cols)

        self._get_datatype_precision(cols)

        if cols and 'rows' in cols:
            data['columns'] = cols['rows']

        # Get Inherited table names from their OID
        is_error, errmsg = self._get_inherited_table_name(data, inherits)
        if is_error:
            return False, internal_server_error(errormsg=errmsg)

        return True, data

    def _get_datatype_precision(self, cols):
        """
        The Length and the precision of the Datatype should be separated.
        The Format we getting from database is: numeric(1,1)
        So, we need to separate it as Length: 1, Precision: 1
        :param cols: list of columns.
        """
        for c in cols['rows']:
            if c['fulltype'] != '' and c['fulltype'].find("(") > 0:
                substr = self.extract_type_length_precision(c)
                typlen = substr.split(",")
                if len(typlen) > 1:
                    c['typlen'] = self.convert_typlen_to_int(typlen)
                    c['precision'] = self.convert_precision_to_int(typlen)
                else:
                    c['typlen'] = self.convert_typlen_to_int(typlen)
                    c['precision'] = None

            # Get formatted Column Options
            if 'attfdwoptions' in c and c['attfdwoptions'] != '':
                att_opt = self._parse_variables_from_db(c['attfdwoptions'])
                c['coloptions'] = att_opt['ftoptions']

    def _get_inherited_table_name(self, data, inherits):
        """
        Get inherited table name.
        :param data: Data.
        :param inherits: flag which is used If True then inherited table
        will be fetched from database.
        """
        if inherits and 'inherits' in data and data['inherits']:
            inherits = tuple([int(x) for x in data['inherits']])
            if len(inherits) == 1:
                inherits = "(" + str(inherits[0]) + ")"

            sql = render_template("/".join([self.template_path,
                                            self._GET_TABLES_SQL]),
                                  attrelid=inherits)
            status, res = self.conn.execute_dict(sql)

            if not status:
                return True, res

            if 'inherits' in res['rows'][0]:
                data['inherits'] = res['rows'][0]['inherits']

        return False, ''

    @staticmethod
    def convert_precision_to_int(typlen):
        return int(typlen[1]) if typlen[1].isdigit() else \
            typlen[1]

    @staticmethod
    def convert_typlen_to_int(typlen):
        return int(typlen[0]) if typlen[0].isdigit() else \
            typlen[0]

    def extract_type_length_precision(self, column):
        full_type = column['fulltype']
        return full_type[self.type_start_position(column):
                         self.type_end_position(column)]

    @staticmethod
    def type_end_position(column):
        return column['fulltype'].find(")")

    @staticmethod
    def type_start_position(column):
        return column['fulltype'].find("(") + 1

    def _format_proacl_from_db(self, proacl):
        """
        Returns privileges.
        Args:
            proacl: Privileges Dict
        """
        privileges = []
        for row in proacl:
            priv = parse_priv_from_db(row)
            privileges.append(priv)

        return {"relacl": privileges}

    def _parse_variables_from_db(self, db_variables):
        """
        Function to format the output for variables.

        Args:
            db_variables: Variable object

                Expected Object Format:
                    ['option1=value1', ..]
                where:
                    user_name and database are optional
        Returns:
            Variable Object in below format:
                {
                'variables': [
                    {'name': 'var_name', 'value': 'var_value',
                    'user_name': 'user_name', 'database': 'database_name'},
                    ...]
                }
                where:
                    user_name and database are optional
        """
        variables_lst = []

        if db_variables is not None:
            for row in db_variables:
                # The value may contain equals in string, split on
                # first equals only
                var_name, var_value = row.split("=", 1)

                var_dict = {'option': var_name, 'value': var_value}

                variables_lst.append(var_dict)

        return {"ftoptions": variables_lst}

    @check_precondition
    def select_sql(self, gid, sid, did, scid, foid):
        """
        SELECT script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id

        Returns:
            SELECT Script sql for the object
        """
        status, data = self._fetch_properties(gid, sid, did, scid, foid)
        if not status:
            return data
        if not data:
            return gone(self.not_found_error_msg())

        columns = []
        for c in data['columns']:
            columns.append(self.qtIdent(self.conn, c['attname']))

        if len(columns) > 0:
            columns = ", ".join(columns)
        else:
            columns = '*'

        sql = "SELECT {0}\n\tFROM {1};".format(
            columns,
            self.qtIdent(self.conn, data['basensp'], data['name'])
        )

        return ajax_response(response=sql)

    @check_precondition
    def insert_sql(self, gid, sid, did, scid, foid):
        """
        INSERT script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id

        Returns:
            INSERT Script sql for the object
        """
        status, data = self._fetch_properties(gid, sid, did, scid, foid)
        if not status:
            return data
        if not data:
            return gone(self.not_found_error_msg())

        columns = []
        values = []

        # Now we have all list of columns which we need
        if 'columns' in data:
            for c in data['columns']:
                columns.append(self.qtIdent(self.conn, c['attname']))
                values.append('?')

        if len(columns) > 0:
            columns = ", ".join(columns)
            values = ", ".join(values)
            sql = "INSERT INTO {0}(\n\t{1})\n\tVALUES ({2});".format(
                self.qtIdent(self.conn, data['basensp'], data['name']),
                columns, values
            )
        else:
            sql = gettext('-- Please create column(s) first...')

        return ajax_response(response=sql)

    @check_precondition
    def update_sql(self, gid, sid, did, scid, foid):
        """
        UPDATE script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id

        Returns:
            UPDATE Script sql for the object
        """
        status, data = self._fetch_properties(gid, sid, did, scid, foid)
        if not status:
            return data
        if not data:
            return gone(self.not_found_error_msg())

        columns = []

        # Now we have all list of columns which we need
        if 'columns' in data:
            for c in data['columns']:
                columns.append(self.qtIdent(self.conn, c['attname']))

        if len(columns) > 0:
            if len(columns) == 1:
                columns = columns[0]
                columns += "=?"
            else:
                columns = "=?, ".join(columns)
                columns += "=?"

            sql = "UPDATE {0}\n\tSET {1}\n\tWHERE <condition>;".format(
                self.qtIdent(self.conn, data['basensp'], data['name']),
                columns
            )
        else:
            sql = gettext('-- Please create column(s) first...')

        return ajax_response(response=sql)

    @check_precondition
    def delete_sql(self, gid, sid, did, scid, foid, only_sql=False):
        """
        DELETE script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id
            only_sql: Return only sql if True

        Returns:
            DELETE Script sql for the object
        """
        status, data = self._fetch_properties(gid, sid, did, scid, foid)
        if not status:
            return data
        if not data:
            return gone(self.not_found_error_msg())

        sql = "DELETE FROM {0}\n\tWHERE <condition>;".format(
            self.qtIdent(self.conn, data['basensp'], data['name'])
        )

        # Used for schema diff tool
        if only_sql:
            return sql

        return ajax_response(response=sql)

    @staticmethod
    def _check_const_for_obj_compare(data):
        """
        Check for constraint in fetched objects for compare.
        :param data: Data.
        """
        if 'constraints' in data and data['constraints'] is not None \
                and len(data['constraints']) > 0:
            for item in data['constraints']:
                if 'conoid' in item:
                    item.pop('conoid')

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid):
        """
        This function will fetch the list of all the foreign tables for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()
        SQL = render_template("/".join([self.template_path,
                                        self._NODE_SQL]), scid=scid,
                              schema_diff=True)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in rset['rows']:
            status, data = self._fetch_properties(0, sid, did, scid,
                                                  row['oid'])
            if status:
                ForeignTableView._check_const_for_obj_compare(data)
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
        scid = kwargs.get('scid')
        oid = kwargs.get('oid')
        data = kwargs.get('data', None)
        drop_sql = kwargs.get('drop_sql', False)
        target_schema = kwargs.get('target_schema', None)

        if data:
            sql, name = self.get_sql(gid=gid, sid=sid, did=did, scid=scid,
                                     data=data, foid=oid,
                                     is_schema_diff=True)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, foid=oid, only_sql=True)
            elif target_schema:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, foid=oid,
                               target_schema=target_schema, json_resp=False)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, foid=oid,
                               json_resp=False)
        return sql

    @staticmethod
    def _modify_column_data(data, tmp_columns):
        """
        Modifies data for column.
        :param data: Data for columns.
        :param tmp_columns: tmp_columns list.
        """
        if 'added' in data['columns']:
            for item in data['columns']['added']:
                tmp_columns.append(item)
        if 'changed' in data['columns']:
            for item in data['columns']['changed']:
                tmp_columns.append(item)
        if 'deleted' in data['columns']:
            for item in data['columns']['deleted']:
                tmp_columns.remove(item)

    @staticmethod
    def _modify_constraints_data(data):
        """
        Modifies data for constraints.
        :param data: Data for constraints.
        :return: tmp_constraints list.
        """
        tmp_constraints = []
        if 'added' in data['constraints']:
            for item in data['constraints']['added']:
                tmp_constraints.append(item)
        if 'changed' in data['constraints']:
            for item in data['constraints']['changed']:
                tmp_constraints.append(item)

        return tmp_constraints

    @staticmethod
    def _modify_options_data(data, tmp_ftoptions):
        """
        Modifies data for options.
        :param data: Data for options.
        :param tmp_ftoptions: tmp_ftoptions list.
        """
        if 'added' in data['ftoptions']:
            for item in data['ftoptions']['added']:
                tmp_ftoptions.append(item)
        if 'changed' in data['ftoptions']:
            for item in data['ftoptions']['changed']:
                tmp_ftoptions.append(item)
        if 'deleted' in data['ftoptions']:
            for item in data['ftoptions']['deleted']:
                tmp_ftoptions.remove(item)

    def modify_data_for_schema_diff(self, data, old_data):
        """
        This function modifies the data for columns, constraints, options
        etc...
        :param data:
        :return:
        """
        tmp_columns = []
        if 'columns_for_schema_diff' in old_data:
            tmp_columns = old_data['columns_for_schema_diff']

        if 'columns' in data:
            ForeignTableView._modify_column_data(data, tmp_columns)

        data['columns'] = tmp_columns

        if 'constraints' in data:
            tmp_constraints = ForeignTableView._modify_constraints_data(data)
            data['constraints'] = tmp_constraints

        tmp_ftoptions = []
        if 'ftoptions' in old_data:
            tmp_ftoptions = old_data['ftoptions']
        if 'ftoptions' in data:
            ForeignTableView._modify_options_data(data, tmp_ftoptions)

        data['ftoptions'] = tmp_ftoptions


SchemaDiffRegistry(blueprint.node_type, ForeignTableView)
ForeignTableView.register_node_view(blueprint)
