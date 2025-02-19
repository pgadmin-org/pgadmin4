##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Functions/Procedures Node."""

import re
import sys
from functools import wraps

import json
from flask import render_template, request, jsonify
from flask_babel import gettext

from pgadmin.browser.server_groups.servers import databases
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    SchemaChildModule, DataTypeReader
from pgadmin.browser.server_groups.servers.databases.utils import \
    parse_sec_labels_from_db, parse_variables_from_db
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from pgadmin.browser.server_groups.servers.databases.schemas.functions.utils \
    import format_arguments_from_db


class FunctionModule(SchemaChildModule):
    """
    class FunctionModule(SchemaChildModule):

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

    _NODE_TYPE = 'function'
    _COLLECTION_LABEL = gettext("Functions")

    def __init__(self, *args, **kwargs):
        """
        Initialize the Function Module.
        Args:
            *args:
            **kwargs:
        """
        super().__init__(*args, **kwargs)

        self.min_ver = None
        self.max_ver = None
        self.server_type = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate Functions collection node.
        """
        if self.has_nodes(sid, did, scid=scid,
                          base_template_path=FunctionView.BASE_TEMPLATE_PATH):
            yield self.generate_browser_collection_node(scid)

    @property
    def node_inode(self):
        """
        Make the node as leaf node.
        Returns:
            False as this node doesn't have child nodes.
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for Functions, when the
        schema node is initialized.
        """
        return databases.DatabaseModule.node_type

    @property
    def csssnippets(self):
        """
        Returns a snippet of css
        """
        snippets = []
        snippets.extend(
            super().csssnippets
        )

        return snippets


blueprint = FunctionModule(__name__)


