##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import re
from functools import wraps

import pgadmin.browser.server_groups as sg
import simplejson as json
from flask import render_template, request, jsonify, current_app
from flask_babel import gettext as _
import dateutil.parser as dateutil_parser
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, precondition_required, \
    internal_server_error, forbidden, success_return, gone
from pgadmin.utils.driver import get_driver
from pgadmin.utils.constants import ERROR_FETCHING_ROLE_INFORMATION
from pgadmin.utils.exception import ExecuteError

from config import PG_DEFAULT_DRIVER
from flask_babel import gettext

_REASSIGN_OWN_SQL = 'reassign_own.sql'


class RoleModule(CollectionNodeModule):
    _NODE_TYPE = 'role'
    _COLLECTION_LABEL = _("Login/Group Roles")

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None

        super().__init__(*args, **kwargs)

    def get_nodes(self, gid, sid):
        """
        Generate the collection node
        """
        if self.show_node:
            yield self.generate_browser_collection_node(sid)

    @property
    def node_inode(self):
        """
        Override this property to make the node as leaf node.
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the server-group node is
        initialized.
        """
        return sg.ServerGroupModule.node_type

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                self._COLLECTION_CSS,
                node_type=self.node_type
            ),
            render_template("roles/css/role.css")]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = RoleModule(__name__)


