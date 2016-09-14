##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Functions/Procedures Node."""

import copy
import simplejson as json
import re
import sys
import traceback
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as databases
from flask import render_template, make_response, request, jsonify, \
    current_app
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    SchemaChildModule, DataTypeReader
from pgadmin.browser.server_groups.servers.databases.utils import \
    parse_sec_labels_from_db, parse_variables_from_db
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER


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

    NODE_TYPE = 'function'
    COLLECTION_LABEL = gettext("Functions")

    def __init__(self, *args, **kwargs):
        """
        Initialize the Function Module.
        Args:
            *args:
            **kwargs:
        """
        super(FunctionModule, self).__init__(*args, **kwargs)

        self.min_ver = 90100
        self.max_ver = None
        self.server_type = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate Functions collection node.
        """
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
        return databases.DatabaseModule.NODE_TYPE

    @property
    def csssnippets(self):
        """
        Returns a snippet of css
        """
        snippets = [
            render_template("function/css/function.css")
        ]
        snippets.extend(
            super(SchemaChildModule, self).csssnippets
        )

        return snippets


blueprint = FunctionModule(__name__)


class FunctionView(PGChildNodeView, DataTypeReader):
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

    * module_js():
      - Overrides this property to define javascript for Functions node.

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
    """

    node_type = blueprint.node_type

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
            {'get': 'list', 'post': 'create'}
        ],
        'delete': [{'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}, {'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'get_types': [{'get': 'types'}, {'get': 'types'}],
        'get_languages': [{'get': 'get_languages'}, {'get': 'get_languages'}],
        'vopts': [{}, {'get': 'variable_options'}],
        'select_sql': [{'get': 'select_sql'}],
        'exec_sql': [{'get': 'exec_sql'}]
    })

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

    def validate_request(f):
        """
        Works as a decorator.
        Validating request on the request of create, update and modified SQL.
        """

        @wraps(f)
        def wrap(self, **kwargs):

            data = {}
            if request.data:
                req = json.loads(request.data, encoding='utf-8')
            else:
                req = request.args or request.form

            if 'fnid' not in kwargs:

                for arg in self.required_args:
                    if (arg not in req or req[arg] == '') or \
                            (arg == 'probin' and req['lanname'] == 'c'
                             and (arg not in req or req[arg] == '')):
                        return make_json_response(
                            status=410,
                            success=0,
                            errormsg=gettext(
                                "Could not find the required parameter (%s)." % arg
                            )
                        )

            list_params = []
            if request.method == 'GET':
                list_params = ['arguments', 'variables', 'proacl',
                               'seclabels', 'acl', 'args']

            for key in req:
                if key in list_params and req[key] != '' \
                        and req[key] is not None:
                    # Coverts string into python list as expected.
                    data[key] = json.loads(req[key], encoding='utf-8')
                elif (
                                            key == 'proretset' or key == 'proisstrict' or
                                        key == 'prosecdef' or key == 'proiswindow' or
                                key == 'proleakproof'
                ):
                    data[key] = True if (
                        req[key] == 'true' or req[key] is True) \
                        else False if (req[key] == 'false' or
                                       req[key] is False) else ''
                else:
                    data[key] = req[key]

            self.request = data
            return f(self, **kwargs)

        return wrap

    def module_js(self):
        """
        Load JS file (functions.js) for this module.
        """

        return make_response(
            render_template(
                "function/js/functions.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

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

            ver = self.manager.version

            # Set the template path for the SQL scripts
            self.template_path = "/".join([
                self.node_type
            ])
            self.sql_template_path = "/".join([
                self.template_path,
                self.manager.server_type,
                'sql',
                '9.5_plus' if ver >= 90500 else
                '9.2_plus' if ver >= 90200 else
                '9.1_plus'
            ])

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

        SQL = render_template("/".join([self.sql_template_path, 'node.sql']),
                              scid=scid)
        status, res = self.conn.execute_dict(SQL)

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
        SQL = render_template(
            "/".join([self.sql_template_path, 'node.sql']),
            scid=scid,
            fnid=fnid
        )
        status, rset = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        if fnid is not None:
            if len(rset['rows']) == 0:
                return gone(
                     _("Couldn't find the specified %s").format(self.node_type)
                )

            row = rset['rows'][0]
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-" + self.node_type,
                    funcowner=row['funcowner'],
                    language=row['lanname']
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
                    language=row['lanname']
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

        if len(resp_data) == 0:
            return gone(gettext("""Could not find the function node in the database."""))

        return ajax_response(
            response=resp_data,
            status=200
        )

    def _format_arguments_from_db(self, data):
        """
        Create Argument list of the Function.

        Args:
            data: Function Data

        Returns:
            Function Arguments in the following format.
                [
                {'proargtypes': 'integer', 'proargmodes: 'IN',
                'proargnames': 'column1', 'proargdefaultvals': 1}, {...}
                ]
            Where
                Arguments:
                    proargtypes: Argument Types (Data Type)
                    proargmodes: Argument Modes [IN, OUT, INOUT, VARIADIC]
                    proargnames: Argument Name
                    proargdefaultvals: Default Value of the Argument
        """
        proargtypes = [ptype for ptype in data['proargtypenames'].split(",")] \
            if data['proargtypenames'] else []
        proargmodes = data['proargmodes'] if data['proargmodes'] else []
        proargnames = data['proargnames'] if data['proargnames'] else []
        proargdefaultvals = [ptype for ptype in
                             data['proargdefaultvals'].split(",")] \
            if data['proargdefaultvals'] else []
        proallargtypes = data['proallargtypes'] \
            if data['proallargtypes'] else []

        proargmodenames = {
            'i': 'IN', 'o': 'OUT', 'b': 'INOUT', 'v': 'VARIADIC', 't': 'TABLE'
        }

        # The proargtypes doesn't give OUT params, so we need to fetch
        # those from database explicitly, below code is written for this
        # purpose.
        #
        # proallargtypes gives all the Function's argument including OUT,
        # but we have not used that column; as the data type of this
        # column (i.e. oid[]) is not supported by oidvectortypes(oidvector)
        # function which we have used to fetch the datatypes
        # of the other parameters.

        proargmodes_fltrd = copy.deepcopy(proargmodes)
        proargnames_fltrd = []
        cnt = 0
        for m in proargmodes:
            if m == 'o':  # Out Mode
                SQL = render_template("/".join([self.sql_template_path,
                                                'get_out_types.sql']),
                                      out_arg_oid=proallargtypes[cnt])
                status, out_arg_type = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=out_arg_type)

                # Insert out parameter datatype
                proargtypes.insert(cnt, out_arg_type)
                proargdefaultvals.insert(cnt, '')
            elif m == 'v':  # Variadic Mode
                proargdefaultvals.insert(cnt, '')
            elif m == 't':  # Table Mode
                proargmodes_fltrd.remove(m)
                proargnames_fltrd.append(proargnames[cnt])

            cnt += 1

        cnt = 0
        # Map param's short form to its actual name. (ex: 'i' to 'IN')
        for m in proargmodes_fltrd:
            proargmodes_fltrd[cnt] = proargmodenames[m]
            cnt += 1

        # Removes Argument Names from the list if that argument is removed
        # from the list
        for i in proargnames_fltrd:
            proargnames.remove(i)

        # Insert null value against the parameters which do not have
        # default values.
        if len(proargmodes_fltrd) > len(proargdefaultvals):
            dif = len(proargmodes_fltrd) - len(proargdefaultvals)
            while (dif > 0):
                proargdefaultvals.insert(0, '')
                dif = dif - 1

        # Prepare list of Argument list dict to be displayed in the Data Grid.
        params = {"arguments": [
            self._map_arguments_dict(
                i, proargmodes_fltrd[i] if len(proargmodes_fltrd) > i else '',
                proargtypes[i] if len(proargtypes) > i else '',
                proargnames[i] if len(proargnames) > i else '',
                proargdefaultvals[i] if len(proargdefaultvals) > i else ''
            )
            for i in range(len(proargtypes))]}

        # Prepare string formatted Argument to be displayed in the Properties
        # panel.

        proargs = [self._map_arguments_list(
            proargmodes_fltrd[i] if len(proargmodes_fltrd) > i else '',
            proargtypes[i] if len(proargtypes) > i else '',
            proargnames[i] if len(proargnames) > i else '',
            proargdefaultvals[i] if len(proargdefaultvals) > i else ''
        )
                   for i in range(len(proargtypes))]

        proargs = {"proargs": ", ".join(proargs)}

        return params, proargs

    def _map_arguments_dict(self, argid, argmode, argtype, argname, argdefval):
        """
        Returns Dict of formatted Arguments.
        Args:
            argid: Argument Sequence Number
            argmode: Argument Mode
            argname: Argument Name
            argtype: Argument Type
            argdef: Argument Default Value
        """
        # The pg_get_expr(proargdefaults, 'pg_catalog.pg_class'::regclass) SQL
        # statement gives us '-' as a default value for INOUT mode.
        # so, replacing it with empty string.
        if argmode == 'INOUT' and argdefval.strip() == '-':
            argdefval = ''

        return {"argid": argid,
                "argtype": argtype.strip() if argtype is not None else '',
                "argmode": argmode,
                "argname": argname,
                "argdefval": argdefval}

    def _map_arguments_list(self, argmode, argtype, argname, argdef):
        """
        Returns List of formatted Arguments.
        Args:
            argmode: Argument Mode
            argname: Argument Name
            argtype: Argument Type
            argdef: Argument Default Value
        """
        # The pg_get_expr(proargdefaults, 'pg_catalog.pg_class'::regclass) SQL
        # statement gives us '-' as a default value for INOUT mode.
        # so, replacing it with empty string.
        if argmode == 'INOUT' and argdef.strip() == '-':
            argdef = ''

        arg = ''

        if argmode and argmode:
            arg += argmode + " "
        if argname:
            arg += argname + " "
        if argtype:
            arg += argtype + " "
        if argdef:
            arg += " DEFAULT " + argdef

        return arg.strip(" ")

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

        condition = "(typtype IN ('b', 'c', 'd', 'e', 'p', 'r') AND typname NOT IN ('any', 'trigger', 'language_handler', 'event_trigger'))"
        if self.blueprint.show_system_objects:
            condition += " AND nspname NOT LIKE E'pg\\\\_toast%' AND nspname NOT LIKE E'pg\\\\_temp%'"

        # Get Types
        status, types = self.get_types(self.conn, condition)

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

        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.sql_template_path,
                                            'get_languages.sql'])
                                  )
            status, rows = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            res = res + rows['rows']

            return make_json_response(
                data=res,
                status=200
            )
        except:
            exc_type, exc_value, exc_traceback = sys.exc_info()
            current_app.logger.error(traceback.print_exception(
                exc_type,
                exc_value,
                exc_traceback,
                limit=2
            )
            )

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
        SQL = render_template(
            "/".join([self.sql_template_path, 'variables.sql'])
        )
        status, rset = self.conn.execute_dict(SQL)

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
            fnid: Function Id

        Returns:
            Function object in json format.
        """

        # Get SQL to create Function
        status, SQL = self._get_sql(gid, sid, did, scid, self.request)
        if not status:
            return internal_server_error(errormsg=SQL)

        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        SQL = render_template(
            "/".join(
                [self.sql_template_path, 'get_oid.sql']
            ),
            nspname=self.request['pronamespace'],
            name=self.request['name']
        )
        status, res = self.conn.execute_dict(SQL)
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
    def delete(self, gid, sid, did, scid, fnid):
        """
        Drop the Function.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """

        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            # Fetch Name and Schema Name to delete the Function.
            SQL = render_template("/".join([self.sql_template_path,
                                            'delete.sql']), scid=scid, fnid=fnid)
            status, res = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if not res['rows']:
                return make_json_response(
                    success=0,
                    errormsg=gettext(
                        'Error: Object not found.'
                    ),
                    info=gettext(
                        'The specified function could not be found.\n'
                    )
                )

            SQL = render_template("/".join([self.sql_template_path,
                                            'delete.sql']),
                                  name=res['rows'][0]['name'],
                                  func_args=res['rows'][0]['func_args'],
                                  nspname=res['rows'][0]['nspname'],
                                  cascade=cascade)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Function dropped."),
                data={
                    'id': fnid,
                    'scid': scid,
                    'sid': sid,
                    'gid': gid,
                    'did': did
                }
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

        status, SQL = self._get_sql(gid, sid, did, scid, self.request, fnid)

        if not status:
            return internal_server_error(errormsg=SQL)

        if SQL and SQL.strip('\n') and SQL.strip(' '):

            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            resp_data = self._fetch_properties(gid, sid, did, scid, fnid)

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
                    funcowner=resp_data['funcowner']
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

    @check_precondition
    def sql(self, gid, sid, did, scid, fnid=None):
        """
        Returns the SQL for the Function object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """
        resp_data = self._fetch_properties(gid, sid, did, scid, fnid)
        # Fetch the function definition.
        args = u''
        args_without_name = []
        cnt = 1
        args_list = []

        if 'arguments' in resp_data and len(resp_data['arguments']) > 0:
            args_list = resp_data['arguments']
            resp_data['args'] = resp_data['arguments']

        for a in args_list:
            if (('argmode' in a and a['argmode'] != 'OUT' and
                    a['argmode'] is not None
                 ) or 'argmode' not in a):
                if 'argmode' in a:
                    args += a['argmode'] + " "
                if 'argname' in a and a['argname'] != '' \
                        and a['argname'] is not None:
                    args += self.qtIdent(
                        self.conn, a['argname']) + " "
                if 'argtype' in a:
                    args += a['argtype']
                    args_without_name.append(a['argtype'])
                if cnt < len(args_list):
                    args += ', '
            cnt += 1

        resp_data['func_args'] = args.strip(' ')

        resp_data['func_args_without'] = ', '.join(args_without_name)

        if self.node_type == 'procedure':
            object_type = 'procedure'

            # Get Schema Name from its OID.
            if 'pronamespace' in resp_data:
                resp_data['pronamespace'] = self._get_schema(resp_data[
                    'pronamespace'])

            SQL = render_template("/".join([self.sql_template_path,
                                            'get_definition.sql']
                                           ), data=resp_data,
                                  fnid=fnid, scid=scid)

            status, res = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Add newline and tab before each argument to format
            name_with_default_args = res['rows'][0]['name_with_default_args'].replace(', ', ',\r\t').replace('(', '(\r\t')

            # Parse privilege data
            if 'acl' in resp_data:
                resp_data['acl'] = parse_priv_to_db(resp_data['acl'], ['X'])

            # generate function signature
            header_func_name = '{0}.{1}({2})'.format(
                resp_data['pronamespace'],
                resp_data['proname'],
                resp_data['proargtypenames']
            )

            # Generate sql for "SQL panel"
            # func_def is procedure signature with default arguments
            # query_for - To distinguish the type of call
            func_def = render_template("/".join([self.sql_template_path,
                                                'create.sql']),
                                       data=resp_data, query_type="create",
                                       func_def=name_with_default_args,
                                       query_for="sql_panel")
        else:
            object_type = 'function'

            # Get Schema Name from its OID.
            if 'pronamespace' in resp_data:
                resp_data['pronamespace'] = self._get_schema(resp_data[
                    'pronamespace'])

            # Parse privilege data
            if 'acl' in resp_data:
                resp_data['acl'] = parse_priv_to_db(resp_data['acl'], ['X'])

            # generate function signature
            header_func_name = '{0}.{1}({2})'.format(
                resp_data['pronamespace'],
                resp_data['proname'],
                resp_data['proargtypenames']
            )

            SQL = render_template("/".join([self.sql_template_path,
                                            'get_definition.sql']
                                           ), data=resp_data,
                                  fnid=fnid, scid=scid)

            status, res = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Add newline and tab before each argument to format
            name_with_default_args =  res['rows'][0]['name_with_default_args'].replace(', ', ',\r\t').replace('(', '(\r\t')

            if hasattr(str, 'decode'):
                if resp_data['prosrc']:
                    resp_data['prosrc'] = resp_data['prosrc'].decode(
                        'utf-8'
                    )
                if resp_data['prosrc_c']:
                    resp_data['prosrc_c'] = resp_data['prosrc_c'].decode(
                        'utf-8'
                    )

            # Generate sql for "SQL panel"
            # func_def is function signature with default arguments
            # query_for - To distinguish the type of call
            func_def = render_template("/".join([self.sql_template_path,
                                                 'create.sql']),
                                       data=resp_data, query_type="create",
                                       func_def=name_with_default_args,
                                       query_for="sql_panel")

        sql_header = """-- {0}: {1}