class FunctionView(PGChildNodeView, DataTypeReader, SchemaDiffObjectCompare):
    """
    class FunctionView(PGChildNodeView)

    This class inherits PGChildNodeView to get the different routes for
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

    * list(gid, sid, did, scid):
      - List the Functions.

    * nodes(gid, sid, did, scid):
      - Returns all the Functions to generate Nodes in the browser.

    * properties(gid, sid, did, scid, fnid):
      - Returns the Functions properties.

    * create(gid, sid, did, scid):
      - Creates a new Functions object.

    * update(gid, sid, did, scid, fnid):
      - Updates the Functions object.

    * delete(gid, sid, did, scid, fnid):
      - Drops the Functions object.

    * sql(gid, sid, did, scid, fnid):
      - Returns the SQL for the Functions object.

    * msql(gid, sid, did, scid, fnid=None):
      - Returns the modified SQL.

    * dependents(gid, sid, did, scid, fnid):
      - Returns the dependents for the Functions object.

    * dependencies(gid, sid, did, scid, fnid):
      - Returns the dependencies for the Functions object.

    * get_languages(gid, sid, did, scid, fnid=None):
      - Returns languages.

    * types(gid, sid, did, scid, fnid=None):
      - Returns Data Types.

    * select_sql(gid, sid, did, scid, fnid):
      - Returns sql for Script

    * exec_sql(gid, sid, did, scid, fnid):
      - Returns sql for Script

    * compare(**kwargs):
      - This function will compare the function nodes from two
        different schemas.
    """

    node_type = blueprint.node_type
    BASE_TEMPLATE_PATH = 'functions/{0}/sql/#{1}#'
    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'fnid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}, {'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'get_types': [{'get': 'types'}, {'get': 'types'}],
        'get_languages': [{'get': 'get_languages'}, {'get': 'get_languages'}],
        'vopts': [{}, {'get': 'variable_options'}],
        'select_sql': [{'get': 'select_sql'}],
        'exec_sql': [{'get': 'exec_sql'}],
        'get_support_functions': [{'get': 'get_support_functions'},
                                  {'get': 'get_support_functions'}]
    })

    keys_to_ignore = ['oid', 'proowner', 'typnsp', 'xmin', 'prokind',
                      'proisagg', 'pronamespace', 'proargdefaults',
                      'prorettype', 'proallargtypes', 'proacl', 'oid-2',
                      'prolang']

    @property
    def required_args(self):
        """
        Returns Required arguments for functions node.
        Where
            Required Args:
                name:           Name of the Function
                funcowner:      Function Owner
                pronamespace:   Function Namespace
                prorettypename: Function Return Type
                lanname:        Function Language Name
                prosrc:         Function Code
                probin:         Function Object File
        """
        return [
            'name',
            'funcowner',
            'pronamespace',
            'prorettypename',
            'lanname',
            'prosrc',
            'probin'
        ]

    @staticmethod
    def _create_wrap_data(req, key, data):
        """
        This function is used to create data required by validate_request().
        :param req:
        :param key:
        :param data:
        :return:
        """
        list_params = []
        if request.method == 'GET':
            list_params = ['arguments', 'variables', 'proacl',
                           'seclabels', 'acl', 'args']

        if key in list_params and req[key] != '' and req[key] is not None:
            # Coverts string into python list as expected.
            data[key] = json.loads(req[key])
        elif (key == 'proretset' or key == 'proisstrict' or
              key == 'prosecdef' or key == 'proiswindow' or
              key == 'proleakproof'):
            if req[key] == 'true' or req[key] is True:
                data[key] = True
            else:
                data[key] = False if (
                    req[key] == 'false' or req[key] is False) else ''
        else:
            data[key] = req[key]

    @staticmethod
    def _remove_parameters_for_c_lang(req, req_args):
        """
        This function is used to remove 'prosrc' from the required
        arguments list if language is 'c'.
        :param req:
        :param req_args:
        :return:
        """
        if req['lanname'] == 'c' and 'prosrc' in req_args:
            req_args.remove('prosrc')

    @staticmethod
    def _get_request_data():
        """
        This function is used to get the request data.
        :return:
        """
        if request.data:
            req = json.loads(request.data)
        else:
            req = request.args or request.form
        return req

    def validate_request(f):
        """
        Works as a decorator.
        Validating request on the request of create, update and modified SQL.
        """

        @wraps(f)
        def wrap(self, **kwargs):
            req = FunctionView._get_request_data()

            if 'fnid' not in kwargs:
                req_args = self.required_args
                FunctionView._remove_parameters_for_c_lang(req, req_args)
                for arg in req_args:
                    if (arg not in req or req[arg] == '') or \
                        (arg == 'probin' and req['lanname'] == 'c' and
                         (arg not in req or req[arg] == '')):
                        return make_json_response(
                            status=410,
                            success=0,
                            errormsg=gettext(
                                "Could not find the required parameter ({})."
                            ).format(arg)
                        )

            data = {}
            for key in req:
                FunctionView._create_wrap_data(req, key, data)

            self.request = data
            return f(self, **kwargs)

        return wrap

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

            # Set the template path for the SQL scripts
            self.sql_template_path = self.BASE_TEMPLATE_PATH.format(
                self.manager.server_type, self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        List all the Functions.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
        """

        sql = render_template("/".join([self.sql_template_path,
                                        self._NODE_SQL]),
                              scid=scid, conn=self.conn)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, fnid=None):
        """
        Returns all the Functions to generate the Nodes.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
        """

        res = []
        sql = render_template(
            "/".join([self.sql_template_path, self._NODE_SQL]),
            scid=scid,
            fnid=fnid,
            conn=self.conn
        )
        status, rset = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        if fnid is not None:
            if len(rset['rows']) == 0:
                return gone(
                    gettext("Could not find the specified %s.").format(
                        self.node_type
                    )
                )

            row = rset['rows'][0]
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-" + self.node_type,
                    funcowner=row['funcowner'],
                    language=row['lanname'],
                    description=row['description']
                )
            )

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-" + self.node_type,
                    funcowner=row['funcowner'],
                    language=row['lanname'],
                    description=row['description']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, fnid=None):
        """
        Returns the Function properties.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """

        resp_data = self._fetch_properties(gid, sid, did, scid, fnid)
        # Most probably this is due to error
        if not isinstance(resp_data, dict):
            return resp_data

        if len(resp_data) == 0:
            return gone(
                gettext("Could not find the function node in the database.")
            )

        return ajax_response(
            response=resp_data,
            status=200
        )

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

        return {"acl": privileges}

    @check_precondition
    def types(self, gid, sid, did, scid, fnid=None):
        """
        Returns the Data Types.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """

        condition = "(typtype IN ('b', 'c', 'd', 'e', 'p', 'r') AND " \
                    "typname NOT IN ('any', 'trigger', 'language_handler', " \
                    "'event_trigger'))"
        if not self.blueprint.show_system_objects:
            condition += " AND nspname NOT LIKE E'pg\\\\_toast%' AND " \
                         "nspname NOT LIKE E'pg\\\\_temp%' AND "\
                         "nspname != 'information_schema'"

        # Get Types
        status, types = self.get_types(self.conn, condition, False, scid)

        if not status:
            return internal_server_error(errormsg=types)

        return make_json_response(
            data=types,
            status=200
        )

    @check_precondition
    def get_languages(self, gid, sid, did, scid, fnid=None):
        """
        Returns the Languages list.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """

        res = []
        try:
            sql = render_template("/".join([self.sql_template_path,
                                            'get_languages.sql'])
                                  )
            status, rows = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            res = res + rows['rows']

            return make_json_response(
                data=res,
                status=200
            )
        except Exception:
            _, exc_value, _ = sys.exc_info()
            return internal_server_error(errormsg=str(exc_value))

    @check_precondition
    def variable_options(self, gid, sid, did, scid, fnid=None):
        """
        Returns the variables.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id

        Returns:
            This function will return list of variables available for
            table spaces.
        """
        sql = render_template(
            "/".join([self.sql_template_path, 'variables.sql'])
        )
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        return make_json_response(
            data=rset['rows'],
            status=200
        )

    @check_precondition
    @validate_request
    def create(self, gid, sid, did, scid):
        """
        Create a new Function object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id

        Returns:
            Function object in json format.
        """

        # Get SQL to create Function
        status, sql = self._get_sql(gid=gid, sid=sid, did=did, scid=scid,
                                    data=self.request,
                                    allow_code_formatting=False)
        if not status:
            return internal_server_error(errormsg=sql)

        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        sql = render_template(
            "/".join(
                [self.sql_template_path, self._OID_SQL]
            ),
            nspname=self.request['pronamespace'],
            name=self.request['name'],
            conn=self.conn
        )
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        res = res['rows'][0]

        return jsonify(
            node=self.blueprint.generate_browser_node(
                res['oid'],
                res['nsp'],
                res['name'],
                icon="icon-" + self.node_type,
                language=res['lanname'],
                funcowner=res['funcowner']
            )
        )

    @check_precondition
    def delete(self, gid, sid, did, scid, fnid=None, only_sql=False):
        """
        Drop the Function.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """
        if fnid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [fnid]}

        cascade = self._check_cascade_operation()

        try:
            for fnid in data['ids']:
                # Fetch Name and Schema Name to delete the Function.
                sql = render_template("/".join([self.sql_template_path,
                                                self._DELETE_SQL]), scid=scid,
                                      fnid=fnid)
                status, res = self.conn.execute_2darray(sql)
                if not status:
                    return internal_server_error(errormsg=res)
                elif not res['rows']:
                    return make_json_response(
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=gettext(
                            'The specified function could not be found.\n'
                        )
                    )

                sql = render_template("/".join([self.sql_template_path,
                                                self._DELETE_SQL]),
                                      name=res['rows'][0]['name'],
                                      func_args=res['rows'][0]['func_args'],
                                      nspname=res['rows'][0]['nspname'],
                                      cascade=cascade)
                if only_sql:
                    return sql
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Function dropped.")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    @validate_request
    def update(self, gid, sid, did, scid, fnid):
        """
        Update the Function.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """

        status, sql = self._get_sql(gid=gid, sid=sid, did=did, scid=scid,
                                    data=self.request, fnid=fnid,
                                    allow_code_formatting=False)
        if not status:
            return internal_server_error(errormsg=sql)

        if sql and sql.strip('\n') and sql.strip(' '):

            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            resp_data = self._fetch_properties(gid, sid, did, scid, fnid)
            # Most probably this is due to error
            if not isinstance(resp_data, dict):
                return resp_data

            if self.node_type == 'procedure':
                obj_name = resp_data['name_with_args']
            elif self.node_type == 'function':
                args = resp_data['proargs'] if resp_data['proargs'] else ''
                obj_name = resp_data['name'] + '({0})'.format(args)
            else:
                obj_name = resp_data['name'] + '()'

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    fnid,
                    resp_data['pronamespace'],
                    obj_name,
                    icon="icon-" + self.node_type,
                    language=resp_data['lanname'],
                    funcowner=resp_data['funcowner'],
                    description=resp_data['description']
                )
            )
        else:
            return make_json_response(
                success=1,
                info="Nothing to update.",
                data={
                    'id': fnid,
                    'scid': scid,
                    'sid': sid,
                    'gid': gid,
                    'did': did
                }
            )

    @staticmethod
    def _check_argtype(args, args_without_name, a):
        """
        This function is used to check the arg type.
        :param args:
        :param args_without_name:
        :param a:
        :return:
        """
        if 'argtype' in a:
            args += a['argtype']
            args_without_name.append(a['argtype'])
        return args, args_without_name

    def _get_arguments(self, args_list, args, args_without_name):
        """
        This function is used to get the arguments.
        :param args_list:
        :param args:
        :param args_without_name:
        :return:
        """
        cnt = 1
        for a in args_list:
            if (
                (
                    'argmode' in a and a['argmode'] != 'OUT' and
                    a['argmode'] is not None
                ) or 'argmode' not in a
            ):
                if 'argmode' in a:
                    args += a['argmode'] + " "
                if (
                    'argname' in a and a['argname'] != '' and
                    a['argname'] is not None
                ):
                    args += self.qtIdent(
                        self.conn, a['argname']) + " "

                args, args_without_name = FunctionView._check_argtype(
                    args,
                    args_without_name,
                    a
                )

                if cnt < len(args_list):
                    args += ', '
            cnt += 1

    def _parse_privilege_data(self, resp_data):
        """
        This function is used to parse the privilege data.
        :param resp_data:
        :return:
        """
        # Parse privilege data
        if 'acl' in resp_data:
            resp_data['acl'] = parse_priv_to_db(resp_data['acl'], ['X'])

            # Check Revoke all for public
            resp_data['revoke_all'] = self._set_revoke_all(
                resp_data['acl'])

    def _get_schema_name_from_oid(self, resp_data):
        """
        This function is used to get te schema name from OID.
        :param resp_data:
        :return:
        """
        if 'pronamespace' in resp_data:
            resp_data['pronamespace'] = self._get_schema(
                resp_data['pronamespace'])

    def _get_function_definition(self, scid, fnid, resp_data, target_schema):

        sql = render_template("/".join([self.sql_template_path,
                                        self._GET_DEFINITION_SQL]
                                       ), data=resp_data,
                              fnid=fnid, scid=scid)

        status, res = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=res)
        elif target_schema:
            res['rows'][0]['nspname'] = target_schema
            resp_data['pronamespace'] = target_schema

        # Add newline and tab before each argument to format
        name_with_default_args = self.qtIdent(
            self.conn,
            res['rows'][0]['nspname'],
            res['rows'][0]['proname']
        ) + '(\n\t' + res['rows'][0]['func_args']. \
            replace(', ', ',\n\t') + ')'

        # Generate sql for "SQL panel"
        # func_def is function signature with default arguments
        # query_for - To distinguish the type of call
        func_def = render_template("/".join([self.sql_template_path,
                                             self._CREATE_SQL]),
                                   data=resp_data, query_type="create",
                                   func_def=name_with_default_args,
                                   query_for="sql_panel",
                                   add_replace_clause=True,
                                   conn=self.conn
                                   )

        return func_def

    def _get_procedure_definition(self, scid, fnid, resp_data, target_schema):

        sql = render_template("/".join([self.sql_template_path,
                                        self._GET_DEFINITION_SQL]
                                       ), data=resp_data,
                              fnid=fnid, scid=scid)

        status, res = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=res)
        elif target_schema:
            res['rows'][0]['nspname'] = target_schema

        # Add newline and tab before each argument to format
        name_with_default_args = self.qtIdent(
            self.conn,
            res['rows'][0]['nspname'],
            res['rows'][0]['proname']
        ) + '(\n\t' + res['rows'][0]['func_args'].\
            replace(', ', ',\n\t') + ')'

        # Generate sql for "SQL panel"
        # func_def is procedure signature with default arguments
        # query_for - To distinguish the type of call
        func_def = render_template("/".join([self.sql_template_path,
                                             self._CREATE_SQL]),
                                   data=resp_data, query_type="create",
                                   func_def=name_with_default_args,
                                   query_for="sql_panel",
                                   conn=self.conn)

        return func_def

    @check_precondition
    def sql(self, gid, sid, did, scid, fnid=None, **kwargs):
        """
        Returns the SQL for the Function object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
            json_resp:
        """
        json_resp = kwargs.get('json_resp', True)
        target_schema = kwargs.get('target_schema', None)

        resp_data = self._fetch_properties(gid, sid, did, scid, fnid)
        # Most probably this is due to error
        if not isinstance(resp_data, dict):
            return resp_data

        # Fetch the function definition.
        args = ''
        args_without_name = []

        args_list = []
        vol_dict = {'v': 'VOLATILE', 's': 'STABLE', 'i': 'IMMUTABLE'}

        if 'arguments' in resp_data and len(resp_data['arguments']) > 0:
            args_list = resp_data['arguments']
            resp_data['args'] = resp_data['arguments']

        self._get_arguments(args_list, args, args_without_name)

        resp_data['func_args'] = args.strip(' ')

        resp_data['func_args_without'] = ', '.join(args_without_name)

        self.reformat_prosrc_code(resp_data)

        if self.node_type == 'procedure':
            object_type = 'procedure'

            if 'provolatile' in resp_data:
                resp_data['provolatile'] = vol_dict.get(
                    resp_data['provolatile'], ''
                )

            # Get Schema Name from its OID.
            self._get_schema_name_from_oid(resp_data)

            # Parse privilege data
            self._parse_privilege_data(resp_data)

            func_def = self._get_procedure_definition(scid, fnid, resp_data,
                                                      target_schema)
        else:
            object_type = 'function'

            # We are showing trigger functions under the trigger node.
            # It may possible that trigger is in one schema and trigger
            # function is in another schema, so to show the SQL we need to
            # change the schema id i.e scid.
            if self.node_type == 'trigger_function' and \
                    scid != resp_data['pronamespace']:
                scid = resp_data['pronamespace']

            # Get Schema Name from its OID.
            self._get_schema_name_from_oid(resp_data)

            # Parse privilege data
            self._parse_privilege_data(resp_data)

            func_def = self._get_function_definition(scid, fnid, resp_data,
                                                     target_schema)

        # This is to check whether any exception occurred, if yes, then return
        if not isinstance(func_def, str) and func_def.status_code is not None:
            return func_def

        sql_header = """-- {0}: {1}.{2}({3})\n\n""".format(
            object_type.upper(), resp_data['pronamespace'],
            resp_data['proname'],
            resp_data['proargtypenames'].lstrip('(').rstrip(')'))
        sql_header += """-- DROP {0} IF EXISTS {1}({2});\n\n""".format(
            object_type.upper(), self.qtIdent(
                self.conn, resp_data['pronamespace'], resp_data['proname']),
            resp_data['proargtypenames'].lstrip('(').rstrip(')'))

        pattern = '\n{2,}'
        repl = '\n\n'
        if not json_resp:
            return re.sub(pattern, repl, func_def)

        sql = sql_header + func_def
        sql = re.sub(pattern, repl, sql)

        return ajax_response(response=sql)

    @check_precondition
    @validate_request
    def msql(self, gid, sid, did, scid, fnid=None):
        """
        Returns the modified SQL.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        Returns:
            SQL statements to create/update the Domain.
        """

        status, sql = self._get_sql(gid=gid, sid=sid, did=did, scid=scid,
                                    data=self.request, fnid=fnid)

        if not status:
            return internal_server_error(errormsg=sql)

        sql = re.sub('\n{2,}', '\n\n', sql)
        return make_json_response(
            data=sql,
            status=200
        )

    @staticmethod
    def _update_arguments_for_get_sql(data, old_data):
        """
        If Function Definition/Arguments are changed then merge old
        Arguments with changed ones for Create/Replace Function SQL statement
        :param data:
        :param old_data:
        :return:
        """
        if 'arguments' in data and len(data['arguments']) > 0:
            for arg in data['arguments']['changed']:
                for old_arg in old_data['arguments']:
                    if arg['argid'] == old_arg['argid']:
                        old_arg.update(arg)
                        break
            data['arguments'] = old_data['arguments']
        elif data['change_func']:
            data['arguments'] = old_data['arguments']

    @staticmethod
    def _delete_variable_in_edit_mode(data, del_variables):
        """
        This function is used to create variables that marked for delete.
        :param data:
        :param del_variables:
        :return:
        """
        if 'variables' in data and 'deleted' in data['variables']:
            for v in data['variables']['deleted']:
                del_variables[v['name']] = v['value']

    @staticmethod
    def _prepare_final_dict(data, old_data, chngd_variables, del_variables,
                            all_ids_dict):
        """
        This function is used to prepare the final dict.
        :param data:
        :param old_data:
        :param chngd_variables:
        :param del_variables:
        :param all_ids_dict:
        :return:
        """
        # In case of schema diff we don't want variables from
        # old data
        if not all_ids_dict['is_schema_diff']:
            for v in old_data['variables']:
                old_data['chngd_variables'][v['name']] = v['value']

        # Prepare final dict of new and old variables
        for name, val in old_data['chngd_variables'].items():
            if (
                name not in chngd_variables and
                name not in del_variables
            ):
                chngd_variables[name] = val

        # Prepare dict in [{'name': var_name, 'value': var_val},..]
        # format
        for name, val in chngd_variables.items():
            data['merged_variables'].append({'name': name,
                                             'value': val})

    @staticmethod
    def _parser_privilege(data):
        """
        This function is used to parse the privilege data.
        :param data:
        :return:
        """
        if 'acl' in data:
            for key in ['added', 'deleted', 'changed']:
                if key in data['acl']:
                    data['acl'][key] = parse_priv_to_db(
                        data['acl'][key], ["X"])

    @staticmethod
    def _merge_variable_changes(data, chngd_variables):
        """
        This function is used to merge the changed variables.
        :param data:
        :param chngd_variables:
        :return:
        """
        if 'variables' in data and 'changed' in data['variables']:
            for v in data['variables']['changed']:
                chngd_variables[v['name']] = v['value']

        if 'variables' in data and 'added' in data['variables']:
            for v in data['variables']['added']:
                chngd_variables[v['name']] = v['value']

    @staticmethod
    def _merge_variables(data):
        """
        This function is used to prepare the merged variables.
        :param data:
        :return:
        """
        if 'variables' in data and 'changed' in data['variables']:
            for v in data['variables']['changed']:
                data['merged_variables'].append(v)

        if 'variables' in data and 'added' in data['variables']:
            for v in data['variables']['added']:
                data['merged_variables'].append(v)

    def _get_sql_for_edit_mode(self, data, parallel_dict, all_ids_dict,
                               vol_dict, allow_code_formatting=True):
        """
        This function is used to get the sql for edit mode.
        :param data:
        :param parallel_dict:
        :param all_ids_dict:
        :param vol_dict:
        :return:
        """
        if 'proparallel' in data and data['proparallel']:
            data['proparallel'] = parallel_dict[data['proparallel']]

        # Fetch Old Data from database.
        old_data = self._fetch_properties(all_ids_dict['gid'],
                                          all_ids_dict['sid'],
                                          all_ids_dict['did'],
                                          all_ids_dict['scid'],
                                          all_ids_dict['fnid'])
        # Most probably this is due to error
        if not isinstance(old_data, dict):
            return False, gettext(
                "Could not find the function in the database."
            ), ''

        # Get Schema Name
        old_data['pronamespace'] = self._get_schema(
            old_data['pronamespace']
        )

        if 'provolatile' in old_data and \
                old_data['provolatile'] is not None:
            old_data['provolatile'] = vol_dict[old_data['provolatile']]

        if 'proparallel' in old_data and \
                old_data['proparallel'] is not None:
            old_data['proparallel'] = \
                parallel_dict[old_data['proparallel']]

        # If any of the below argument is changed,
        # then CREATE OR REPLACE SQL statement should be called
        fun_change_args = ['lanname', 'prosrc', 'probin', 'prosrc_c',
                           'provolatile', 'proisstrict', 'prosecdef',
                           'proparallel', 'procost', 'proleakproof',
                           'arguments', 'prorows', 'prosupportfunc',
                           'prorettypename']

        data['change_func'] = False
        for arg in fun_change_args:
            if (arg == 'arguments' and arg in data and len(
                    data[arg]) > 0) or arg in data:
                data['change_func'] = True

        # If Function Definition/Arguments are changed then merge old
        #  Arguments with changed ones for Create/Replace Function
        # SQL statement
        FunctionView._update_arguments_for_get_sql(data, old_data)

        # Parse Privileges
        FunctionView._parser_privilege(data)

        # Parse Variables
        chngd_variables = {}
        data['merged_variables'] = []
        old_data['chngd_variables'] = {}
        del_variables = {}

        # If Function Definition/Arguments are changed then,
        # Merge old, new (added, changed, deleted) variables,
        # which will be used in the CREATE or REPLACE Function sql
        # statement
        if data['change_func']:
            # Deleted Variables
            FunctionView._delete_variable_in_edit_mode(data, del_variables)
            FunctionView._merge_variable_changes(data, chngd_variables)

            # Prepare final dict
            FunctionView._prepare_final_dict(data, old_data, chngd_variables,
                                             del_variables, all_ids_dict)
        else:
            FunctionView._merge_variables(data)

        self._format_prosrc_for_pure_sql(data, False, old_data['lanname'])

        if allow_code_formatting:
            self.reformat_prosrc_code(data)

        sql = render_template(
            "/".join([self.sql_template_path, self._UPDATE_SQL]),
            data=data, o_data=old_data, conn=self.conn
        )
        return True, '', sql

    def _format_prosrc_for_pure_sql(self, data, view_only=True, lanname='sql'):

        if self.manager.sversion < 140000:
            return

        # no need to test whether function/procedure definition is pure sql
        # or not, the parameter from 'is_pure_sql' is sufficient.
        if view_only:
            if 'is_pure_sql' in data and data['is_pure_sql'] is True:
                data['prosrc'] = data['prosrc_sql']
                if data['prosrc'].endswith(';') is False:
                    data['prosrc'] = ''.join((data['prosrc'], ';'))
            else:
                data['is_pure_sql'] = False
        else:
            # when function/procedure definition is changed, we need to find
            # whether definition is of pure or have std sql definition.
            if lanname == 'sql' and self._is_function_def_sql_standard(data):
                data['is_pure_sql'] = True
                if data['prosrc'].endswith(';') is False:
                    data['prosrc'] = ''.join((data['prosrc'], ';'))

    def _get_sql(self, **kwargs):
        """
        Generates the SQL statements to create/update the Function.

        Args:
            kwargs:
        """
        gid = kwargs.get('gid')
        sid = kwargs.get('sid')
        did = kwargs.get('did')
        scid = kwargs.get('scid')
        data = kwargs.get('data')
        fnid = kwargs.get('fnid', None)
        is_sql = kwargs.get('is_sql', False)
        is_schema_diff = kwargs.get('is_schema_diff', False)
        allow_code_formatting = kwargs.get('allow_code_formatting', True)

        vol_dict = {'v': 'VOLATILE', 's': 'STABLE', 'i': 'IMMUTABLE'}
        parallel_dict = {'u': 'UNSAFE', 's': 'SAFE', 'r': 'RESTRICTED'}

        # Get Schema Name from its OID.
        self._get_schema_name_from_oid(data)

        if fnid is not None:
            # Edit Mode
            if 'provolatile' in data:
                data['provolatile'] = vol_dict[data['provolatile']] \
                    if data['provolatile'] else ''

            all_ids_dict = {
                'gid': gid,
                'sid': sid,
                'did': did,
                'scid': scid,
                'data': data,
                'fnid': fnid,
                'is_sql': is_sql,
                'is_schema_diff': is_schema_diff,
            }
            status, errmsg, sql = self._get_sql_for_edit_mode(
                data, parallel_dict, all_ids_dict, vol_dict,
                allow_code_formatting=allow_code_formatting)

            if not status:
                return False, errmsg

        else:
            # Parse Privileges
            self._parse_privilege_data(data)

            args = ''
            args_without_name = []

            args_list = []
            if 'arguments' in data and len(data['arguments']) > 0:
                args_list = data['arguments']
            elif 'args' in data and len(data['args']) > 0:
                args_list = data['args']

            self._get_arguments(args_list, args, args_without_name)

            data['func_args'] = args.strip(' ')

            data['func_args_without'] = ', '.join(args_without_name)

            self._format_prosrc_for_pure_sql(data, False)

            if allow_code_formatting:
                self.reformat_prosrc_code(data)

            # Create mode
            sql = render_template("/".join([self.sql_template_path,
                                            self._CREATE_SQL]),
                                  data=data, is_sql=is_sql, conn=self.conn)
        return True, sql.strip('\n')

    def _fetch_properties(self, gid, sid, did, scid, fnid=None):
        """
        Return Function Properties which will be used in properties,
        msql function.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """

        sql = render_template("/".join([self.sql_template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, fnid=fnid)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the function in the database.")
            )

        resp_data = res['rows'][0]

        # Get formatted Arguments
        frmtd_params, frmtd_proargs = (
            format_arguments_from_db(self.sql_template_path, self.conn,
                                     resp_data))
        resp_data.update(frmtd_params)
        resp_data.update(frmtd_proargs)

        # Fetch privileges
        sql = render_template("/".join([self.sql_template_path,
                                        self._ACL_SQL]),
                              fnid=fnid)
        status, proaclres = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        # Get Formatted Privileges
        resp_data.update(self._format_proacl_from_db(proaclres['rows']))

        # Set System Functions Status
        resp_data['sysfunc'] = False
        if fnid <= self._DATABASE_LAST_SYSTEM_OID:
            resp_data['sysfunc'] = True

        # Set System Functions Status
        resp_data['sysproc'] = False
        if fnid <= self._DATABASE_LAST_SYSTEM_OID:
            resp_data['sysproc'] = True

        # Get formatted Security Labels
        if 'seclabels' in resp_data:
            resp_data.update(parse_sec_labels_from_db(resp_data['seclabels']))

        # Get formatted Variable
        resp_data.update(parse_variables_from_db([
            {"setconfig": resp_data['proconfig']}]))

        # Reset Volatile, Cost and Parallel parameter for Procedures
        # if language is not 'edbspl' and database server version is
        # greater than 10.
        if self.manager.sversion >= 110000 \
            and ('prokind' in resp_data and resp_data['prokind'] == 'p') \
                and ('lanname' in resp_data and
                     resp_data['lanname'] != 'edbspl'):
            resp_data['procost'] = None
            resp_data['provolatile'] = None
            resp_data['proparallel'] = None

        self._format_prosrc_for_pure_sql(resp_data)

        return resp_data

    def _get_schema(self, scid):
        """
        Returns Schema Name from its OID.

        Args:
            scid: Schema Id
        """
        sql = render_template("/".join([self.sql_template_path,
                                        'get_schema.sql']), scid=scid)

        status, schema_name = self.conn.execute_scalar(sql)

        if not status:
            return internal_server_error(errormsg=schema_name)

        return schema_name

    def _set_revoke_all(self, privileges):
        """
        Check whether the function requires REVOKE statement
        for PUBLIC or not.
        """
        revoke_all = True if len(privileges) > 0 else False
        for p in privileges:
            if p['grantee'] == 'PUBLIC':
                revoke_all = False
                break

        return revoke_all

    @check_precondition
    def get_support_functions(self, gid, sid, did, scid):
        """
        This function will return list of available support functions.
        """
        res = [{'label': '', 'value': ''}]

        try:
            sql = render_template(
                "/".join([self.sql_template_path,
                          'get_support_functions.sql']),
                show_system_objects=self.blueprint.show_system_objects
            )
            status, rset = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['sfunctions'],
                     'value': row['sfunctions']}
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def dependents(self, gid, sid, did, scid, fnid):
        """
        This function get the dependents and return ajax response
        for the Function node.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """
        dependents_result = self.get_dependents(self.conn, fnid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, fnid):
        """
        This function get the dependencies and return ajax response
        for the Function node.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """
        dependencies_result = self.get_dependencies(self.conn, fnid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def select_sql(self, gid, sid, did, scid, fnid):
        """
        This function returns sql for select script call.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """
        # Fetch the function definition.
        sql = render_template("/".join([self.sql_template_path,
                                        self._GET_DEFINITION_SQL]), fnid=fnid,
                              scid=scid)
        status, res = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(gettext("The specified function could not be found."))

        # Fetch only arguments
        arg_string = res['rows'][0]['func_with_identity_arguments']
        # Split argument by comma, Remove unwanted spaces and,
        # format argument like "\n\t <args>"
        args = ','.join(
            ['\n\t<' + arg.strip(' ') + '>' for arg in arg_string.split(',')]
        ) + '\n' if len(arg_string) > 0 else ''

        name = self.qtIdent(
            self.conn, res['rows'][0]['nspname'],
            res['rows'][0]['proname']
        ) + '(' + args + ')'

        sql = "SELECT {0}".format(name)

        return ajax_response(response=sql)

    @check_precondition
    def exec_sql(self, gid, sid, did, scid, fnid):
        """
        This function returns sql for exec script call.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """
        resp_data = self._fetch_properties(gid, sid, did, scid, fnid)
        # Most probably this is due to error
        if not isinstance(resp_data, dict):
            return resp_data

        # Fetch the schema name from OID
        if 'pronamespace' in resp_data:
            resp_data['pronamespace'] = self._get_schema(
                resp_data['pronamespace']
            )

        # Fetch only arguments
        arg_string = resp_data['proargs']
        # Split argument by comma, Remove unwanted spaces and,
        # format argument like "\n\t <args>"
        args = ','.join(
            ['\n\t<' + arg.strip(' ') + '>' for arg in arg_string.split(',')]
        ) + '\n' if len(arg_string) > 0 else ''

        name = self.qtIdent(
            self.conn, resp_data['pronamespace'],
            resp_data['proname']
        ) + '(' + args + ')'

        if self.manager.server_type == 'pg':
            sql = "CALL {0}".format(name)
        else:
            sql = "EXEC {0}".format(name)

        return ajax_response(response=sql)

    @check_precondition
    def statistics(self, gid, sid, did, scid, fnid=None):
        """
        Statistics

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Function/Procedure/Trigger Function Id

        Returns the statistics for a particular object if fnid is specified
        """

        if fnid is not None:
            sql = 'stats.sql'
            schema_name = None
        else:
            sql = 'coll_stats.sql'
            # Get schema name
            status, schema_name = self.conn.execute_scalar(
                render_template(
                    'schemas/pg/#{0}#/sql/get_name.sql'.format(
                        self.manager.version),
                    scid=scid
                )
            )
            if not status:
                return internal_server_error(errormsg=schema_name)

        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.sql_template_path, sql]),
                conn=self.conn, fnid=fnid,
                scid=scid, schema_name=schema_name
            )
        )

        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            data=res,
            status=200
        )

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
            if target_schema:
                data['schema'] = target_schema
            _, sql = self._get_sql(gid=gid, sid=sid, did=did, scid=scid,
                                   data=data, fnid=oid, is_sql=False,
                                   is_schema_diff=True,
                                   allow_code_formatting=False)
            # Check if return type is changed then we need to drop the
            # function first and then recreate it.
            if 'prorettypename' in data:
                drop_fun_sql = self.delete(gid=gid, sid=sid, did=did,
                                           scid=scid, fnid=oid, only_sql=True)
                sql = drop_fun_sql + '\n' + sql
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, fnid=oid, only_sql=True)
            elif target_schema:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, fnid=oid,
                               target_schema=target_schema, json_resp=False)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, fnid=oid,
                               json_resp=False)
        return sql

    def reformat_prosrc_code(self, data):
        """
        :param data:
        :return:
        """
        if 'prosrc' in data and data['prosrc'] is not None:

            is_prc_version_lesser_than_11 = \
                self.node_type == 'procedure' and\
                self.manager.sversion <= 110000

            if not is_prc_version_lesser_than_11:
                if data['prosrc'].startswith('\n') is False:
                    data['prosrc'] = ''.join(
                        ('\n', data['prosrc']))

                if data['prosrc'].endswith('\n') is False:
                    data['prosrc'] = ''.join(
                        (data['prosrc'], '\n'))

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid, oid=None):
        """
        This function will fetch the list of all the functions for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()
        server_type = self.manager.server_type
        server_version = self.manager.sversion

        if server_type == 'pg' and self.blueprint.min_ver is not None and \
                server_version < self.blueprint.min_ver:
            return res
        if server_type == 'ppas' and self.blueprint.min_ppasver is not None \
                and server_version < self.blueprint.min_ppasver:
            return res

        if not oid:
            sql = render_template("/".join([self.sql_template_path,
                                            self._NODE_SQL]), scid=scid,
                                  schema_diff=True, conn=self.conn)
            status, rset = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                data = self._fetch_properties(0, sid, did, scid, row['oid'])
                if isinstance(data, dict):
                    res[row['name']] = data
        else:
            data = self._fetch_properties(0, sid, did, scid, oid)
            res = data

        return res

    @staticmethod
    def _is_function_def_sql_standard(resp_data):

        """
        This function is responsible for checking the sql to determine
        whether it is as per SQL-standard or not. In fact, the function
        is mainly utilised for the sql language with the newly added
        ATOMIC in the version v14 of Postgres for functions & procedures
        respectively.

        :param resp_data:
        :return: boolean
        """
        # if language is other than 'sql', return False
        if 'lanname' in resp_data and resp_data['lanname'] != 'sql':
            return False

        # invalid regex, these combination should not be present in the sql
        invalid_match = [r"^.*(?:\'|\")?.*(?=.*?atomic).*(?:\'|\").*$",
                         r"^.*(?:\"|\')(?=.*(atomic)).*$"]

        # valid regex, these combination a must in definition to detect a
        # standard sql or pure sql
        valid_match = [
            r"(?=.*begin)(.+?(\n)+)(?=.*atomic)|(?=.*begin)(?=.*atomic)",
            r"(?=return)"
        ]

        is_func_def_sql_std = False

        if 'prosrc' in resp_data and resp_data['prosrc'] is not None \
                and resp_data['prosrc'] != '':

            prosrc = str(resp_data['prosrc']).lower().strip('\n').strip('\t')

            for invalid in invalid_match:
                for match in enumerate(
                        re.finditer(invalid, prosrc, re.MULTILINE), start=1):
                    if match:
                        return is_func_def_sql_std

            for valid in valid_match:
                for match in enumerate(
                        re.finditer(valid, prosrc, re.MULTILINE), start=1):
                    if match:
                        is_func_def_sql_std = True
                        return is_func_def_sql_std

        return is_func_def_sql_std


SchemaDiffRegistry(blueprint.node_type, FunctionView)
FunctionView.register_node_view(blueprint)


class ProcedureModule(SchemaChildModule):
    """
    class ProcedureModule(SchemaChildModule):

        This class represents The Procedures Module.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Initialize the Procedures Module.

    * get_nodes(gid, sid, did, scid)
      - Generate the Procedures collection node.

    * node_inode():
      - Returns Procedures node as leaf node.

    * script_load()
      - Load the module script for Procedures, when schema node is
        initialized.

    """

    _NODE_TYPE = 'procedure'
    _COLLECTION_LABEL = gettext("Procedures")

    def __init__(self, *args, **kwargs):
        """
        Initialize the Procedure Module.
        Args:
            *args:
            **kwargs:
        """
        super().__init__(*args, **kwargs)

        self.min_ver = 110000
        self.max_ver = None
        self.min_ppasver = 90100
        self.server_type = ['pg', 'ppas']

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate Procedures collection node.
        """
        if self.has_nodes(sid, did, scid=scid,
                          base_template_path=ProcedureView.BASE_TEMPLATE_PATH):
            yield self.generate_browser_collection_node(scid)

    @property
    def node_inode(self):
        """
        Make the node as leaf node.
        Returns:
            False as this node doesn't have child nodes.
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for Procedures, when the
        database node is initialized.
        """
        return databases.DatabaseModule.node_type


procedure_blueprint = ProcedureModule(__name__)


class ProcedureView(FunctionView):
    node_type = procedure_blueprint.node_type
    BASE_TEMPLATE_PATH = 'procedures/{0}/sql/#{1}#'

    def __init__(self, *args, **kwargs):
        """
        Initialize the Function Module.
        Args:
            *args:
            **kwargs:
        """
        super().__init__(*args, **kwargs)

    @property
    def required_args(self):
        """
        Returns Required arguments for procedures node.
        Where
            Required Args:
                name:           Name of the Function
                pronamespace:   Function Namespace
                lanname:        Function Language Name
                prosrc:         Function Code
        """
        return ['name',
                'pronamespace',
                'lanname',
                'prosrc']


SchemaDiffRegistry(procedure_blueprint.node_type, ProcedureView)
ProcedureView.register_node_view(procedure_blueprint)


class TriggerFunctionModule(SchemaChildModule):
    """
    class TriggerFunctionModule(SchemaChildModule):

        This class represents The Trigger function Module.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Initialize the Trigger function Module.

    * get_nodes(gid, sid, did, scid)
      - Generate the Trigger function collection node.

    * node_inode():
      - Returns Trigger function node as leaf node.

    * script_load()
      - Load the module script for Trigger function, when schema node is
        initialized.

    """

    _NODE_TYPE = 'trigger_function'
    _COLLECTION_LABEL = gettext("Trigger Functions")

    def __init__(self, *args, **kwargs):
        """
        Initialize the Trigger function Module.
        Args:
            *args:
            **kwargs:
        """
        super().__init__(*args, **kwargs)

        self.min_ver = 90100
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate Trigger function collection node.
        """
        if self.has_nodes(
            sid, did, scid,
                base_template_path=TriggerFunctionView.BASE_TEMPLATE_PATH):
            yield self.generate_browser_collection_node(scid)

    @property
    def node_inode(self):
        """
        Make the node as leaf node.
        Returns:
            False as this node doesn't have child nodes.
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for Trigger function, when the
        schema node is initialized.
        """
        return databases.DatabaseModule.node_type


trigger_function_blueprint = TriggerFunctionModule(__name__)


class TriggerFunctionView(FunctionView):
    node_type = trigger_function_blueprint.node_type
    BASE_TEMPLATE_PATH = 'trigger_functions/{0}/sql/#{1}#'

    def __init__(self, *args, **kwargs):
        """
        Initialize the Function Module.
        Args:
            *args:
            **kwargs:
        """
        super().__init__(*args, **kwargs)

    @property
    def required_args(self):
        """
        Returns Required arguments for trigger function node.
        Where
            Required Args:
                name:           Name of the Trigger function
                pronamespace:   Trigger function Namespace
                lanname:        Trigger function Language Name
                prosrc:         Trigger function Code
        """
        return ['name',
                'pronamespace',
                'lanname',
                'prosrc']


SchemaDiffRegistry(trigger_function_blueprint.node_type, TriggerFunctionView)
TriggerFunctionView.register_node_view(trigger_function_blueprint)