class RoleView(PGChildNodeView):
    node_type = 'role'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'}
    ]
    ids = [
        {'type': 'int', 'id': 'rid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'drop', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'drop'},
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'children': [{'get': 'children'}],
        'vopts': [{}, {'get': 'voptions'}],
        'variables': [{'get': 'variables'}],
        'reassign': [{'get': 'get_reassign_own_sql',
                      'post': 'role_reassign_own'}]
    })

    def _validate_input_dict_for_new(self, data, req_keys):
        """
        This functions validates the input dict and check for required
        keys in the dict when creating a new object
        :param data: input dict
        :param req_keys: required keys
        :return: Valid or Invalid
        """
        if not isinstance(data, list):
            return False

        for item in data:
            if not isinstance(item, dict):
                return False

            for a_key in req_keys:
                if a_key not in item:
                    return False

        return True

    def _validate_input_dict_for_update(
            self, data, req_add_keys, req_delete_keys):
        """
        This functions validates the input dict and check for required
        keys in the dict when updating an existing object
        :param data: input dict
        :param req_add_keys: required keys when adding, updating
        :param req_delete_keys: required keys when deleting
        :return: Valid or Invalid
        """
        if not isinstance(data, dict):
            return False

        for op in ['added', 'deleted', 'changed']:
            op_data = data.get(op, [])
            check_keys = req_add_keys \
                if op in ['added', 'changed'] else req_delete_keys
            if not self._validate_input_dict_for_new(op_data, check_keys):
                return False

        return True

    def _validate_rolvaliduntil(self, data):
        """
        Validate the rolvaliduntil in input data dict
        :param data: role data
        :return: valid or invalid message
        """
        if 'rolvaliduntil' in data:
            # Make date explicit so that it works with every
            # postgres database datestyle format
            try:
                if data['rolvaliduntil'] is not None and \
                    data['rolvaliduntil'] != '' and \
                        len(data['rolvaliduntil']) > 0:
                    data['rolvaliduntil'] = dateutil_parser.parse(
                        data['rolvaliduntil']
                    ).isoformat()
            except Exception:
                return _("Date format is invalid.")

        return None

    def _validate_rolconnlimit(self, data):
        """
        Validate the rolconnlimit data dict
        :param data: role data
        :return: valid or invalid message
        """
        if 'rolconnlimit' in data:
            # If roleconnlimit is empty string then set it to -1
            if data['rolconnlimit'] == '':
                data['rolconnlimit'] = -1

            if data['rolconnlimit'] is not None:
                data['rolconnlimit'] = int(data['rolconnlimit'])
                if not isinstance(data['rolconnlimit'], int) or \
                        data['rolconnlimit'] < -1:
                    return _("Connection limit must be an integer value "
                             "or equal to -1.")
        return None

    def _process_rolemembership(self, id, data):
        """
        Process the input rolemembership list to appropriate keys
        :param id: id of role
        :param data: input role data
        """
        def _part_dict_list(dict_list, condition, list_key=None):
            ret_val = []
            for d in dict_list:
                if condition(d):
                    ret_val.append(d[list_key])

            return ret_val

        if id == -1:
            data['members'] = []
            data['admins'] = []

            data['admins'] = _part_dict_list(
                data['rolmembership'], lambda d: d['admin'], 'role')
            data['members'] = _part_dict_list(
                data['rolmembership'], lambda d: not d['admin'], 'role')
        else:
            data['admins'] = _part_dict_list(
                data['rolmembership'].get('added', []),
                lambda d: d['admin'], 'role')
            data['members'] = _part_dict_list(
                data['rolmembership'].get('added', []),
                lambda d: not d['admin'], 'role')

            data['admins'].extend(_part_dict_list(
                data['rolmembership'].get('changed', []),
                lambda d: d['admin'], 'role'))
            data['revoked_admins'] = _part_dict_list(
                data['rolmembership'].get('changed', []),
                lambda d: not d['admin'], 'role')

            data['revoked'] = _part_dict_list(
                data['rolmembership'].get('deleted', []),
                lambda _: True, 'role')

    def _process_rolmembers(self, id, data):
        """
        Parser role members.
        :param id:
        :param data:
        """
        def _part_dict_list(dict_list, condition, list_key=None):
            ret_val = []
            for d in dict_list:
                if condition(d):
                    ret_val.append(d[list_key])

            return ret_val
        if id == -1:
            data['rol_members'] = []
            data['rol_admins'] = []

            data['rol_admins'] = _part_dict_list(
                data['rolmembers'], lambda d: d['admin'], 'role')
            data['rol_members'] = _part_dict_list(
                data['rolmembers'], lambda d: not d['admin'], 'role')
        else:
            data['rol_admins'] = _part_dict_list(
                data['rolmembers'].get('added', []),
                lambda d: d['admin'], 'role')
            data['rol_members'] = _part_dict_list(
                data['rolmembers'].get('added', []),
                lambda d: not d['admin'], 'role')

            data['rol_admins'].extend(_part_dict_list(
                data['rolmembers'].get('changed', []),
                lambda d: d['admin'], 'role'))
            data['rol_revoked_admins'] = _part_dict_list(
                data['rolmembers'].get('changed', []),
                lambda d: not d['admin'], 'role')

            data['rol_revoked'] = _part_dict_list(
                data['rolmembers'].get('deleted', []),
                lambda _: True, 'role')

    def _validate_rolemembers(self, id, data):
        """
        Validate the rolmembers data dict
        :param data: role data
        :return: valid or invalid message
        """
        if 'rolmembers' not in data:
            return None

        if id == -1:
            msg = _("""
Role members information must be passed as an array of JSON objects in the
following format:

rolmembers:[{
    role: [rolename],
    admin: True/False
    },
    ...
]""")

            if not self._validate_input_dict_for_new(data['rolmembers'],
                                                     ['role', 'admin']):
                return msg

            self._process_rolmembers(id, data)
            return None

        msg = _("""
Role membership information must be passed as a string representing an array of
JSON objects in the following format:
rolmembers:{
    'added': [{
        role: [rolename],
        admin: True/False
        },
        ...
        ],
    'deleted': [{
        role: [rolename],
        admin: True/False
        },
        ...
        ],
    'updated': [{
        role: [rolename],
        admin: True/False
        },
        ...
        ]
""")
        if not self._validate_input_dict_for_update(data['rolmembers'],
                                                    ['role', 'admin'],
                                                    ['role']):
            return msg

        self._process_rolmembers(id, data)
        return None

    def _validate_rolemembership(self, id, data):
        """
        Validate the rolmembership data dict
        :param data: role data
        :return: valid or invalid message
        """
        if 'rolmembership' not in data:
            return None

        if id == -1:
            msg = _("""
Role membership information must be passed as an array of JSON objects in the
following format:

rolmembership:[{
    role: [rolename],
    admin: True/False
    },
    ...
]""")

            if not self._validate_input_dict_for_new(
                    data['rolmembership'], ['role', 'admin']):
                return msg

            self._process_rolemembership(id, data)
            return None

        msg = _("""
Role membership information must be passed as a string representing an array of
JSON objects in the following format:
rolmembership:{
    'added': [{
        role: [rolename],
        admin: True/False
        },
        ...
        ],
    'deleted': [{
        role: [rolename],
        admin: True/False
        },
        ...
        ],
    'updated': [{
        role: [rolename],
        admin: True/False
        },
        ...
        ]
""")
        if not self._validate_input_dict_for_update(
                data['rolmembership'], ['role', 'admin'], ['role']):
            return msg

        self._process_rolemembership(id, data)
        return None

    def _validate_seclabels(self, id, data):
        """
        Validate the seclabels data dict
        :param data: role data
        :return: valid or invalid message
        """
        if 'seclabels' not in data or self.manager.version < 90200:
            return None

        if id == -1:
            msg = _("""
Security Label must be passed as an array of JSON objects in the following
format:
seclabels:[{
    provider: <provider>,
    label: <label>
    },
    ...
]""")
            if not self._validate_input_dict_for_new(
                    data['seclabels'], ['provider', 'label']):
                return msg

            return None

        msg = _("""
Security Label must be passed as an array of JSON objects in the following
format:
seclabels:{
    'added': [{
        provider: <provider>,
        label: <label>
        },
        ...
        ],
    'deleted': [{
        provider: <provider>,
        label: <label>
        },
        ...
        ],
    'updated': [{
        provider: <provider>,
        label: <label>
        },
        ...
        ]
""")
        if not self._validate_input_dict_for_update(
                data['seclabels'], ['provider', 'label'], ['provider']):
            return msg

        return None

    def _validate_variables(self, id, data):
        """
        Validate the variables data dict
        :param data: role data
        :return: valid or invalid message
        """
        if 'variables' not in data:
            return None

        if id == -1:
            msg = _("""
Configuration parameters/variables must be passed as an array of JSON objects
in the following format in create mode:
variables:[{
database: <database> or null,
name: <configuration>,
value: <value>
},
...
]""")
            if not self._validate_input_dict_for_new(
                    data['variables'], ['name', 'value']):
                return msg

            return None

        msg = _("""
Configuration parameters/variables must be passed as an array of JSON objects
in the following format in update mode:
rolmembership:{
'added': [{
    database: <database> or null,
    name: <configuration>,
    value: <value>
    },
    ...
    ],
'deleted': [{
    database: <database> or null,
    name: <configuration>,
    value: <value>
    },
    ...
    ],
'updated': [{
    database: <database> or null,
    name: <configuration>,
    value: <value>
    },
    ...
    ]
""")
        if not self._validate_input_dict_for_update(
                data['variables'], ['name', 'value'], ['name']):
            return msg
        return None

    def _validate_rolname(self, id, data):
        """
        Validate the rolname data dict
        :param data: role data
        :return: valid or invalid message
        """
        if (id == -1) and 'rolname' not in data:
            return precondition_required(
                _("Name must be specified.")
            )
        return None

    def validate_request(f):
        @wraps(f)
        def wrap(self, **kwargs):
            if request.data:
                data = json.loads(request.data, encoding='utf-8')
            else:
                data = dict()
                req = request.args or request.form

                for key in req:

                    val = req[key]
                    if key in [
                        'rolcanlogin', 'rolsuper', 'rolcreatedb',
                        'rolcreaterole', 'rolinherit', 'rolreplication',
                        'rolcatupdate', 'variables', 'rolmembership',
                        'seclabels', 'rolmembers'
                    ]:
                        data[key] = json.loads(val, encoding='utf-8')
                    else:
                        data[key] = val

            invalid_msg_arr = [
                self._validate_rolname(kwargs.get('rid', -1), data),
                self._validate_rolvaliduntil(data),
                self._validate_rolconnlimit(data),
                self._validate_rolemembership(kwargs.get('rid', -1), data),
                self._validate_seclabels(kwargs.get('rid', -1), data),
                self._validate_variables(kwargs.get('rid', -1), data),
                self._validate_rolemembers(kwargs.get('rid', -1), data)
            ]

            for invalid_msg in invalid_msg_arr:
                if invalid_msg is not None:
                    return precondition_required(invalid_msg)

            self.request = data

            return f(self, **kwargs)

        return wrap

    @staticmethod
    def _check_action(action, kwargs):
        check_permission = False
        fetch_name = False
        forbidden_msg = None
        if action in ['drop', 'update']:
            if 'rid' in kwargs:
                fetch_name = True
                check_permission = True

            if action == 'drop':
                forbidden_msg = _(
                    "The current user does not have permission to drop"
                    " the role."
                )
            else:
                forbidden_msg = _(
                    "The current user does not have permission to "
                    "update the role."
                )
        elif action == 'create':
            check_permission = True
            forbidden_msg = _(
                "The current user does not have permission to create "
                "the role."
            )
        elif action == 'msql' and 'rid' in kwargs:
            fetch_name = True

        return fetch_name, check_permission, forbidden_msg

    def _check_permission(self, check_permission, action, kwargs):
        if check_permission:
            user = self.manager.user_info

            if not user['is_superuser'] and \
                not user['can_create_role'] and \
                (action != 'update' or 'rid' in kwargs) and \
                kwargs['rid'] != -1 and \
                    user['id'] != kwargs['rid']:
                return True
        return False

    def _check_and_fetch_name(self, fetch_name, kwargs):
        if fetch_name:
            status, res = self.conn.execute_dict(
                render_template(
                    self.sql_path + 'permission.sql',
                    rid=kwargs['rid'],
                    conn=self.conn
                )
            )

            if not status:
                return True, internal_server_error(
                    _(
                        "Error retrieving the role information.\n{0}"
                    ).format(res)
                )

            if len(res['rows']) == 0:
                return True, gone(
                    _("Could not find the role on the database "
                      "server.")
                )

            row = res['rows'][0]

            self.role = row['rolname']
            self.rolCanLogin = row['rolcanlogin']
            self.rolCatUpdate = row['rolcatupdate']
            self.rolSuper = row['rolsuper']

        return False, ''

    def check_precondition(action=None):
        """
        This function will behave as a decorator which will checks the status
        of the database connection for the maintainance database of the server,
        beforeexecuting rest of the operation for the wrapped function. It will
        also attach manager, conn (maintenance connection for the server) as
        properties of the instance.
        """

        def wrap(f):
            @wraps(f)
            def wrapped(self, **kwargs):
                self.manager = get_driver(
                    PG_DEFAULT_DRIVER
                ).connection_manager(
                    kwargs['sid']
                )
                self.conn = self.manager.connection()

                driver = get_driver(PG_DEFAULT_DRIVER)
                self.qtIdent = driver.qtIdent

                if not self.conn.connected():
                    return precondition_required(
                        _("Connection to the server has been lost.")
                    )

                self.datistemplate = False
                if (
                    self.manager.db_info is not None and
                    self.manager.did in self.manager.db_info and
                    'datistemplate' in self.manager.db_info[self.manager.did]
                ):
                    self.datistemplate = self.manager.db_info[
                        self.manager.did]['datistemplate']

                self.sql_path = 'roles/sql/#{0}#'.format(self.manager.version)

                self.alterKeys = [
                    'rolcanlogin', 'rolsuper', 'rolcreatedb',
                    'rolcreaterole', 'rolinherit', 'rolreplication',
                    'rolconnlimit', 'rolvaliduntil', 'rolpassword'
                ] if self.manager.version >= 90200 else [
                    'rolcanlogin', 'rolsuper', 'rolcreatedb',
                    'rolcreaterole', 'rolinherit', 'rolconnlimit',
                    'rolvaliduntil', 'rolpassword'
                ]

                fetch_name, check_permission, \
                    forbidden_msg = RoleView._check_action(action, kwargs)

                is_permission_error = self._check_permission(check_permission,
                                                             action, kwargs)
                if is_permission_error:
                    return forbidden(forbidden_msg)

                is_error, errmsg = self._check_and_fetch_name(fetch_name,
                                                              kwargs)
                if is_error:
                    return errmsg

                return f(self, **kwargs)

            return wrapped

        return wrap

    @check_precondition(action='list')
    def list(self, gid, sid):
        status, res = self.conn.execute_dict(
            render_template(
                self.sql_path + self._PROPERTIES_SQL
            )
        )

        if not status:
            return internal_server_error(
                _(ERROR_FETCHING_ROLE_INFORMATION + "\n{0}").format(res))

        self.transform(res)

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition(action='nodes')
    def nodes(self, gid, sid):

        status, rset = self.conn.execute_2darray(
            render_template(self.sql_path + self._NODES_SQL)
        )

        if not status:
            return internal_server_error(
                _(ERROR_FETCHING_ROLE_INFORMATION + "\n{0}").format(rset))

        res = []
        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'], sid,
                    row['rolname'],
                    'icon-role' if row['rolcanlogin'] else 'icon-group',
                    can_login=row['rolcanlogin'],
                    is_superuser=row['rolsuper']
                )
            )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition(action='node')
    def node(self, gid, sid, rid):

        status, rset = self.conn.execute_2darray(
            render_template(
                self.sql_path + self._NODES_SQL,
                rid=rid
            )
        )

        if not status:
            return internal_server_error(
                _(
                    ERROR_FETCHING_ROLE_INFORMATION + "\n{0}").format(rset))

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'], sid,
                    row['rolname'],
                    'icon-role' if row['rolcanlogin'] else 'icon-group',
                    can_login=row['rolcanlogin'],
                    is_superuser=row['rolsuper']
                ),
                status=200
            )

        return gone()

    def _set_seclabels(self, row):

        if 'seclabels' in row and row['seclabels'] is not None:
            res = []
            for sec in row['seclabels']:
                sec = re.search(r'([^=]+)=(.*$)', sec)
                res.append({
                    'provider': sec.group(1),
                    'label': sec.group(2)
                })
            row['seclabels'] = res

    def _set_rolemembership(self, row):

        if 'rolmembers' in row:
            rolmembers = []
            for role in row['rolmembers']:
                role = re.search(r'([01])(.+)', role)
                rolmembers.append({
                    'role': role.group(2),
                    'admin': True if role.group(1) == '1' else False
                })
            row['rolmembers'] = rolmembers

    def transform(self, rset):
        for row in rset['rows']:
            res = []
            roles = row['rolmembership']
            row['rolpassword'] = ''
            for role in roles:
                role = re.search(r'([01])(.+)', role)
                res.append({
                    'role': role.group(2),
                    'admin': True if role.group(1) == '1' else False
                })
            row['rolmembership'] = res
            self._set_seclabels(row)
            self._set_rolemembership(row)

    @check_precondition(action='properties')
    def properties(self, gid, sid, rid):

        status, res = self.conn.execute_dict(
            render_template(
                self.sql_path + self._PROPERTIES_SQL,
                rid=rid
            )
        )

        variables = self.variables(None, None, rid)
        if not status:
            return internal_server_error(
                _(ERROR_FETCHING_ROLE_INFORMATION + "\n{0}").format(res))

        self.transform(res)
        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
            self.datistemplate)
        res = {**res['rows'][0], 'variables': variables['rows']}
        return ajax_response(
            response=res,
            status=200
        )

    @check_precondition(action='drop')
    def drop(self, gid, sid, rid=None):

        if rid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [rid]}

        for rid in data['ids']:
            status, res = self.conn.execute_dict(
                render_template(
                    self.sql_path + 'permission.sql',
                    rid=rid,
                    conn=self.conn
                )
            )

            if not status:
                return internal_server_error(
                    _(
                        "Error retrieving the role information.\n{0}"
                    ).format(res)
                )

            if len(res['rows']) == 0:
                return gone(
                    _("Could not find the role on the database "
                      "server.")
                )

            row = res['rows'][0]

            status, res = self.conn.execute_2darray(
                "DROP ROLE {0};".format(self.qtIdent(self.conn,
                                                     row['rolname']))
            )
            if not status:
                return internal_server_error(
                    _("Could not drop the role.\n{0}").format(res)
                )

        return success_return()

    @check_precondition()
    def sql(self, gid, sid, rid):
        show_password = self.conn.manager.user_info['is_superuser']
        status, res = self.conn.execute_scalar(
            render_template(
                self.sql_path + 'sql.sql', show_password=show_password
            ),
            dict({'rid': rid})
        )

        if not status:
            return internal_server_error(
                _("Could not generate reversed engineered query for the "
                  "role.\n{0}").format(
                    res
                )
            )

        if res is None or (len(res) == 0):
            return gone(
                _("Could not generate reversed engineered query for the role.")
            )

        return ajax_response(response=res.strip('\n'))

    @check_precondition(action='create')
    @validate_request
    def create(self, gid, sid):

        sql = render_template(
            self.sql_path + self._CREATE_SQL,
            data=self.request,
            dummy=False,
            conn=self.conn
        )

        status, msg = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(
                _("Could not create the role.\n{0}").format(msg)
            )

        status, rid = self.conn.execute_scalar(
            "SELECT oid FROM pg_catalog.pg_roles WHERE rolname = %(rolname)s",
            {'rolname': self.request['rolname']}
        )

        if not status:
            return internal_server_error(
                _(ERROR_FETCHING_ROLE_INFORMATION + "\n{0}").format(msg))

        status, rset = self.conn.execute_dict(
            render_template(self.sql_path + self._NODES_SQL,
                            rid=rid
                            )
        )

        if not status:
            return internal_server_error(
                _(
                    ERROR_FETCHING_ROLE_INFORMATION + "\n{0}").format(rset))
        for row in rset['rows']:
            return jsonify(
                node=self.blueprint.generate_browser_node(
                    rid, sid,
                    row['rolname'],
                    'icon-role' if row['rolcanlogin'] else 'icon-group',
                    can_login=row['rolcanlogin']
                )
            )

        return gone(self.not_found_error_msg())

    @check_precondition(action='update')
    @validate_request
    def update(self, gid, sid, rid):

        sql = render_template(
            self.sql_path + self._UPDATE_SQL,
            data=self.request,
            dummy=False,
            conn=self.conn,
            role=self.role,
            rolCanLogin=self.rolCanLogin,
            rolCatUpdate=self.rolCatUpdate,
            rolSuper=self.rolSuper,
            alterKeys=self.alterKeys
        )

        status, msg = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(
                _("Could not create the role.\n{0}").format(msg)
            )

        status, rset = self.conn.execute_dict(
            render_template(self.sql_path + self._NODES_SQL,
                            rid=rid
                            )
        )

        if not status:
            return internal_server_error(
                _(ERROR_FETCHING_ROLE_INFORMATION + "\n{0}").format(rset))

        for row in rset['rows']:
            return jsonify(
                node=self.blueprint.generate_browser_node(
                    rid, sid,
                    row['rolname'],
                    'icon-role' if row['rolcanlogin'] else 'icon-group',
                    can_login=row['rolcanlogin'],
                    is_superuser=row['rolsuper']
                )
            )

        return gone(self.not_found_error_msg())

    @check_precondition(action='msql')
    @validate_request
    def msql(self, gid, sid, rid=None):
        if rid is None:
            return make_json_response(
                data=render_template(
                    self.sql_path + self._CREATE_SQL,
                    data=self.request,
                    dummy=True,
                    conn=self.conn
                ).strip('\n')
            )
        else:
            return make_json_response(
                data=render_template(
                    self.sql_path + self._UPDATE_SQL,
                    data=self.request,
                    dummy=True,
                    conn=self.conn,
                    role=self.role,
                    rolCanLogin=self.rolCanLogin,
                    rolCatUpdate=self.rolCatUpdate,
                    rolSuper=self.rolSuper,
                    alterKeys=self.alterKeys
                ).strip('\n')
            )

    @check_precondition()
    def dependencies(self, gid, sid, rid):
        """
        This function gets the dependencies and returns an ajax response
        for the role.

        Args:
            gid: Server Group ID
            sid: Server ID
            rid: Role ID
        """
        dependencies_result = self.get_dependencies(self.conn, rid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition()
    def dependents(self, gid, sid, rid):
        """
        This function gets the dependents and returns an ajax response
        for the role.

        Args:
            gid: Server Group ID
            sid: Server ID
            rid: Role ID
        """
        dependents_result = self.get_dependents(self.conn, sid, rid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @staticmethod
    def _handle_dependents_type(types, type_str, type_name, rel_name, row):
        if types[type_str[0]] is None:
            if type_str[0] == 'i':
                type_name = 'index'
                rel_name = row['indname'] + ' ON ' + rel_name
            elif type_str[0] == 'o':
                type_name = 'operator'
                rel_name = row['relname']
        else:
            type_name = types[type_str[0]]

        return type_name, rel_name

    @staticmethod
    def _handle_dependents_data(result, types, dependents, db_row):
        for row in result['rows']:
            rel_name = row['nspname']
            if rel_name is not None:
                rel_name += '.'

            if rel_name is None:
                rel_name = row['relname']
            else:
                rel_name += row['relname']

            type_name = ''
            type_str = row['relkind']
            # Fetch the type name from the dictionary
            # if type is not present in the types dictionary then
            # we will continue and not going to add it.
            if type_str[0] in types:
                # if type is present in the types dictionary, but it's
                # value is None then it requires special handling.
                type_name, rel_name = RoleView._handle_dependents_type(
                    types, type_str, type_name, rel_name, row)
            else:
                continue

            dependents.append(
                {
                    'type': type_name,
                    'name': rel_name,
                    'field': db_row['datname']
                }
            )

    def _temp_connection_check(self, rid, temp_conn, db_row, types,
                               dependents):
        if temp_conn.connected():
            query = render_template(
                "/".join([self.sql_path, 'dependents.sql']),
                fetch_dependents=True, rid=rid,
                lastsysoid=self._DATABASE_LAST_SYSTEM_OID
            )

            status, result = temp_conn.execute_dict(query)
            if not status:
                current_app.logger.error(result)

            RoleView._handle_dependents_data(result, types, dependents, db_row)

    @staticmethod
    def _release_connection(is_connected, manager, db_row):
        # Release only those connections which we have created above.
        if not is_connected:
            manager.release(db_row['datname'])

    def get_dependents(self, conn, sid, rid):
        """
        This function is used to fetch the dependents for the selected node.

        Args:
            conn: Connection object
            sid: Server Id
            rid: Role Id.

        Returns: Dictionary of dependents for the selected node.
        """

        # Dictionary for the object types
        types = {
            # None specified special handling for this type
            'r': 'table',
            'i': None,
            'S': 'sequence',
            'v': 'view',
            'x': 'external_table',
            'p': 'function',
            'n': 'schema',
            'y': 'type',
            'd': 'domain',
            'T': 'trigger_function',
            'C': 'conversion',
            'o': None
        }

        query = render_template("/".join([self.sql_path, 'dependents.sql']),
                                fetch_database=True, rid=rid)
        status, db_result = self.conn.execute_dict(query)
        if not status:
            current_app.logger.error(db_result)

        dependents = list()

        # Get the server manager
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)

        for db_row in db_result['rows']:
            oid = db_row['datdba']
            if db_row['type'] == 'd':
                if rid == oid:
                    dependents.append(
                        {
                            'type': 'database',
                            'name': '',
                            'field': db_row['datname']
                        }
                    )
            else:
                dependents.append(
                    {
                        'type': 'tablespace',
                        'name': db_row['datname'],
                        'field': ''
                    }
                )

            # If connection to the database is not allowed then continue
            # with the next database
            if not db_row['datallowconn']:
                continue

            # Get the connection from the manager for the specified database.
            # Check the connect status and if it is not connected then create
            # a new connection to run the query and fetch the dependents.
            is_connected = True
            try:
                temp_conn = manager.connection(database=db_row['datname'])
                is_connected = temp_conn.connected()
                if not is_connected:
                    temp_conn.connect()
            except Exception as e:
                current_app.logger.exception(e)

            self._temp_connection_check(rid, temp_conn, db_row, types,
                                        dependents)
            RoleView._release_connection(is_connected, manager, db_row)

        return dependents

    # @check_precondition()
    def variables(self, gid, sid, rid, as_json=False):

        status, rset = self.conn.execute_dict(
            render_template(self.sql_path + 'variables.sql',
                            rid=rid
                            )
        )

        if not status:
            return internal_server_error(
                _(
                    "Error retrieving variable information for the role.\n{0}"
                ).format(rset)
            )
        if not as_json:
            return rset
        return make_json_response(
            data=rset['rows']
        )

    @check_precondition()
    def voptions(self, gid, sid):

        status, res = self.conn.execute_dict(
            """
SELECT
name, vartype, min_val, max_val, enumvals
FROM
(
SELECT
    'role'::text AS name, 'string'::text AS vartype,
    NULL AS min_val, NULL AS max_val, NULL::text[] AS enumvals
UNION ALL
SELECT
    name, vartype, min_val::numeric AS min_val, max_val::numeric AS max_val,
    enumvals
FROM
    pg_settings
WHERE
    context in ('user', 'superuser')
) a""")

        if not status:
            return internal_server_error(
                _(
                    "Error retrieving the variable options for the role.\n{0}"
                ).format(res)
            )
        return make_json_response(
            data=res['rows']
        )

    def _execute_role_reassign(self, conn, rid=None, data=None):

        """
        This function is used for executing reassign/drop
        query
        :param conn:
        :param rid:
        :param data:
        :return: status & result object
        """

        SQL = render_template(
            "/".join([self.sql_path, _REASSIGN_OWN_SQL]),
            rid=rid, data=data
        )
        status, res = conn.execute_scalar(SQL)

        if not status:
            raise ExecuteError(res)

        return status, res

    @check_precondition()
    def get_reassign_own_sql(self, gid, sid, rid):

        """
        This function is used to generate sql for reassign/drop role.

        Args:
            sid: Server ID
            rid: Role Id.

        Returns: Json object with sql generate
        """

        try:

            data = dict()

            if request.data:
                data = json.loads(request.data, encoding='utf-8')
            else:
                rargs = request.args or request.form
                for k, v in rargs.items():
                    try:
                        data[k] = json.loads(v, encoding='utf-8')
                    except ValueError:
                        data[k] = v

            required_args = ['role_op', 'did', 'old_role_name',
                             'new_role_name'] \
                if 'role_op' in data and data['role_op'] == 'reassign' \
                else ['role_op', 'did', 'drop_with_cascade']

            for arg in required_args:
                if arg not in data:
                    return make_json_response(
                        data=gettext("-- definition incomplete"),
                        status=200
                    )

            is_reassign = True if data['role_op'] == 'reassign' else False
            data['is_reassign'] = is_reassign

            sql = render_template(
                "/".join([self.sql_path, _REASSIGN_OWN_SQL]),
                data=data
            )

            return make_json_response(
                data=sql.strip('\n'),
                status=200
            )

        except Exception as e:
            return False, internal_server_error(errormsg=str(e))

    @check_precondition()
    def role_reassign_own(self, gid, sid, rid):

        """
        This function is used to reassign/drop role for the selected database.

        Args:
            sid: Server ID
            rid: Role Id.

        Returns: Json object with success/failure status
        """
        if request.data:
            data = json.loads(request.data, encoding='utf-8')
        else:
            data = request.args or request.form

        did = int(data['did'])
        is_already_connected = False
        can_disconn = True

        try:

            # Connect to the database where operation needs to carry out.
            from pgadmin.utils.driver import get_driver
            manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
            conn = manager.connection(did=did, auto_reconnect=True)
            is_already_connected = conn.connected()

            pg_db = self.manager.db_info[self.manager.did]

            if did == pg_db['did']:
                can_disconn = False

            # if database is not connected, try connecting it and get
            # the connection object.
            if not is_already_connected:
                status, errmsg = conn.connect()
                if not status:
                    current_app.logger.error(
                        "Could not connect to database(#{0}).\nError: {1}"
                        .format(
                            did, errmsg
                        )
                    )
                    return internal_server_error(errmsg)
                else:
                    current_app.logger.info(
                        'Connection Established for Database Id: \
                        %s' % did
                    )

            status, old_role_name = self._execute_role_reassign(conn, rid)

            data['old_role_name'] = old_role_name

            is_reassign = True if data['role_op'] == 'reassign' else False
            data['is_reassign'] = is_reassign

            # check whether role operation is to reassign or drop
            if is_reassign \
                and (data['new_role_name'] == 'CURRENT_USER' or
                     data['new_role_name'] == 'SESSION_USER' or
                     data['new_role_name'] == 'CURRENT_ROLE') is False:

                status, new_role_name = \
                    self._execute_role_reassign(conn, data['new_role_id'])

                data['new_role_name'] = new_role_name

            self._execute_role_reassign(conn, None, data)

            if is_already_connected is False and can_disconn:
                manager.release(did=did)

            return make_json_response(
                success=1,
                info=gettext("Reassign owned executed successfully!")
                if is_reassign
                else gettext("Drop owned executed successfully!")
            )

        except Exception as e:
            # Release Connection
            current_app.logger.exception(e)
            if is_already_connected is False and can_disconn:
                self.manager.release(did=did)

            return internal_server_error(errormsg=str(e))


RoleView.register_node_view(blueprint)
