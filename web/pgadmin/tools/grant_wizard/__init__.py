##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Grant Wizard"""

import json
from flask import Response, url_for
from flask import render_template, request, current_app
from flask_babel import gettext
from pgadmin.user_login_check import pga_login_required
from urllib.parse import unquote

from pgadmin.browser.server_groups.servers.utils import parse_priv_to_db
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_response as ajax_response, \
    make_json_response, internal_server_error, bad_request
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import precondition_required
from functools import wraps
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.constants import MIMETYPE_APP_JS

# set template path for sql scripts
MODULE_NAME = 'grant_wizard'
server_info = {}


class GrantWizardModule(PgAdminModule):
    """
    class GrantWizardModule():

        It is a wizard which inherits PgAdminModule
        class and define methods to load its own
        javascript file.
    """

    def show_system_objects(self):
        """
        return system preference objects
        """
        return self.pref_show_system_objects

    def register_preferences(self):
        """
        Get show_system_objects preference
        """
        self.browser_preference = Preferences.module('browser')
        self.pref_show_system_objects = self.browser_preference.preference(
            'show_system_objects'
        )

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for grant-wizard module
        """
        return [
            'grant_wizard.acl', 'grant_wizard.objects', 'grant_wizard.apply',
            'grant_wizard.modified_sql'
        ]


# Create blueprint for GrantWizardModule class
blueprint = GrantWizardModule(
    MODULE_NAME, __name__, static_url_path='')


def check_precondition(f):
    """
    This function will behave as a decorator which will checks
    database connection before running view, it will also attaches
    manager,conn & template_path properties to instance of the method.

    Assumptions:
        This function will always be used as decorator of a class method.
    """

    @wraps(f)
    def wrap(*args, **kwargs):
        # Here args[0] will hold self & kwargs will hold sid,did

        server_info.clear()
        server_info['manager'] = get_driver(PG_DEFAULT_DRIVER)\
            .connection_manager(kwargs['sid'])
        server_info['conn'] = server_info['manager'].connection(
            did=kwargs['did']
        )
        # If DB not connected then return error to browser
        if not server_info['conn'].connected():
            return precondition_required(
                gettext("Connection to the server has been lost.")
            )

        # Set template path for sql scripts
        server_info['server_type'] = server_info['manager'].server_type
        server_info['version'] = server_info['manager'].version
        if server_info['server_type'] == 'pg':
            server_info['template_path'] = 'grant_wizard/pg/#{0}#'.format(
                server_info['version'])
        elif server_info['server_type'] == 'ppas':
            server_info['template_path'] = 'grant_wizard/ppas/#{0}#'.format(
                server_info['version'])

        return f(*args, **kwargs)

    return wrap


@blueprint.route("/")
@pga_login_required
def index():
    return bad_request(
        errormsg=gettext("This URL cannot be called directly.")
    )


@blueprint.route("/grant_wizard.js")
@pga_login_required
def script():
    """render own javascript"""
    return Response(response=render_template(
        "grant_wizard/js/grant_wizard.js", _=gettext),
        status=200,
        mimetype=MIMETYPE_APP_JS)


@blueprint.route(
    '/acl/<int:sid>/<int:did>/', methods=['GET'], endpoint='acl'
)
@pga_login_required
@check_precondition
def acl_list(sid, did):
    """render list of acls"""
    server_prop = server_info
    return Response(response=render_template(
        server_prop['template_path'] + "/acl.json", _=gettext),
        status=200,
        mimetype="application/json")


def _get_rows_for_type(conn, ntype, server_prop, node_id):
    """
    Used internally by properties to get rows for an object type
    :param conn: connection object
    :param ntype: object type
    :param server_prop: server properties
    :param node_id: oid
    :return: status, execute response
    """
    function_sql_url = '/sql/function.sql'
    status, res = True, []

    if ntype in ['function']:
        sql = render_template("/".join(
            [server_prop['template_path'], function_sql_url]),
            node_id=node_id, type='function')

        status, res = conn.execute_dict(sql)
    # Fetch procedures only if server type is EPAS or PG >= 11
    elif len(server_prop) > 0 and (
        server_prop['server_type'] == 'ppas' or (
            server_prop['server_type'] == 'pg' and
            server_prop['version'] >= 11000
        )
    ) and ntype in ['procedure']:
        sql = render_template("/".join(
            [server_prop['template_path'], function_sql_url]),
            node_id=node_id, type='procedure')

        status, res = conn.execute_dict(sql)

    # Fetch trigger functions
    elif ntype in ['trigger_function']:
        sql = render_template("/".join(
            [server_prop['template_path'], function_sql_url]),
            node_id=node_id, type='trigger_function')
        status, res = conn.execute_dict(sql)

    # Fetch Sequences against schema
    elif ntype in ['sequence']:
        sql = render_template("/".join(
            [server_prop['template_path'], '/sql/sequence.sql']),
            node_id=node_id)

        status, res = conn.execute_dict(sql)

    # Fetch Tables against schema
    elif ntype in ['table']:
        sql = render_template("/".join(
            [server_prop['template_path'], '/sql/table.sql']),
            node_id=node_id)

        status, res = conn.execute_dict(sql)

    # Fetch Views against schema
    elif ntype in ['view']:
        sql = render_template("/".join(
            [server_prop['template_path'], '/sql/view.sql']),
            node_id=node_id, node_type='v')

        status, res = conn.execute_dict(sql)

    # Fetch Materialzed Views against schema
    elif ntype in ['mview']:
        sql = render_template("/".join(
            [server_prop['template_path'], '/sql/view.sql']),
            node_id=node_id, node_type='m')

        status, res = conn.execute_dict(sql)
    # Fetch Foreign tables.
    elif ntype in ['foreign_table']:
        sql = render_template("/".join(
            [server_prop['template_path'], '/sql/foreign_table.sql']),
            node_id=node_id, node_type='m')

        status, res = conn.execute_dict(sql)

    # Logic for generating privileges sql only for ppas
    # Fetch Packages.
    if server_prop['server_type'] == 'ppas' and ntype in ['package']:
        sql = render_template("/".join(
            [server_prop['template_path'], '/sql/package.sql']),
            node_id=node_id)

        status, res = conn.execute_dict(sql)

    return status, res


def get_node_sql_with_type(node_id, node_type, server_prop,
                           get_schema_sql_url, show_sysobj):
    if node_type == 'database':
        sql = render_template("/".join(
            [server_prop['template_path'], get_schema_sql_url]),
            show_sysobj=show_sysobj)
        ntype = 'schema'
    else:
        sql = render_template("/".join(
            [server_prop['template_path'], get_schema_sql_url]),
            show_sysobj=show_sysobj, nspid=node_id)
        ntype = node_type

    return sql, ntype


@blueprint.route(
    '/<int:sid>/<int:did>/<int:node_id>/<node_type>/',
    methods=['GET'], endpoint='objects'
)
@pga_login_required
@check_precondition
def properties(sid, did, node_id, node_type):
    """It fetches the properties of object types
       and render into selection page of wizard
    """

    res_data, msg = get_data(sid, did, node_id, node_type, server_info)

    if res_data is None and isinstance(msg, Response):
        return msg

    return make_json_response(
        result=res_data,
        info=msg,
        status=200
    )


def get_data(sid, did, node_id, node_type, server_data,
             return_emtpy_schema=False):
    get_schema_sql_url = '/sql/get_schemas.sql'

    # unquote encoded url parameter
    node_type = unquote(node_type)

    server_prop = server_data

    res_data = []
    failed_objects = []
    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
    conn = manager.connection(did=did)

    show_sysobj = blueprint.show_system_objects().get()

    sql, ntype = get_node_sql_with_type(node_id, node_type, server_prop,
                                        get_schema_sql_url, show_sysobj)

    status, res = conn.execute_dict(sql)

    if not status:
        return None, internal_server_error(errormsg=res)
    node_types = res['rows']

    def _append_rows(status, res, disp_type):
        if not status:
            current_app.logger.error(res)
            failed_objects.append(disp_type)
        else:
            if len(res) > 0:
                res_data.extend(res['rows'])

    empty_schema_list = []
    for row in node_types:
        is_empty_schema = True
        if 'oid' in row:
            node_id = row['oid']

        if ntype == 'schema':
            status, res = _get_rows_for_type(
                conn, 'function', server_prop, node_id)

            _append_rows(status, res, 'function')

            status, res = _get_rows_for_type(
                conn, 'procedure', server_prop, node_id)

            _append_rows(status, res, 'procedure')

            status, res = _get_rows_for_type(
                conn, 'trigger_function', server_prop, node_id)

            _append_rows(status, res, 'trigger function')

            status, res = _get_rows_for_type(
                conn, 'sequence', server_prop, node_id)

            if len(res['rows']):
                is_empty_schema = False

            _append_rows(status, res, 'sequence')

            status, res = _get_rows_for_type(
                conn, 'table', server_prop, node_id)

            if len(res['rows']):
                is_empty_schema = False

            _append_rows(status, res, 'table')

            status, res = _get_rows_for_type(
                conn, 'view', server_prop, node_id)

            if len(res['rows']):
                is_empty_schema = False

            _append_rows(status, res, 'view')

            status, res = _get_rows_for_type(
                conn, 'mview', server_prop, node_id)

            if len(res['rows']):
                is_empty_schema = False

            _append_rows(status, res, 'materialized view')

            status, res = _get_rows_for_type(
                conn, 'foreign_table', server_prop, node_id)

            if len(res['rows']):
                is_empty_schema = False

            _append_rows(status, res, 'foreign table')

            status, res = _get_rows_for_type(
                conn, 'package', server_prop, node_id)

            if (type(res) is list and len(res) > 0) or (
                    'rows' in res and len(res['rows']) > 0):
                is_empty_schema = False

            _append_rows(status, res, 'package')

            if is_empty_schema and row['name'] not in empty_schema_list:
                empty_schema_list.append(row['name'])

        else:
            status, res = _get_rows_for_type(conn, ntype, server_prop, node_id)
            _append_rows(status, res, 'function')

    msg = None
    if len(failed_objects) > 0:
        msg = gettext('Unable to fetch the {} objects'.format(
            ", ".join(failed_objects))
        )
    if return_emtpy_schema:
        return res_data, msg, empty_schema_list

    return res_data, msg


def get_req_data():
    return request.form if request.form else json.loads(request.data.decode())


def set_priv_for_package(server_prop, data, acls):
    if server_prop['server_type'] == 'ppas':
        data['priv']['package'] = parse_priv_to_db(
            data['acl'],
            acls['package']['acl'])


@blueprint.route(
    '/sql/<int:sid>/<int:did>/',
    methods=['POST'], endpoint='modified_sql'
)
@pga_login_required
@check_precondition
def msql(sid, did):
    """
    This function will return modified SQL
    """
    server_prop = server_info
    data = get_req_data()
    # Form db connection
    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
    conn = manager.connection(did=did)

    acls = []
    try:
        acls = render_template(
            "/".join([server_prop['template_path'], '/acl.json'])
        )
        acls = json.loads(acls)
    except Exception as e:
        current_app.logger.exception(e)

    try:
        # Parse privileges
        data['priv'] = {}
        if 'acl' in data:
            # Get function acls
            data['priv']['function'] = parse_priv_to_db(
                data['acl'],
                acls['function']['acl'])

            data['priv']['sequence'] = parse_priv_to_db(
                data['acl'],
                acls['sequence']['acl'])

            data['priv']['table'] = parse_priv_to_db(
                data['acl'],
                acls['table']['acl'])

            data['priv']['foreign_table'] = parse_priv_to_db(
                data['acl'],
                acls['foreign_table']['acl'])

            # Logic for setting privileges only for ppas
            set_priv_for_package(server_prop, data, acls)

        # Pass database objects and get SQL for privileges
        sql_data = ''
        data_func = {'objects': data['objects'],
                     'priv': data['priv']['function']}
        sql = render_template(
            "/".join([server_prop['template_path'],
                      '/sql/grant_function.sql']),
            data=data_func, conn=conn)
        if sql and sql.strip('\n') != '':
            sql_data += sql

        data_seq = {'objects': data['objects'],
                    'priv': data['priv']['sequence']}
        sql = render_template(
            "/".join([server_prop['template_path'],
                      '/sql/grant_sequence.sql']),
            data=data_seq, conn=conn)
        if sql and sql.strip('\n') != '':
            sql_data += sql

        data_table = {'objects': data['objects'],
                      'priv': data['priv']['table']}
        sql = render_template(
            "/".join([server_prop['template_path'], '/sql/grant_table.sql']),
            data=data_table, conn=conn)
        if sql and sql.strip('\n') != '':
            sql_data += sql

        data_table = {'objects': data['objects'],
                      'priv': data['priv']['foreign_table']}
        sql = render_template(
            "/".join([server_prop['template_path'],
                      '/sql/grant_foreign_table.sql']),
            data=data_table, conn=conn)
        if sql and sql.strip('\n') != '':
            sql_data += sql

        # Logic for generating privileges sql only for ppas
        if server_prop['server_type'] == 'ppas':
            data_package = {'objects': data['objects'],
                            'priv': data['priv']['package']}
            sql = render_template(
                "/".join([server_prop['template_path'],
                          '/sql/grant_package.sql']),
                data=data_package, conn=conn)
            if sql and sql.strip('\n') != '':
                sql_data += sql

        res = {'data': sql_data}

        return ajax_response(
            response=res,
            status=200
        )

    except Exception as e:
        return make_json_response(
            status=410,
            success=0,
            errormsg=e.message
        )


def parse_priv(data, acls, server_prop):
    if 'acl' in data:
        # Get function acls
        data['priv']['function'] = parse_priv_to_db(
            data['acl'],
            acls['function']['acl'])

        data['priv']['sequence'] = parse_priv_to_db(
            data['acl'],
            acls['sequence']['acl'])

        data['priv']['table'] = parse_priv_to_db(
            data['acl'],
            acls['table']['acl'])

        data['priv']['foreign_table'] = parse_priv_to_db(
            data['acl'],
            acls['foreign_table']['acl'])

        # Logic for setting privileges only for ppas
        set_priv_for_package(server_prop, data, acls)


@blueprint.route(
    '/<int:sid>/<int:did>/', methods=['POST'], endpoint='apply'
)
@pga_login_required
@check_precondition
def save(sid, did):
    """
    This function will apply the privileges to the selected
    Database Objects
    """
    server_prop = server_info
    data = get_req_data()

    # Form db connection and we use conn to execute sql
    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
    conn = manager.connection(did=did)

    acls = []
    try:
        acls = render_template(
            "/".join([server_prop['template_path'], 'acl.json']),
        )
        acls = json.loads(acls)
    except Exception as e:
        current_app.logger.exception(e)

    try:

        # Parse privileges
        data['priv'] = {}
        parse_priv(data, acls, server_prop)
        # Pass database objects and get SQL for privileges
        # Pass database objects and get SQL for privileges
        sql_data = ''
        data_func = {'objects': data['objects'],
                     'priv': data['priv']['function']}
        sql = render_template(
            "/".join([server_prop['template_path'],
                      '/sql/grant_function.sql']),
            data=data_func, conn=conn)
        if sql and sql.strip('\n') != '':
            sql_data += sql

        data_seq = {'objects': data['objects'],
                    'priv': data['priv']['sequence']}
        sql = render_template(
            "/".join([server_prop['template_path'],
                      '/sql/grant_sequence.sql']),
            data=data_seq, conn=conn)
        if sql and sql.strip('\n') != '':
            sql_data += sql

        data_table = {'objects': data['objects'],
                      'priv': data['priv']['table']}
        sql = render_template(
            "/".join([server_prop['template_path'], '/sql/grant_table.sql']),
            data=data_table, conn=conn)
        if sql and sql.strip('\n') != '':
            sql_data += sql

        data_table = {'objects': data['objects'],
                      'priv': data['priv']['foreign_table']}
        sql = render_template(
            "/".join([server_prop['template_path'],
                      '/sql/grant_foreign_table.sql']),
            data=data_table, conn=conn)
        if sql and sql.strip('\n') != '':
            sql_data += sql

        # Logic for generating privileges sql only for ppas
        if server_prop['server_type'] == 'ppas':
            data_package = {'objects': data['objects'],
                            'priv': data['priv']['package']}
            sql = render_template(
                "/".join([server_prop['template_path'],
                          '/sql/grant_package.sql']),
                data=data_package, conn=conn)
            if sql and sql.strip('\n') != '':
                sql_data += sql

        status, res = conn.execute_dict(sql_data)
        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            success=1,
            info="Privileges applied"
        )

    except Exception as e:
        return internal_server_error(errormsg=e.message)
