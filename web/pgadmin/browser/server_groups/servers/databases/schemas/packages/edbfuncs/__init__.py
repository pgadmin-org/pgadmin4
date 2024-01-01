##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Edb Functions/Edb Procedures Node."""

import copy
import re
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
from pgadmin.utils.preferences import Preferences


class EdbFuncModule(CollectionNodeModule):
    """
    class EdbFuncModule(CollectionNodeModule):

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

    _NODE_TYPE = 'edbfunc'
    _COLLECTION_LABEL = gettext("Functions")

    def __init__(self, *args, **kwargs):
        """
        Initialize the Function Module.
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
        self.pref_show_node = self.browser_preference.register(
            'node', 'show_node_' + self.node_type,
            gettext('Package {0}').format(self.label), 'node',
            self.SHOW_ON_BROWSER, category_label=gettext('Nodes')
        )

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = EdbFuncModule(__name__)


class EdbFuncView(PGChildNodeView, DataTypeReader):
    """
    class EdbFuncView(PGChildNodeView, DataTypeReader)

    This class inherits PGChildNodeView and DataTypeReader to get the different
    routes for the module.

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

    * properties(gid, sid, did, scid, pkgid, edbfnid):
      - Returns the Functions properties.

    * sql(gid, sid, did, scid, pkgid, edbfnid):
      - Returns the SQL for the Functions object.

    * dependents(gid, sid, did, scid, ,pkgid, edbfnid):
      - Returns the dependents for the Functions object.

    * dependencies(gid, sid, did, scid, pkgid, edbfnid):
      - Returns the dependencies for the Functions object.

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
        {'type': 'int', 'id': 'edbfnid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties'},
            {'get': 'list'}
        ],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
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

            # Set template path for sql scripts depending
            # on the server version.
            template_initial = None
            if self.node_type == 'edbfunc':
                template_initial = 'edbfuncs'
            elif self.node_type == 'edbproc':
                template_initial = 'edbprocs'

            self.sql_template_path = "/".join([
                template_initial,
                self.manager.server_type,
                '#{0}#'
            ]).format(self.manager.version)

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
    def nodes(self, gid, sid, did, scid, pkgid, edbfnid=None):
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
            "/".join([self.sql_template_path, self._NODE_SQL]),
            pkgid=pkgid,
            fnid=edbfnid,
            conn=self.conn
        )
        status, rset = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        if edbfnid is not None:
            if len(rset['rows']) == 0:
                return gone(
                    errormsg=gettext("Could not find the function")
                )
            row = rset['rows'][0]
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    pkgid,
                    row['name'],
                    icon="icon-" + self.node_type,
                    funcowner=row['funcowner']
                ),
                status=200
            )

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    pkgid,
                    row['name'],
                    icon="icon-" + self.node_type,
                    funcowner=row['funcowner']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, pkgid, edbfnid=None):
        """
        Returns the Function properties.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            pkgid: Package Id
            edbfnid: Function Id
        """
        SQL = render_template("/".join([self.sql_template_path,
                                        self._PROPERTIES_SQL]),
                              pkgid=pkgid, edbfnid=edbfnid)
        status, res = self.conn.execute_dict(SQL)
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

        proargmodenames = {'i': 'IN', 'o': 'OUT', 'b': 'INOUT',
                           'v': 'VARIADIC', 't': 'TABLE'}

        # EPAS explicitly converts OUT to INOUT, So we always have proargtypes

        proargmodes_fltrd = copy.deepcopy(proargmodes)
        proargnames_fltrd = []
        cnt = 0
        for m in proargmodes:
            if m in ['v', 'o']:  # Out / Variadic Mode
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
        dif = len(proargmodes_fltrd) - len(proargdefaultvals)
        while dif > 0:
            proargdefaultvals.insert(0, '')
            dif -= 1

        def list_get(arr, index, default=''):
            return arr[index] if len(arr) > index else default

        # Prepare list of Argument list dict to be displayed in the Data Grid.
        params = {"arguments": [
            self._map_arguments_dict(
                i, list_get(proargmodes_fltrd, i),
                list_get(proargtypes, i),
                list_get(proargnames, i),
                list_get(proargdefaultvals, i)
            )
            for i in range(len(proargtypes))]}

        # Prepare string formatted Argument to be displayed in the Properties
        # panel.

        proargs = [self._map_arguments_list(
            list_get(proargmodes_fltrd, i),
            list_get(proargtypes, i),
            list_get(proargnames, i),
            list_get(proargdefaultvals, i)
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

        if argmode:
            arg += argmode + " "
        if argname:
            arg += argname + " "
        if argtype:
            arg += argtype + " "
        if argdef:
            arg += " DEFAULT " + argdef

        return arg.strip(" ")

    @check_precondition
    def sql(self, gid, sid, did, scid, pkgid, edbfnid=None):
        """
        Returns the SQL for the Function object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """
        SQL = render_template(
            "/".join([self.sql_template_path, 'get_body.sql']),
            edbfnid=edbfnid)

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the function in the database.")
            )

        body = res['rows'][0]['funcdef']

        if body is None:
            body = ''

        SQL = render_template("/".join([self.sql_template_path,
                                        'get_name.sql']),
                              edbfnid=edbfnid)

        status, name = self.conn.execute_scalar(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        sql = "-- Package {}: {}".format(
            'Function' if self.node_type == 'edbfunc' else 'Procedure',
            name)
        if body != '':
            sql += "\n\n"
            sql += body

        return ajax_response(response=sql)

    @check_precondition
    def dependents(self, gid, sid, did, scid, pkgid, edbfnid):
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
        dependents_result = self.get_dependents(self.conn, edbfnid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, pkgid, edbfnid):
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
        dependencies_result = self.get_dependencies(self.conn, edbfnid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @staticmethod
    def get_inner(sql):
        if sql is None:
            return None
        start = 0
        start_position = re.search(r"\s+[is|as]+\s+", sql, flags=re.I)

        if start_position:
            start = start_position.start() + 4

        try:
            end_position = [i for i in re.finditer("end", sql, flags=re.I)][-1]
            end = end_position.start()
        except IndexError:
            return sql[start:].strip("\n")

        return sql[start:end].strip("\n")


EdbFuncView.register_node_view(blueprint)


class EdbProcModule(CollectionNodeModule):
    """
    class EdbProcModule(CollectionNodeModule):

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

    _NODE_TYPE = 'edbproc'
    _COLLECTION_LABEL = gettext("Procedures")

    def __init__(self, *args, **kwargs):
        """
        Initialize the Procedure Module.
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
        Generate Procedures collection node.
        """
        yield self.generate_browser_collection_node(pkgid)

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
        return packages.PackageModule.node_type

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
        self.pref_show_node = self.browser_preference.register(
            'node', 'show_node_' + self.node_type,
            gettext('Package {0}').format(self.label), 'node',
            self.SHOW_ON_BROWSER, category_label=gettext('Nodes')
        )

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


procedure_blueprint = EdbProcModule(__name__)


class EdbProcView(EdbFuncView):
    node_type = procedure_blueprint.node_type


EdbProcView.register_node_view(procedure_blueprint)