-- DROP {0} {1};

""".format(object_type.upper(), header_func_name)
        if hasattr(str, 'decode'):
            sql_header = sql_header.decode('utf-8')

        SQL = sql_header + func_def
        SQL = re.sub('\n{2,}', '\n\n', SQL)

        return ajax_response(response=SQL)

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

        status, SQL = self._get_sql(gid, sid, did, scid, self.request, fnid)

        if status:
            SQL = re.sub('\n{2,}', '\n\n', SQL)
            return make_json_response(
                data=SQL,
                status=200
            )
        else:
            SQL = re.sub('\n{2,}', '\n\n', SQL)
            return SQL

    def _get_sql(self, gid, sid, did, scid, data, fnid=None, is_sql=False):
        """
        Generates the SQL statements to create/update the Function.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            data: Function data
            fnid: Function Id
        """

        vol_dict = {'v': 'VOLATILE', 's': 'STABLE', 'i': 'IMMUTABLE'}

        # Get Schema Name from its OID.
        if 'pronamespace' in data:
            data['pronamespace'] = self._get_schema(data[
                                                        'pronamespace'])
        if 'provolatile' in data:
            data['provolatile'] = vol_dict[data['provolatile']]

        if fnid is not None:
            # Edit Mode

            # Fetch Old Data from database.
            old_data = self._fetch_properties(gid, sid, did, scid, fnid)

            # Get Schema Name
            old_data['pronamespace'] = self._get_schema(old_data[
                                                            'pronamespace'])

            if 'provolatile' in old_data:
                old_data['provolatile'] = vol_dict[old_data['provolatile']]

            # If any of the below argument is changed,
            # then CREATE OR REPLACE SQL statement should be called
            fun_change_args = ['lanname', 'prosrc', 'probin', 'prosrc_c',
                               'provolatile', 'proisstrict', 'prosecdef',
                               'procost', 'proleakproof', 'arguments']

            data['change_func'] = False
            for arg in fun_change_args:
                if arg == 'arguments' and arg in data and len(data[arg]) \
                        > 0:
                    data['change_func'] = True
                elif arg in data:
                    data['change_func'] = True

            # If Function Definition/Arguments are changed then merge old
            #  Arguments with changed ones for Create/Replace Function
            # SQL statement
            if 'arguments' in data and len(data['arguments']) > 0:
                for arg in data['arguments']['changed']:
                    for old_arg in old_data['arguments']:
                        if arg['argid'] == old_arg['argid']:
                            old_arg.update(arg)
                            break
                data['arguments'] = old_data['arguments']
            elif data['change_func']:
                data['arguments'] = old_data['arguments']

            # Parse Privileges
            if 'acl' in data:
                for key in ['added', 'deleted', 'changed']:
                    if key in data['acl']:
                        data['acl'][key] = parse_priv_to_db(
                            data['acl'][key], ["X"])

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
                # To compare old and new variables, preparing name :
                # value dict

                # Deleted Variables
                if 'variables' in data and 'deleted' in data['variables']:
                    for v in data['variables']['deleted']:
                        del_variables[v['name']] = v['value']

                if 'variables' in data and 'changed' in data['variables']:
                    for v in data['variables']['changed']:
                        chngd_variables[v['name']] = v['value']

                if 'variables' in data and 'added' in data['variables']:
                    for v in data['variables']['added']:
                        chngd_variables[v['name']] = v['value']

                for v in old_data['variables']:
                    old_data['chngd_variables'][v['name']] = v['value']

                # Prepare final dict of new and old variables
                for name, val in old_data['chngd_variables'].items():
                    if name not in chngd_variables and name not in \
                            del_variables:
                        chngd_variables[name] = val

                # Prepare dict in [{'name': var_name, 'value': var_val},..]
                # format
                for name, val in chngd_variables.items():
                    data['merged_variables'].append({'name': name,
                                                     'value': val})
            else:
                if 'variables' in data and 'changed' in data['variables']:
                    for v in data['variables']['changed']:
                        data['merged_variables'].append(v)

                if 'variables' in data and 'added' in data['variables']:
                    for v in data['variables']['added']:
                        data['merged_variables'].append(v)

            SQL = render_template(
                "/".join([self.sql_template_path, 'update.sql']),
                data=data, o_data=old_data
            )
        else:
            # Parse Privileges
            if 'acl' in data:
                data['acl'] = parse_priv_to_db(data['acl'], ["X"])

            args = u''
            args_without_name = []
            cnt = 1
            args_list = []
            if 'arguments' in data and len(data['arguments']) > 0:
                args_list = data['arguments']
            elif 'args' in data and len(data['args']) > 0:
                args_list = data['args']
            for a in args_list:
                if (('argmode' in a and a['argmode'] != 'OUT' and
                             a['argmode'] is not None
                     ) or 'argmode' not in a):
                    if 'argmode' in a:
                        args += a['argmode'] + " "
                    if 'argname' in a and a['argname'] != '' \
                            and a['argname'] is not None:
                        args += self.qtIdent(
                            self.conn, a['argname']) + " "
                    if 'argtype' in a:
                        args += a['argtype']
                        args_without_name.append(a['argtype'])
                    if cnt < len(args_list):
                        args += ', '
                cnt += 1

            data['func_args'] = args.strip(' ')

            data['func_args_without'] = ', '.join(args_without_name)
            # Create mode
            SQL = render_template("/".join([self.sql_template_path,
                                            'create.sql']),
                                  data=data, is_sql=is_sql)
        return True, SQL.strip('\n')

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

        resp_data = {}

        SQL = render_template("/".join([self.sql_template_path,
                                        'properties.sql']),
                              scid=scid, fnid=fnid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""
Could not find the function in the database.\n
It may have been removed by another user or moved to another schema.
"""))

        resp_data = res['rows'][0]

        # Get formatted Arguments
        frmtd_params, frmtd_proargs = self._format_arguments_from_db(resp_data)
        resp_data.update(frmtd_params)
        resp_data.update(frmtd_proargs)

        # Fetch privileges
        SQL = render_template("/".join([self.sql_template_path, 'acl.sql']),
                              fnid=fnid)
        status, proaclres = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # Get Formatted Privileges
        resp_data.update(self._format_proacl_from_db(proaclres['rows']))

        # Set System Functions Status
        resp_data['sysfunc'] = False
        if fnid <= self.manager.db_info[did]['datlastsysoid']:
            resp_data['sysfunc'] = True

        # Get formatted Security Labels
        if 'seclabels' in resp_data:
            resp_data.update(parse_sec_labels_from_db(resp_data['seclabels']))

        # Get formatted Variable
        resp_data.update(parse_variables_from_db([
            {"setconfig": resp_data['proconfig']}]))

        return resp_data

    def _get_schema(self, scid):
        """
        Returns Schema Name from its OID.

        Args:
            scid: Schema Id
        """
        SQL = render_template("/".join([self.sql_template_path,
                                        'get_schema.sql']), scid=scid)

        status, schema_name = self.conn.execute_scalar(SQL)

        if not status:
            return internal_server_error(errormsg=schema_name)

        return schema_name

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
            doid: Function Id
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
            doid: Function Id
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
            doid: Function Id
        """
        # Fetch the function definition.
        SQL = render_template("/".join([self.sql_template_path,
                              'get_definition.sql']), fnid=fnid, scid=scid)
        status, res = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        name = res['rows'][0]['name']

        # Fetch only arguments
        argString = name[name.rfind('('):].strip('(').strip(')')
        if len(argString) > 0:
            args = argString.split(',')
            # Remove unwanted spaces from arguments
            args = [arg.strip(' ') for arg in args]

            # Remove duplicate and then format arguments
            for arg in list(set(args)):
                formatted_arg = '\n\t<' + arg + '>'
                name = name.replace(arg, formatted_arg)
            name = name.replace(')', '\n)')

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
            doid: Function Id
        """
        resp_data = self._fetch_properties(gid, sid, did, scid, fnid)

        # Fetch the schema name from OID
        if 'pronamespace' in resp_data:
            resp_data['pronamespace'] = self._get_schema(
                resp_data['pronamespace']
            )

        name = resp_data['pronamespace'] + "." + resp_data['name_with_args']

        # Fetch only arguments
        args = name[name.rfind('('):].strip('(').strip(')').split(',')
        # Remove unwanted spaces from arguments
        args = [arg.strip(' ') for arg in args]

        # Remove duplicate and then format arguments
        for arg in list(set(args)):
            formatted_arg = '\n\t<' + arg + '>'
            name = name.replace(arg, formatted_arg)

        name = name.replace(')', '\n)')
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
                    'schema/pg/9.1_plus/sql/get_name.sql',
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

    NODE_TYPE = 'procedure'
    COLLECTION_LABEL = gettext("Procedures")

    def __init__(self, *args, **kwargs):
        """
        Initialize the Procedure Module.
        Args:
            *args:
            **kwargs:
        """
        super(ProcedureModule, self).__init__(*args, **kwargs)

        self.min_ver = 90100
        self.max_ver = None
        self.server_type = ['ppas']

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate Procedures collection node.
        """
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
        return databases.DatabaseModule.NODE_TYPE


procedure_blueprint = ProcedureModule(__name__)


class ProcedureView(FunctionView):
    node_type = procedure_blueprint.node_type

    def __init__(self, *args, **kwargs):
        """
        Initialize the Function Module.
        Args:
            *args:
            **kwargs:
        """
        super(ProcedureView, self).__init__(*args, **kwargs)

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

    def module_js(self):
        """
        Load JS file (procedures.js) for this module.
        """

        return make_response(
            render_template(
                "procedure/js/procedures.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )


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

    NODE_TYPE = 'trigger_function'
    COLLECTION_LABEL = gettext("Trigger Functions")

    def __init__(self, *args, **kwargs):
        """
        Initialize the Trigger function Module.
        Args:
            *args:
            **kwargs:
        """
        super(TriggerFunctionModule, self).__init__(*args, **kwargs)

        self.min_ver = 90100
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate Trigger function collection node.
        """
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
        return databases.DatabaseModule.NODE_TYPE


trigger_function_blueprint = TriggerFunctionModule(__name__)


class TriggerFunctionView(FunctionView):
    node_type = trigger_function_blueprint.node_type

    def __init__(self, *args, **kwargs):
        """
        Initialize the Function Module.
        Args:
            *args:
            **kwargs:
        """
        super(TriggerFunctionView, self).__init__(*args, **kwargs)

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

    def module_js(self):
        """
        Load JS file (trigger_function.js) for this module.
        """

        return make_response(
            render_template(
                "trigger_function/js/trigger_functions.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )


TriggerFunctionView.register_node_view(trigger_function_blueprint)
