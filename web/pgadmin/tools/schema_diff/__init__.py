##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the schema_diff frame."""
import json
import pickle
import secrets
import copy

from flask import Response, session, url_for, request
from flask import render_template, current_app as app
from flask_security import current_user
from pgadmin.user_login_check import pga_login_required
from flask_babel import gettext
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response, bad_request, \
    make_response as ajax_response, internal_server_error
from pgadmin.model import Server, SharedServer
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.model import SchemaDiffModel
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.driver import get_driver
from pgadmin.utils.constants import PREF_LABEL_DISPLAY, MIMETYPE_APP_JS,\
    ERROR_MSG_TRANS_ID_NOT_FOUND
from sqlalchemy import or_
from pgadmin.authenticate import socket_login_required
from pgadmin import socketio

MODULE_NAME = 'schema_diff'
COMPARE_MSG = gettext("Comparing objects...")
SOCKETIO_NAMESPACE = '/{0}'.format(MODULE_NAME)
SCH_OBJ_STR = 'Schema Objects'


class SchemaDiffModule(PgAdminModule):
    """
    class SchemaDiffModule(PgAdminModule)

        A module class for Schema Diff derived from PgAdminModule.
    """

    LABEL = gettext("Schema Diff")

    def get_own_menuitems(self):
        return {}

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for Schema Diff module
        """
        return [
            'schema_diff.initialize',
            'schema_diff.panel',
            'schema_diff.servers',
            'schema_diff.databases',
            'schema_diff.schemas',
            'schema_diff.ddl_compare',
            'schema_diff.connect_server',
            'schema_diff.connect_database',
            'schema_diff.get_server',
            'schema_diff.close'
        ]

    def register_preferences(self):

        self.preference.register(
            'display', 'ignore_whitespaces',
            gettext("Ignore Whitespace"), 'boolean', False,
            category_label=PREF_LABEL_DISPLAY,
            help_str=gettext('Set ignore whitespace on or off by default in '
                             'the drop-down menu near the Compare button in '
                             'the Schema Diff tab.')
        )

        self.preference.register(
            'display', 'ignore_owner',
            gettext("Ignore Owner"), 'boolean', False,
            category_label=PREF_LABEL_DISPLAY,
            help_str=gettext('Set ignore owner on or off by default in the '
                             'drop-down menu near the Compare button in the '
                             'Schema Diff tab.')
        )

        self.preference.register(
            'display', 'ignore_tablespace',
            gettext("Ignore Tablespace"), 'boolean', False,
            category_label=PREF_LABEL_DISPLAY,
            help_str=gettext('Set ignore tablespace on or off by default in '
                             'the drop-down menu near the Compare button in '
                             'the Schema Diff tab.')
        )

        self.preference.register(
            'display', 'ignore_grants',
            gettext("Ignore Grants/Revoke"), 'boolean', False,
            category_label=PREF_LABEL_DISPLAY,
            help_str=gettext('Set ignore grants/revoke on or off by default '
                             'in the drop-down menu near the Compare button '
                             'in the Schema Diff tab.')
        )


blueprint = SchemaDiffModule(MODULE_NAME, __name__, static_url_path='/static')


@blueprint.route("/")
@pga_login_required
def index():
    return bad_request(
        errormsg=gettext('This URL cannot be requested directly.')
    )


@blueprint.route(
    '/panel/<int:trans_id>/<path:editor_title>',
    methods=["GET"],
    endpoint='panel'
)
def panel(trans_id, editor_title):
    """
    This method calls index.html to render the schema diff.

    Args:
        editor_title: Title of the editor
    """
    # If title has slash(es) in it then replace it
    if request.args and request.args['fslashes'] != '':
        try:
            fslashes_list = request.args['fslashes'].split(',')
            for idx in fslashes_list:
                idx = int(idx)
                editor_title = editor_title[:idx] + '/' + editor_title[idx:]
        except IndexError as e:
            app.logger.exception(e)

    return render_template(
        "schema_diff/index.html",
        _=gettext,
        trans_id=trans_id,
        editor_title=editor_title,
    )


def check_transaction_status(trans_id):
    """
    This function is used to check the transaction id
    is available in the session object.

    Args:
        trans_id:
    """

    if 'schemaDiff' not in session:
        return False, ERROR_MSG_TRANS_ID_NOT_FOUND, None, None

    schema_diff_data = session['schemaDiff']

    # Return from the function if transaction id not found
    if str(trans_id) not in schema_diff_data:
        return False, ERROR_MSG_TRANS_ID_NOT_FOUND, None, None

    # Fetch the object for the specified transaction id.
    # Use pickle.loads function to get the model object
    session_obj = schema_diff_data[str(trans_id)]
    diff_model_obj = pickle.loads(session_obj['diff_model_obj'])

    return True, None, diff_model_obj, session_obj


def update_session_diff_transaction(trans_id, session_obj, diff_model_obj):
    """
    This function is used to update the diff model into the session.
    :param trans_id:
    :param session_obj:
    :param diff_model_obj:
    :return:
    """
    session_obj['diff_model_obj'] = pickle.dumps(diff_model_obj, -1)

    if 'schemaDiff' in session:
        schema_diff_data = session['schemaDiff']
        schema_diff_data[str(trans_id)] = session_obj
        session['schemaDiff'] = schema_diff_data


@blueprint.route(
    '/initialize/<int:trans_id>',
    methods=["GET"],
    endpoint="initialize"
)
@pga_login_required
def initialize(trans_id):
    """
    This function will initialize the schema diff and return the list
    of all the server's.
    """
    try:
        if 'schemaDiff' not in session:
            schema_diff_data = dict()
        else:
            schema_diff_data = session['schemaDiff']

        # Use pickle to store the Schema Diff Model which will be used
        # later by the diff module.
        schema_diff_data[str(trans_id)] = {
            'diff_model_obj': pickle.dumps(SchemaDiffModel(), -1)
        }

        # Store the schema diff dictionary into the session variable
        session['schemaDiff'] = schema_diff_data

    except Exception as e:
        app.logger.exception(e)

    return make_json_response()


@blueprint.route('/close/<int:trans_id>',
                 methods=["DELETE"],
                 endpoint='close')
def close(trans_id):
    """
    Remove the session details for the particular transaction id.

    Args:
        trans_id: unique transaction id
    """
    if 'schemaDiff' not in session:
        return make_json_response(data={'status': True})

    schema_diff_data = session['schemaDiff']

    # Return from the function if transaction id not found
    if str(trans_id) not in schema_diff_data:
        return make_json_response(data={'status': True})

    try:
        # Remove the information of unique transaction id from the
        # session variable.
        schema_diff_data.pop(str(trans_id), None)
        session['schemaDiff'] = schema_diff_data
    except Exception as e:
        app.logger.error(e)
        return internal_server_error(errormsg=str(e))

    return make_json_response(data={'status': True})


@blueprint.route(
    '/servers',
    methods=["GET"],
    endpoint="servers"
)
@pga_login_required
def servers():
    """
    This function will return the list of servers for the specified
    server id.
    """
    res = {}
    auto_detected_server = None
    try:
        """Return a JSON document listing the server groups for the user"""
        driver = get_driver(PG_DEFAULT_DRIVER)

        from pgadmin.browser.server_groups.servers import\
            server_icon_and_background

        for server in Server.query.filter(
                or_(Server.user_id == current_user.id, Server.shared),
                Server.is_adhoc == 0):

            shared_server = SharedServer.query.filter_by(
                name=server.name, user_id=current_user.id,
                servergroup_id=server.servergroup_id).first()

            if server.discovery_id:
                auto_detected_server = server.name

            if shared_server and shared_server.name == auto_detected_server:
                continue

            manager = driver.connection_manager(server.id)
            conn = manager.connection()
            connected = conn.connected()
            server_info = {
                "value": server.id,
                "label": server.name,
                "image": server_icon_and_background(connected, manager,
                                                    server),
                "_id": server.id,
                "connected": connected
            }

            if server.servers.name in res:
                res[server.servers.name].append(server_info)
            else:
                res[server.servers.name] = [server_info]

    except Exception as e:
        app.logger.exception(e)

    return make_json_response(data=res)


@blueprint.route(
    '/get_server/<int:sid>/<int:did>',
    methods=["GET"],
    endpoint="get_server"
)
@pga_login_required
def get_server(sid, did):
    """
    This function will return the server details for the specified
    server id.
    """
    res = []
    try:
        """Return a JSON document listing the server groups for the user"""
        driver = get_driver(PG_DEFAULT_DRIVER)

        server = Server.query.filter_by(id=sid).first()
        manager = driver.connection_manager(sid)
        conn = manager.connection(did=did)
        connected = conn.connected()

        res = {
            "sid": sid,
            "name": server.name,
            "user": server.username,
            "gid": server.servergroup_id,
            "type": manager.server_type,
            "connected": connected,
            "database": conn.db
        }

    except Exception as e:
        app.logger.exception(e)

    return make_json_response(data=res)


@blueprint.route(
    '/server/connect/<int:sid>',
    methods=["POST"],
    endpoint="connect_server"
)
@pga_login_required
def connect_server(sid):
    # Check if server is already connected then no need to reconnect again.
    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(sid)
    conn = manager.connection()
    if conn.connected():
        return make_json_response(
            success=1,
            info=gettext("Server connected."),
            data={}
        )

    server = Server.query.filter_by(id=sid).first()
    view = SchemaDiffRegistry.get_node_view('server')
    return view.connect(server.servergroup_id, sid)


@blueprint.route(
    '/database/connect/<int:sid>/<int:did>',
    methods=["POST"],
    endpoint="connect_database"
)
@pga_login_required
def connect_database(sid, did):
    server = Server.query.filter_by(id=sid).first()
    view = SchemaDiffRegistry.get_node_view('database')
    return view.connect(server.servergroup_id, sid, did)


@blueprint.route(
    '/databases/<int:sid>',
    methods=["GET"],
    endpoint="databases"
)
@pga_login_required
def databases(sid):
    """
    This function will return the list of databases for the specified
    server id.
    """
    res = []
    try:
        view = SchemaDiffRegistry.get_node_view('database')

        server = Server.query.filter_by(id=sid).first()
        response = view.nodes(gid=server.servergroup_id, sid=sid,
                              is_schema_diff=True)
        databases = json.loads(response.data)['data']
        for db in databases:
            res.append({
                "value": db['_id'],
                "label": db['label'],
                "_id": db['_id'],
                "connected": db['connected'],
                "allowConn": db['allowConn'],
                "image": db['icon'],
                "canDisconn": db['canDisconn'],
                "is_maintenance_db": db['label'] == server.maintenance_db
            })

    except Exception as e:
        app.logger.exception(e)

    return make_json_response(data=res)


@blueprint.route(
    '/schemas/<int:sid>/<int:did>',
    methods=["GET"],
    endpoint="schemas"
)
@pga_login_required
def schemas(sid, did):
    """
    This function will return the list of schemas for the specified
    server id and database id.
    """
    res = []
    try:
        schemas = get_schemas(sid, did)
        if schemas is not None:
            for sch in schemas:
                res.append({
                    "value": sch['_id'],
                    "label": sch['label'],
                    "_id": sch['_id'],
                    "image": sch['icon'],
                })
    except Exception as e:
        app.logger.exception(e)

    return make_json_response(data=res)


@socketio.on('compare_database', namespace=SOCKETIO_NAMESPACE)
@socket_login_required
def compare_database(params):
    """
    This function will compare the two databases.
    """
    # Check the pre validation before compare
    SchemaDiffRegistry.set_schema_diff_compare_mode('Database Objects')
    status, error_msg, diff_model_obj, session_obj = \
        compare_pre_validation(params['trans_id'], params['source_sid'],
                               params['target_sid'])
    if not status:
        socketio.emit('compare_database_failed',
                      error_msg.json if isinstance(
                          error_msg, Response) else error_msg,
                      namespace=SOCKETIO_NAMESPACE, to=request.sid)
        return error_msg

    comparison_result = []

    socketio.emit('compare_status', {'diff_percentage': 0,
                  'compare_msg': COMPARE_MSG}, namespace=SOCKETIO_NAMESPACE,
                  to=request.sid)
    update_session_diff_transaction(params['trans_id'], session_obj,
                                    diff_model_obj)

    try:
        ignore_owner = bool(params['ignore_owner'])
        ignore_whitespaces = bool(params['ignore_whitespaces'])
        ignore_tablespace = bool(params['ignore_tablespace'])
        ignore_grants = bool(params['ignore_grants'])

        # Fetch all the schemas of source and target database
        # Compare them and get the status.
        schema_result = \
            fetch_compare_schemas(params['source_sid'], params['source_did'],
                                  params['target_sid'], params['target_did'])

        total_schema = len(schema_result['source_only']) + len(
            schema_result['target_only']) + len(
            schema_result['in_both_database'])

        node_percent = 0
        if total_schema > 0:
            node_percent = round(100 / (total_schema * len(
                SchemaDiffRegistry.get_registered_nodes())), 2)
        total_percent = 0

        # Compare Database objects
        comparison_schema_result, total_percent = \
            compare_database_objects(
                trans_id=params['trans_id'], session_obj=session_obj,
                source_sid=params['source_sid'],
                source_did=params['source_did'],
                target_sid=params['target_sid'],
                target_did=params['target_did'],
                diff_model_obj=diff_model_obj, total_percent=total_percent,
                node_percent=node_percent, ignore_owner=ignore_owner,
                ignore_whitespaces=ignore_whitespaces,
                ignore_tablespace=ignore_tablespace,
                ignore_grants=ignore_grants)
        comparison_result = \
            comparison_result + comparison_schema_result

        # Compare Schema objects
        if 'source_only' in schema_result and \
                len(schema_result['source_only']) > 0:
            for item in schema_result['source_only']:
                comparison_schema_result, total_percent = \
                    compare_schema_objects(
                        trans_id=params['trans_id'], session_obj=session_obj,
                        source_sid=params['source_sid'],
                        source_did=params['source_did'],
                        source_scid=item['scid'],
                        target_sid=params['target_sid'],
                        target_did=params['target_did'], target_scid=None,
                        schema_name=item['schema_name'],
                        diff_model_obj=diff_model_obj,
                        total_percent=total_percent,
                        node_percent=node_percent,
                        is_schema_source_only=True,
                        ignore_owner=ignore_owner,
                        ignore_whitespaces=ignore_whitespaces,
                        ignore_tablespace=ignore_tablespace,
                        ignore_grants=ignore_grants)

                comparison_result = \
                    comparison_result + comparison_schema_result

        if 'target_only' in schema_result and \
                len(schema_result['target_only']) > 0:
            for item in schema_result['target_only']:
                comparison_schema_result, total_percent = \
                    compare_schema_objects(
                        trans_id=params['trans_id'], session_obj=session_obj,
                        source_sid=params['source_sid'],
                        source_did=params['source_did'],
                        source_scid=None, target_sid=params['target_sid'],
                        target_did=params['target_did'],
                        target_scid=item['scid'],
                        schema_name=item['schema_name'],
                        diff_model_obj=diff_model_obj,
                        total_percent=total_percent,
                        node_percent=node_percent,
                        ignore_owner=ignore_owner,
                        ignore_whitespaces=ignore_whitespaces,
                        ignore_tablespace=ignore_tablespace,
                        ignore_grants=ignore_grants)

                comparison_result = \
                    comparison_result + comparison_schema_result

        # Compare the two schema present in both the databases
        if 'in_both_database' in schema_result and \
                len(schema_result['in_both_database']) > 0:
            for item in schema_result['in_both_database']:
                comparison_schema_result, total_percent = \
                    compare_schema_objects(
                        trans_id=params['trans_id'], session_obj=session_obj,
                        source_sid=params['source_sid'],
                        source_did=params['source_did'],
                        source_scid=item['src_scid'],
                        target_sid=params['target_sid'],
                        target_did=params['target_did'],
                        target_scid=item['tar_scid'],
                        schema_name=item['schema_name'],
                        diff_model_obj=diff_model_obj,
                        total_percent=total_percent,
                        node_percent=node_percent,
                        ignore_owner=ignore_owner,
                        ignore_whitespaces=ignore_whitespaces,
                        ignore_tablespace=ignore_tablespace,
                        ignore_grants=ignore_grants)

                comparison_result = \
                    comparison_result + comparison_schema_result

        # Update the message and total percentage done in session object
        update_session_diff_transaction(params['trans_id'], session_obj,
                                        diff_model_obj)

    except Exception as e:
        app.logger.exception(e)
        socketio.emit('compare_database_failed', str(e),
                      namespace=SOCKETIO_NAMESPACE, to=request.sid)

    socketio.emit('compare_database_success', comparison_result,
                  namespace=SOCKETIO_NAMESPACE, to=request.sid)


@socketio.on('compare_schema', namespace=SOCKETIO_NAMESPACE)
@socket_login_required
def compare_schema(params):
    """
    This function will compare the two schema.
    """
    # Check the pre validation before compare
    SchemaDiffRegistry.set_schema_diff_compare_mode(SCH_OBJ_STR)
    status, error_msg, diff_model_obj, session_obj = \
        compare_pre_validation(params['trans_id'], params['source_sid'],
                               params['target_sid'])
    if not status:
        socketio.emit('compare_schema_failed',
                      error_msg.json if isinstance(
                          error_msg, Response) else error_msg,
                      namespace=SOCKETIO_NAMESPACE, to=request.sid)
        return error_msg

    comparison_result = []

    update_session_diff_transaction(params['trans_id'], session_obj,
                                    diff_model_obj)
    try:
        ignore_owner = bool(params['ignore_owner'])
        ignore_whitespaces = bool(params['ignore_whitespaces'])
        ignore_tablespace = bool(params['ignore_tablespace'])
        ignore_grants = bool(params['ignore_grants'])
        all_registered_nodes = SchemaDiffRegistry.get_registered_nodes()
        node_percent = round(100 / len(all_registered_nodes), 2)
        total_percent = 0

        comparison_schema_result, total_percent = \
            compare_schema_objects(
                trans_id=params['trans_id'], session_obj=session_obj,
                source_sid=params['source_sid'],
                source_did=params['source_did'],
                source_scid=params['source_scid'],
                target_sid=params['target_sid'],
                target_did=params['target_did'],
                target_scid=params['target_scid'],
                schema_name=gettext(SCH_OBJ_STR),
                diff_model_obj=diff_model_obj,
                total_percent=total_percent,
                node_percent=node_percent,
                ignore_owner=ignore_owner,
                ignore_whitespaces=ignore_whitespaces,
                ignore_tablespace=ignore_tablespace,
                ignore_grants=ignore_grants)

        comparison_result = \
            comparison_result + comparison_schema_result

        # Update the message and total percentage done in session object
        update_session_diff_transaction(params['trans_id'], session_obj,
                                        diff_model_obj)

    except Exception as e:
        app.logger.exception(e)
        socketio.emit('compare_schema_failed', str(e),
                      namespace=SOCKETIO_NAMESPACE, to=request.sid)
    socketio.emit('compare_schema_success', comparison_result,
                  namespace=SOCKETIO_NAMESPACE, to=request.sid)


@blueprint.route(
    '/ddl_compare/<int:trans_id>/<int:source_sid>/<int:source_did>/'
    '<int:source_scid>/<int:target_sid>/<int:target_did>/<int:target_scid>/'
    '<int:source_oid>/<int:target_oid>/<node_type>/<comp_status>/',
    methods=["GET"],
    endpoint="ddl_compare"
)
@pga_login_required
def ddl_compare(trans_id, source_sid, source_did, source_scid,
                target_sid, target_did, target_scid, source_oid,
                target_oid, node_type, comp_status):
    """
    This function is used to compare the specified object and return the
    DDL comparison.
    """
    # Check the transaction and connection status
    _, error_msg, _, _ = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg, status=404)

    view = SchemaDiffRegistry.get_node_view(node_type)
    if view and hasattr(view, 'ddl_compare'):
        sql = view.ddl_compare(source_sid=source_sid, source_did=source_did,
                               source_scid=source_scid, target_sid=target_sid,
                               target_did=target_did, target_scid=target_scid,
                               source_oid=source_oid, target_oid=target_oid,
                               comp_status=comp_status)
        return ajax_response(
            status=200,
            response={'source_ddl': sql['source_ddl'],
                      'target_ddl': sql['target_ddl'],
                      'diff_ddl': sql['diff_ddl']}
        )

    msg = gettext('Selected object is not supported for DDL comparison.')

    return ajax_response(
        status=200,
        response={'source_ddl': msg,
                  'target_ddl': msg,
                  'diff_ddl': msg
                  }
    )


def check_version_compatibility(sid, tid):
    """Check the version compatibility of source and target servers."""

    driver = get_driver(PG_DEFAULT_DRIVER)
    src_server = Server.query.filter_by(id=sid).first()
    src_manager = driver.connection_manager(src_server.id)
    src_conn = src_manager.connection()

    tar_server = Server.query.filter_by(id=tid).first()
    tar_manager = driver.connection_manager(tar_server.id)
    target_conn = tar_manager.connection()

    if not (src_conn.connected() and target_conn.connected()):
        return False, gettext('Server(s) disconnected.')

    if src_manager.server_type != tar_manager.server_type:
        return False, gettext('Schema diff does not support the comparison '
                              'between Postgres Server and EDB Postgres '
                              'Advanced Server.')

    def get_round_val(x):
        if x < 100000:
            return x + 100 - x % 100
        else:
            return x + 10000 - x % 10000

    if get_round_val(src_manager.version) == \
            get_round_val(tar_manager.version):
        return True, None

    return False, gettext('Source and Target database server must be of '
                          'the same major version.')


def get_schemas(sid, did):
    """
    This function will return the list of schemas for the specified
    server id and database id.
    """
    try:
        view = SchemaDiffRegistry.get_node_view('schema')
        server = Server.query.filter_by(id=sid).first()
        response = view.nodes(gid=server.servergroup_id, sid=sid, did=did,
                              is_schema_diff=True)
        schemas = json.loads(response.data)['data']
        return schemas
    except Exception as e:
        app.logger.exception(e)

    return None


def compare_database_objects(**kwargs):
    """
    This function is used to compare the specified schema and their children.

    :param kwargs:
    :return:
    """
    trans_id = kwargs.get('trans_id')
    session_obj = kwargs.get('session_obj')
    source_sid = kwargs.get('source_sid')
    source_did = kwargs.get('source_did')
    target_sid = kwargs.get('target_sid')
    target_did = kwargs.get('target_did')
    diff_model_obj = kwargs.get('diff_model_obj')
    total_percent = kwargs.get('total_percent')
    node_percent = kwargs.get('node_percent')
    ignore_owner = kwargs.get('ignore_owner')
    ignore_whitespaces = kwargs.get('ignore_whitespaces')
    ignore_tablespace = kwargs.get('ignore_tablespace')
    ignore_grants = kwargs.get('ignore_grants')
    comparison_result = []

    all_registered_nodes = SchemaDiffRegistry.get_registered_nodes(None,
                                                                   'Database')
    for node_name, node_view in all_registered_nodes.items():
        view = SchemaDiffRegistry.get_node_view(node_name)
        if hasattr(view, 'compare'):
            msg = gettext('Comparing {0}'). \
                format(gettext(view.blueprint.collection_label))
            app.logger.debug(msg)
            socketio.emit('compare_status', {'diff_percentage': total_percent,
                          'compare_msg': msg}, namespace=SOCKETIO_NAMESPACE,
                          to=request.sid)
            # Update the message and total percentage in session object
            update_session_diff_transaction(trans_id, session_obj,
                                            diff_model_obj)

            res = view.compare(source_sid=source_sid,
                               source_did=source_did,
                               target_sid=target_sid,
                               target_did=target_did,
                               group_name=gettext('Database Objects'),
                               ignore_owner=ignore_owner,
                               ignore_whitespaces=ignore_whitespaces,
                               ignore_tablespace=ignore_tablespace,
                               ignore_grants=ignore_grants)

            if res is not None:
                comparison_result = comparison_result + res
        total_percent = total_percent + node_percent

    return comparison_result, total_percent


def compare_schema_objects(**kwargs):
    """
    This function is used to compare the specified schema and their children.

    :param kwargs:
    :return:
    """
    trans_id = kwargs.get('trans_id')
    session_obj = kwargs.get('session_obj')
    source_sid = kwargs.get('source_sid')
    source_did = kwargs.get('source_did')
    source_scid = kwargs.get('source_scid')
    target_sid = kwargs.get('target_sid')
    target_did = kwargs.get('target_did')
    target_scid = kwargs.get('target_scid')
    schema_name = kwargs.get('schema_name')
    diff_model_obj = kwargs.get('diff_model_obj')
    total_percent = kwargs.get('total_percent')
    node_percent = kwargs.get('node_percent')
    is_schema_source_only = kwargs.get('is_schema_source_only', False)
    ignore_owner = kwargs.get('ignore_owner')
    ignore_whitespaces = kwargs.get('ignore_whitespaces')
    ignore_tablespace = kwargs.get('ignore_tablespace')
    ignore_grants = kwargs.get('ignore_grants')

    source_schema_name = None
    if is_schema_source_only:
        driver = get_driver(PG_DEFAULT_DRIVER)
        source_schema_name = driver.qtIdent(None, schema_name)

    comparison_result = []

    all_registered_nodes = SchemaDiffRegistry.get_registered_nodes()
    for node_name, node_view in all_registered_nodes.items():
        view = SchemaDiffRegistry.get_node_view(node_name)
        if hasattr(view, 'compare'):
            if schema_name == SCH_OBJ_STR:
                msg = gettext('Comparing {0} '). \
                    format(gettext(view.blueprint.collection_label))
            else:
                msg = gettext('Comparing {0} of schema \'{1}\''). \
                    format(gettext(view.blueprint.collection_label),
                           gettext(schema_name))
            app.logger.debug(msg)
            socketio.emit('compare_status', {'diff_percentage': total_percent,
                          'compare_msg': msg}, namespace=SOCKETIO_NAMESPACE,
                          to=request.sid)
            # Update the message and total percentage in session object
            update_session_diff_transaction(trans_id, session_obj,
                                            diff_model_obj)

            res = view.compare(source_sid=source_sid,
                               source_did=source_did,
                               source_scid=source_scid,
                               target_sid=target_sid,
                               target_did=target_did,
                               target_scid=target_scid,
                               group_name=gettext(schema_name),
                               source_schema_name=source_schema_name,
                               ignore_owner=ignore_owner,
                               ignore_whitespaces=ignore_whitespaces,
                               ignore_tablespace=ignore_tablespace,
                               ignore_grants=ignore_grants)

            if res is not None:
                comparison_result = comparison_result + res
        total_percent = total_percent + node_percent
        # if total_percent is more than 100 then set it to less than 100
        if total_percent >= 100:
            total_percent = 96

    return comparison_result, total_percent


def fetch_compare_schemas(source_sid, source_did, target_sid, target_did):
    """
    This function is used to fetch all the schemas of source and target
    database and compare them.

    :param source_sid:
    :param source_did:
    :param target_sid:
    :param target_did:
    :return:
    """
    source_schemas = get_schemas(source_sid, source_did)
    target_schemas = get_schemas(target_sid, target_did)

    src_schema_dict = {item['label']: item['_id'] for item in source_schemas}
    tar_schema_dict = {item['label']: item['_id'] for item in target_schemas}

    dict1 = copy.deepcopy(src_schema_dict)
    dict2 = copy.deepcopy(tar_schema_dict)

    # Find the duplicate keys in both the dictionaries
    dict1_keys = set(dict1.keys())
    dict2_keys = set(dict2.keys())
    intersect_keys = dict1_keys.intersection(dict2_keys)

    # Keys that are available in source and missing in target.
    source_only = []
    added = dict1_keys - dict2_keys
    for item in added:
        source_only.append({'schema_name': item,
                            'scid': src_schema_dict[item]})

    target_only = []
    # Keys that are available in target and missing in source.
    removed = dict2_keys - dict1_keys
    for item in removed:
        target_only.append({'schema_name': item,
                            'scid': tar_schema_dict[item]})

    in_both_database = []
    for item in intersect_keys:
        in_both_database.append({'schema_name': item,
                                 'src_scid': src_schema_dict[item],
                                 'tar_scid': tar_schema_dict[item]})

    schema_result = {'source_only': source_only, 'target_only': target_only,
                     'in_both_database': in_both_database}

    return schema_result


def compare_pre_validation(trans_id, source_sid, target_sid):
    """
    This function is used to validate transaction id and version compatibility
    :param trans_id:
    :param source_sid:
    :param target_sid:
    :return:
    """

    status, error_msg, diff_model_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        res = make_json_response(success=0, errormsg=error_msg, status=404)
        return False, res, None, None

    # Server version compatibility check
    status, msg = check_version_compatibility(source_sid, target_sid)
    if not status:
        res = make_json_response(success=0, errormsg=msg, status=428)
        return False, res, None, None

    return True, '', diff_model_obj, session_obj


@socketio.on('connect', namespace=SOCKETIO_NAMESPACE)
def connect():
    """
    Connect to the server through socket.
    :return:
    :rtype:
    """
    socketio.emit('connected', {'sid': request.sid},
                  namespace=SOCKETIO_NAMESPACE,
                  to=request.sid)
