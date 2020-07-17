##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import re
from functools import wraps

import pgadmin.browser.server_groups as sg
import simplejson as json
from flask import render_template, request, jsonify, current_app
from flask_babelex import gettext as _
import dateutil.parser as dateutil_parser
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, precondition_required, \
    internal_server_error, forbidden, success_return, gone
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER


class RoleModule(CollectionNodeModule):
    _NODE_TYPE = 'role'
    _COLLECTION_LABEL = _("Login/Group Roles")

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None

        super(RoleModule, self).__init__(*args, **kwargs)

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
                "browser/css/collection.css",
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
            {'get': 'list', 'post': 'create', 'delete': 'drop'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'children': [{'get': 'children'}],
        'vopts': [{}, {'get': 'voptions'}],
        'variables': [{'get': 'variables'}],
    })

    @staticmethod
    def _get_request_data():
        """
        Get data from client request.
        """
        if request.data:
            data = json.loads(request.data, encoding='utf-8')
        else:
            data = dict()
            req = request.args or request.form

            for key in req:

                val = req[key]
                if key in [
                    u'rolcanlogin', u'rolsuper', u'rolcreatedb',
                    u'rolcreaterole', u'rolinherit', u'rolreplication',
                    u'rolcatupdate', u'variables', u'rolmembership',
                    u'seclabels'
                ]:
                    data[key] = json.loads(val, encoding='utf-8')
                else:
                    data[key] = val
        return data

    @staticmethod
    def _check_roleconnlimit(data):
        """
        Check connection limit for role.
        """
        if u'rolconnlimit' in data:
            # If roleconnlimit is empty string then set it to -1
            if data[u'rolconnlimit'] == '':
                data[u'rolconnlimit'] = -1

            if data[u'rolconnlimit'] is not None:
                data[u'rolconnlimit'] = int(data[u'rolconnlimit'])
                if type(data[u'rolconnlimit']) != int or \
                        data[u'rolconnlimit'] < -1:
                    return True, "Connection limit must be an integer value " \
                                 "or equal to -1."

        return False, ''

    @staticmethod
    def _check_role(data):
        """
        Check user role
        """
        msg = _("""
        Role membership information must be passed as an array of JSON objects
        in the following format:

        rolmembership:[{
            role: [rolename],
            admin: True/False
            },
            ...
        ]""")
        if type(data[u'rolmembership']) != list:
            return True, msg

        data[u'members'] = []
        data[u'admins'] = []

        for r in data[u'rolmembership']:
            if type(r) != dict or u'role' not in r or \
                    u'admin' not in r:
                return True, msg
            else:
                if r[u'admin']:
                    data[u'admins'].append(r[u'role'])
                else:
                    data[u'members'].append(r[u'role'])
        return False, ''

    @staticmethod
    def _check_precondition_added(data):
        """
        Check for pre condition for added
        """
        if u'added' in data[u'rolmembership']:
            roles = (data[u'rolmembership'])[u'added']

            if type(roles) != list:
                return True

            for r in roles:
                if type(r) != dict or \
                    u'role' not in r or \
                        u'admin' not in r:
                    return True

                if r[u'admin']:
                    data[u'admins'].append(r[u'role'])
                else:
                    data[u'members'].append(r[u'role'])
        return False

    @staticmethod
    def _check_precondition_deleted(data):
        if u'deleted' in data[u'rolmembership']:
            roles = (data[u'rolmembership'])[u'deleted']

            if type(roles) != list:
                return True

            for r in roles:
                if type(r) != dict or u'role' not in r:
                    return True

                data[u'revoked'].append(r[u'role'])

        return False

    @staticmethod
    def _check_precondition_change(data):
        if u'changed' in data[u'rolmembership']:
            roles = (data[u'rolmembership'])[u'changed']

            if type(roles) != list:
                return True

            for r in roles:
                if type(r) != dict or \
                    u'role' not in r or \
                        u'admin' not in r:
                    return True

                if not r[u'admin']:
                    data[u'revoked_admins'].append(r[u'role'])
                else:
                    data[u'admins'].append(r[u'role'])

        return False

    def validate_request(f):
        @wraps(f)
        def wrap(self, **kwargs):

            data = None
            if request.data:
                data = json.loads(request.data, encoding='utf-8')
            else:
                data = dict()
                req = request.args or request.form

                for key in req:

                    val = req[key]
                    if key in [
                        u'rolcanlogin', u'rolsuper', u'rolcreatedb',
                        u'rolcreaterole', u'rolinherit', u'rolreplication',
                        u'rolcatupdate', u'variables', u'rolmembership',
                        u'seclabels'
                    ]:
                        data[key] = json.loads(val, encoding='utf-8')
                    else:
                        data[key] = val

            if (u'rid' not in kwargs or kwargs['rid'] == -1) and \
                    u'rolname' not in data:
                return precondition_required(
                    _("Name must be specified.")
                )

            if u'rolvaliduntil' in data:
                # Make date explicit so that it works with every
                # postgres database datestyle format
                try:
                    if data[u'rolvaliduntil'] is not None and \
                            data[u'rolvaliduntil'] != '' and \
                            len(data[u'rolvaliduntil']) > 0:
                        data[u'rolvaliduntil'] = dateutil_parser.parse(
                            data[u'rolvaliduntil']
                        ).isoformat()
                except Exception:
                    return precondition_required(
                        _("Date format is invalid.")
                    )

            if u'rolconnlimit' in data:
                # If roleconnlimit is empty string then set it to -1
                if data[u'rolconnlimit'] == '':
                    data[u'rolconnlimit'] = -1

                if data[u'rolconnlimit'] is not None:
                    data[u'rolconnlimit'] = int(data[u'rolconnlimit'])
                    if type(data[u'rolconnlimit']) != int or \
                            data[u'rolconnlimit'] < -1:
                        return precondition_required(
                            _("Connection limit must be an integer value "
                              "or equal to -1.")
                        )

            if u'rolmembership' in data:
                if u'rid' not in kwargs or kwargs['rid'] == -1:
                    msg = _("""
Role membership information must be passed as an array of JSON objects in the
following format:

rolmembership:[{
    role: [rolename],
    admin: True/False
    },
    ...
]""")
                    if type(data[u'rolmembership']) != list:
                        return precondition_required(msg)

                    data[u'members'] = []
                    data[u'admins'] = []

                    for r in data[u'rolmembership']:
                        if type(r) != dict or u'role' not in r or \
                                u'admin' not in r:
                            return precondition_required(msg)
                        else:
                            if r[u'admin']:
                                data[u'admins'].append(r[u'role'])
                            else:
                                data[u'members'].append(r[u'role'])
                else:
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
                    if type(data[u'rolmembership']) != dict:
                        return precondition_required(msg)

                    data[u'members'] = []
                    data[u'admins'] = []
                    data[u'revoked_admins'] = []
                    data[u'revoked'] = []

                    if u'added' in data[u'rolmembership']:
                        roles = (data[u'rolmembership'])[u'added']

                        if type(roles) != list:
                            return precondition_required(msg)

                        for r in roles:
                            if type(r) != dict or \
                                    u'role' not in r or \
                                    u'admin' not in r:
                                return precondition_required(msg)

                            if r[u'admin']:
                                data[u'admins'].append(r[u'role'])
                            else:
                                data[u'members'].append(r[u'role'])

                    if u'deleted' in data[u'rolmembership']:
                        roles = (data[u'rolmembership'])[u'deleted']

                        if type(roles) != list:
                            return precondition_required(msg)

                        for r in roles:
                            if type(r) != dict or u'role' not in r:
                                return precondition_required(msg)

                            data[u'revoked'].append(r[u'role'])

                    if u'changed' in data[u'rolmembership']:
                        roles = (data[u'rolmembership'])[u'changed']

                        if type(roles) != list:
                            return precondition_required(msg)

                        for r in roles:
                            if type(r) != dict or \
                                    u'role' not in r or \
                                    u'admin' not in r:
                                return precondition_required(msg)

                            if not r[u'admin']:
                                data[u'revoked_admins'].append(r[u'role'])
                            else:
                                data[u'admins'].append(r[u'role'])

            if self.manager.version >= 90200 and u'seclabels' in data:
                if u'rid' not in kwargs or kwargs['rid'] == -1:
                    msg = _("""
Security Label must be passed as an array of JSON objects in the following
format:
seclabels:[{
    provider: <provider>,
    label: <label>
    },
    ...
]""")
                    if type(data[u'seclabels']) != list:
                        return precondition_required(msg)

                    for s in data[u'seclabels']:
                        if type(s) != dict or \
                                u'provider' not in s or \
                                u'label' not in s:
                            return precondition_required(msg)
                else:
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
                    seclabels = data[u'seclabels']
                    if type(seclabels) != dict:
                        return precondition_required(msg)

                    if u'added' in seclabels:
                        new_seclabels = seclabels[u'added']

                        if type(new_seclabels) != list:
                            return precondition_required(msg)

                        for s in new_seclabels:
                            if type(s) != dict or \
                                    u'provider' not in s or \
                                    u'label' not in s:
                                return precondition_required(msg)

                    if u'deleted' in seclabels:
                        removed_seclabels = seclabels[u'deleted']

                        if type(removed_seclabels) != list:
                            return precondition_required(msg)

                        for s in removed_seclabels:
                            if (type(s) != dict or u'provider' not in s):
                                return precondition_required(msg)

                    if u'changed' in seclabels:
                        changed_seclabels = seclabels[u'deleted']

                        if type(changed_seclabels) != list:
                            return precondition_required(msg)

                        for s in changed_seclabels:
                            if type(s) != dict or \
                                    u'provider' not in s and \
                                    u'label' not in s:
                                return precondition_required(msg)

            if u'variables' in data:
                if u'rid' not in kwargs or kwargs['rid'] == -1:
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
                    if type(data[u'variables']) != list:
                        return precondition_required(msg)

                    for r in data[u'variables']:
                        if type(r) != dict or u'name' not in r or \
                                u'value' not in r:
                            return precondition_required(msg)
                else:
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
                    variables = data[u'variables']
                    if type(variables) != dict:
                        return precondition_required(msg)

                    if u'added' in variables:
                        new_vars = variables[u'added']

                        if type(new_vars) != list:
                            return precondition_required(msg)

                        for v in new_vars:
                            if type(v) != dict or u'name' not in v or \
                                    u'value' not in v:
                                return precondition_required(msg)

                    if u'deleted' in variables:
                        delete_vars = variables[u'deleted']

                        if type(delete_vars) != list:
                            return precondition_required(msg)

                        for v in delete_vars:
                            if type(v) != dict or u'name' not in v:
                                return precondition_required(msg)

                    if u'changed' in variables:
                        new_vars = variables[u'changed']

                        if type(new_vars) != list:
                            return precondition_required(msg)

                        for v in new_vars:
                            if type(v) != dict or u'name' not in v or \
                                    u'value' not in v:
                                return precondition_required(msg)

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

                self.datlastsysoid = \
                    self.manager.db_info[self.manager.did]['datlastsysoid'] \
                    if self.manager.db_info is not None and \
                    self.manager.did in self.manager.db_info else 0

                self.sql_path = 'roles/sql/#{0}#'.format(self.manager.version)

                self.alterKeys = [
                    u'rolcanlogin', u'rolsuper', u'rolcreatedb',
                    u'rolcreaterole', u'rolinherit', u'rolreplication',
                    u'rolconnlimit', u'rolvaliduntil', u'rolpassword'
                ] if self.manager.version >= 90200 else [
                    u'rolcanlogin', u'rolsuper', u'rolcreatedb',
                    u'rolcreaterole', u'rolinherit', u'rolconnlimit',
                    u'rolvaliduntil', u'rolpassword'
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
                _(
                    "Error retrieving roles from the database server.\n{0}"
                ).format(res)
            )

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
                _(
                    "Error fetching role information from the database "
                    "server.\n{0}"
                ).format(rset)
            )

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
                    "Error fetching role information from the database "
                    "server.\n{0}"
                ).format(rset)
            )

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

        return gone(_("Could not find the role information."))

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
            if 'seclabels' in row and row['seclabels'] is not None:
                res = []
                for sec in row['seclabels']:
                    sec = re.search(r'([^=]+)=(.*$)', sec)
                    res.append({
                        'provider': sec.group(1),
                        'label': sec.group(2)
                    })
                row['seclabels'] = res

    @check_precondition(action='properties')
    def properties(self, gid, sid, rid):

        status, res = self.conn.execute_dict(
            render_template(
                self.sql_path + self._PROPERTIES_SQL,
                rid=rid
            )
        )

        if not status:
            return internal_server_error(
                _(
                    "Error retrieving roles from the database server.\n{0}"
                ).format(res)
            )

        self.transform(res)
        if len(res['rows']) == 0:
            return gone(_("Could not find the role information."))

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self.datlastsysoid)

        return ajax_response(
            response=res['rows'][0],
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
                u"DROP ROLE {0};".format(self.qtIdent(self.conn,
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
            "SELECT oid FROM pg_roles WHERE rolname = %(rolname)s",
            {'rolname': self.request[u'rolname']}
        )

        if not status:
            return internal_server_error(
                _("Could not retrieve the role information.\n{0}").format(msg)
            )

        status, rset = self.conn.execute_dict(
            render_template(self.sql_path + self._NODES_SQL,
                            rid=rid
                            )
        )

        if not status:
            return internal_server_error(
                _(
                    "Error fetching role information from the database "
                    "server.\n{0}"
                ).format(rset)
            )
        for row in rset['rows']:
            return jsonify(
                node=self.blueprint.generate_browser_node(
                    rid, sid,
                    row['rolname'],
                    'icon-role' if row['rolcanlogin'] else 'icon-group',
                    can_login=row['rolcanlogin']
                )
            )

        return gone(_("Could not find the role information."))

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
                _(
                    "Error fetching role information from the database "
                    "server.\n{0}"
                ).format(rset)
            )

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

        return gone(_("Could not find the role information."))

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
    def _handel_dependents_type(types, type_str, type_name, rel_name, row):
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
    def _handel_dependents_data(result, types, dependents, db_row):
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
                type_name, rel_name = RoleView._handel_dependents_type(
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
                lastsysoid=db_row['datlastsysoid']
            )

            status, result = temp_conn.execute_dict(query)
            if not status:
                current_app.logger.error(result)

            RoleView._handel_dependents_data(result, types, dependents, db_row)

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
                temp_conn = manager.connection(db_row['datname'])
                is_connected = temp_conn.connected()
                if not is_connected:
                    temp_conn.connect()
            except Exception as e:
                current_app.logger.exception(e)

            self._temp_connection_check(rid, temp_conn, db_row, types,
                                        dependents)
            RoleView._release_connection(is_connected, manager, db_row)

        return dependents

    @check_precondition()
    def variables(self, gid, sid, rid):

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


RoleView.register_node_view(blueprint)
