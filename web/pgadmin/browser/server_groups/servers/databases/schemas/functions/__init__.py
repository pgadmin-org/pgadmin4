##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Functions/Procedures Node."""

import copy
import re
import sys
import traceback
from functools import wraps

import simplejson as json
from flask import render_template, request, jsonify, \
    current_app
from flask_babelex import gettext

import pgadmin.browser.server_groups.servers.databases as databases
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
        super(FunctionModule, self).__init__(*args, **kwargs)

        self.min_ver = None
        self.max_ver = None
        self.server_type = None
        self.min_gpdbver = None

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
        return databases.DatabaseModule.node_type

    @property
    def csssnippets(self):
        """
        Returns a snippet of css
        """
        snippets = []
        snippets.extend(
            super(SchemaChildModule, self).csssnippets
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
            data[key] = json.loads(req[key], encoding='utf-8')
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
            req = json.loads(request.data, encoding='utf-8')
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

            template_initial = None
            if self.node_type == 'function':
                template_initial = 'functions'
            elif self.node_type == 'procedure':
                template_initial = 'procedures'
            elif self.node_type == 'trigger_function':
                template_initial = 'trigger_functions'

            # Set the template path for the SQL scripts
            self.sql_template_path = "/".join([
                template_initial,
                self.manager.server_type,
                'sql',
                '#{0}#'
            ]).format(self.manager.version)

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
                              scid=scid)
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
            fnid=fnid
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

    def _get_argument_values(self, data):
        """
        This function is used to get the argument values for
        function/procedure.
        :param data:
        :return:
        """
        proargtypes = [ptype for ptype in data['proargtypenames'].split(",")] \
            if data['proargtypenames'] else []
        proargmodes = data['proargmodes'] if data['proargmodes'] else \
            ['i'] * len(proargtypes)
        proargnames = data['proargnames'] if data['proargnames'] else []
        proargdefaultvals = [ptype for ptype in
                             data['proargdefaultvals'].split(",")] \
            if data['proargdefaultvals'] else []
        proallargtypes = data['proallargtypes'] \
            if data['proallargtypes'] else []

        return {'proargtypes': proargtypes, 'proargmodes': proargmodes,
                'proargnames': proargnames,
                'proargdefaultvals': proargdefaultvals,
                'proallargtypes': proallargtypes}

    def _params_list_for_display(self, proargmodes_fltrd, proargtypes,
                                 proargnames, proargdefaultvals):
        """
        This function is used to prepare dictionary of arguments to
        display on UI.
        :param proargmodes_fltrd:
        :param proargtypes:
        :param proargnames:
        :param proargdefaultvals:
        :return:
        """
        # Insert null value against the parameters which do not have
        # default values.
        if len(proargmodes_fltrd) > len(proargdefaultvals):
            dif = len(proargmodes_fltrd) - len(proargdefaultvals)
            while dif > 0:
                proargdefaultvals.insert(0, '')
                dif -= 1

        param = {"arguments": [
            self._map_arguments_dict(
                i, proargmodes_fltrd[i] if len(proargmodes_fltrd) > i else '',
                proargtypes[i] if len(proargtypes) > i else '',
                proargnames[i] if len(proargnames) > i else '',
                proargdefaultvals[i] if len(proargdefaultvals) > i else ''
            )
            for i in range(len(proargtypes))]}
        return param

    def _display_properties_argument_list(self, proargmodes_fltrd,
                                          proargtypes, proargnames,
                                          proargdefaultvals):
        """
        This function is used to prepare list of arguments to display on UI.
        :param proargmodes_fltrd:
        :param proargtypes:
        :param proargnames:
        :param proargdefaultvals:
        :return:
        """
        proargs = [self._map_arguments_list(
            proargmodes_fltrd[i] if len(proargmodes_fltrd) > i else '',
            proargtypes[i] if len(proargtypes) > i else '',
            proargnames[i] if len(proargnames) > i else '',
            proargdefaultvals[i] if len(proargdefaultvals) > i else ''
        )
            for i in range(len(proargtypes))]

        return proargs

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
                    # proargtypes: Argument Types (Data Type)
                    # proargmodes: Argument Modes [IN, OUT, INOUT, VARIADIC]
                    # proargnames: Argument Name
                    # proargdefaultvals: Default Value of the Argument
        """
        arguments = self._get_argument_values(data)
        proargtypes = arguments['proargtypes']
        proargmodes = arguments['proargmodes']
        proargnames = arguments['proargnames']
        proargdefaultvals = arguments['proargdefaultvals']
        proallargtypes = arguments['proallargtypes']

        proargmodenames = {
            'i': 'IN', 'o': 'OUT', 'b': 'INOUT', 'v': 'VARIADIC', 't': 'TABLE'
        }

        # We need to put default parameter at proper location in list
        # Total number of default parameters
        total_default_parameters = len(proargdefaultvals)

        # Total number of parameters
        total_parameters = len(proargtypes)

        # Parameters which do not have default parameters
        non_default_parameters = total_parameters - total_default_parameters

        # only if we have at least one parameter with default value
        if total_default_parameters > 0 and non_default_parameters > 0:
            for idx in range(non_default_parameters):
                # Set null value for parameter non-default parameter
                proargdefaultvals.insert(idx, '')

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
                sql = render_template("/".join([self.sql_template_path,
                                                'get_out_types.sql']),
                                      out_arg_oid=proallargtypes[cnt])
                status, out_arg_type = self.conn.execute_scalar(sql)
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

        # Prepare list of Argument list dict to be displayed in the Data Grid.
        params = self._params_list_for_display(proargmodes_fltrd, proargtypes,
                                               proargnames, proargdefaultvals)

        # Prepare string formatted Argument to be displayed in the Properties
        # panel.
        proargs = self._display_properties_argument_list(proargmodes_fltrd,
                                                         proargtypes,
                                                         proargnames,
                                                         proargdefaultvals)

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

        if argmode:
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

        res = [{'label': '', 'value': ''}]
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
                                    data=self.request)
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
            name=self.request['name']
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
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [fnid]}

        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

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
                                    data=self.request, fnid=fnid)
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

        resp_data = self._fetch_properties(gid, sid, did, scid, fnid)
        # Most probably this is due to error
        if not isinstance(resp_data, dict):
            return resp_data

        # Fetch the function definition.
        args = u''
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

            sql = render_template("/".join([self.sql_template_path,
                                            self._GET_DEFINITION_SQL]
                                           ), data=resp_data,
                                  fnid=fnid, scid=scid)

            status, res = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=res)

            # Add newline and tab before each argument to format
            name_with_default_args = self.qtIdent(
                self.conn,
                res['rows'][0]['nspname'],
                res['rows'][0]['proname']
            ) + '(\n\t' + res['rows'][0]['func_args'].\
                replace(', ', ',\n\t') + ')'

            # Parse privilege data
            self._parse_privilege_data(resp_data)

            # Generate sql for "SQL panel"
            # func_def is procedure signature with default arguments
            # query_for - To distinguish the type of call
            func_def = render_template("/".join([self.sql_template_path,
                                                 self._CREATE_SQL]),
                                       data=resp_data, query_type="create",
                                       func_def=name_with_default_args,
                                       query_for="sql_panel")
        else:
            object_type = 'function'

            # Get Schema Name from its OID.
            self._get_schema_name_from_oid(resp_data)

            # Parse privilege data
            self._parse_privilege_data(resp_data)

            sql = render_template("/".join([self.sql_template_path,
                                            self._GET_DEFINITION_SQL]
                                           ), data=resp_data,
                                  fnid=fnid, scid=scid)

            status, res = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=res)

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
                                       query_for="sql_panel")

        sql_header = u"""-- {0}: {1}.{2}({3})\n\n""".format(
            object_type.upper(), resp_data['pronamespace'],
            resp_data['proname'],
            resp_data['proargtypenames'].lstrip('(').rstrip(')'))
        sql_header += """-- DROP {0} {1}({2});\n\n""".format(
            object_type.upper(), self.qtIdent(
                self.conn, resp_data['pronamespace'], resp_data['proname']),
            resp_data['proargtypenames'].lstrip('(').rstrip(')'))

        if not json_resp:
            return re.sub('\n{2,}', '\n\n', func_def)

        sql = sql_header + func_def
        sql = re.sub('\n{2,}', '\n\n', sql)

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

        if status:
            sql = re.sub('\n{2,}', '\n\n', sql)
            return make_json_response(
                data=sql,
                status=200
            )
        else:
            sql = re.sub('\n{2,}', '\n\n', sql)
            return sql

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
                               vol_dict):
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
            )

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
                           'arguments', 'prorows', 'prosupportfunc']

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

        self.reformat_prosrc_code(data)

        sql = render_template(
            "/".join([self.sql_template_path, self._UPDATE_SQL]),
            data=data, o_data=old_data
        )
        return sql

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

        vol_dict = {'v': 'VOLATILE', 's': 'STABLE', 'i': 'IMMUTABLE'}
        parallel_dict = {'u': 'UNSAFE', 's': 'SAFE', 'r': 'RESTRICTED'}

        # Get Schema Name from its OID.
        self._get_schema_name_from_oid(data)

        if 'provolatile' in data:
            data['provolatile'] = vol_dict[data['provolatile']]\
                if data['provolatile'] else ''

        if fnid is not None:
            # Edit Mode

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
            sql = self._get_sql_for_edit_mode(data, parallel_dict,
                                              all_ids_dict, vol_dict)
        else:
            # Parse Privileges
            self._parse_privilege_data(data)

            args = u''
            args_without_name = []

            args_list = []
            if 'arguments' in data and len(data['arguments']) > 0:
                args_list = data['arguments']
            elif 'args' in data and len(data['args']) > 0:
                args_list = data['args']

            self._get_arguments(args_list, args, args_without_name)

            data['func_args'] = args.strip(' ')

            data['func_args_without'] = ', '.join(args_without_name)

            self.reformat_prosrc_code(data)

            # Create mode
            sql = render_template("/".join([self.sql_template_path,
                                            self._CREATE_SQL]),
                                  data=data, is_sql=is_sql)
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
        frmtd_params, frmtd_proargs = self._format_arguments_from_db(resp_data)
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
        if fnid <= self.manager.db_info[did]['datlastsysoid']:
            resp_data['sysfunc'] = True

        # Set System Functions Status
        resp_data['sysproc'] = False
        if fnid <= self.manager.db_info[did]['datlastsysoid']:
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

        name = self.qtIdent(
            self.conn, res['rows'][0]['nspname'],
            res['rows'][0]['proname']
        ) + '(' + res['rows'][0]['func_with_identity_arguments'] + ')'

        # Fetch only arguments
        arg_string = name[name.rfind('('):].strip('(').strip(')')
        if len(arg_string) > 0:
            args = arg_string.split(',')
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

        name = resp_data['pronamespace'] + "." + resp_data['name_with_args']

        # Fetch only arguments
        if name.rfind('(') != -1:
            args = name[name.rfind('('):].strip('(').strip(')').split(',')
            # Remove unwanted spaces from arguments
            args = [arg.strip(' ') for arg in args]

            # Remove duplicate and then format arguments
            for arg in list(set(args)):
                formatted_arg = '\n\t<' + arg + '>'
                name = name.replace(arg, formatted_arg)

            name = name.replace(')', '\n)')
        else:
            name += '()'

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

        if data:
            status, sql = self._get_sql(gid=gid, sid=sid, did=did, scid=scid,
                                        data=data, fnid=oid, is_sql=False,
                                        is_schema_diff=True)
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

            data['prosrc'] = re.sub(r"^\s+", '',
                                    re.sub(r"\s+$", '',
                                           data['prosrc']))

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
                                            self._NODE_SQL]), scid=scid)
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
        super(ProcedureModule, self).__init__(*args, **kwargs)

        self.min_ver = 110000
        self.max_ver = None
        self.min_ppasver = 90100
        self.min_gpdbver = 1000000000
        self.server_type = ['pg', 'ppas']

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
        return databases.DatabaseModule.node_type


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
        super(TriggerFunctionModule, self).__init__(*args, **kwargs)

        self.min_ver = 90100
        self.max_ver = None
        self.min_gpdbver = 1000000000

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
        return databases.DatabaseModule.node_type


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


SchemaDiffRegistry(trigger_function_blueprint.node_type, TriggerFunctionView)
TriggerFunctionView.register_node_view(trigger_function_blueprint)
