##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the schema_diff frame."""
import simplejson as json
import pickle
import random

from flask import Response, session, url_for, request
from flask import render_template, current_app as app
from flask_security import current_user, login_required
from flask_babelex import gettext
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response, bad_request, \
    make_response as ajax_response, internal_server_error
from pgadmin.model import Server
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.model import SchemaDiffModel
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.driver import get_driver
from pgadmin.utils.preferences import Preferences

MODULE_NAME = 'schema_diff'


class SchemaDiffModule(PgAdminModule):
    """
    class SchemaDiffModule(PgAdminModule)

        A module class for Schema Diff derived from PgAdminModule.
    """

    LABEL = gettext("Schema Diff")

    def get_own_menuitems(self):
        return {}

    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.schema_diff',
            'path': url_for('schema_diff.index') + "schema_diff",
            'when': None
        }]

    def get_panels(self):
        return []

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
            'schema_diff.compare',
            'schema_diff.poll',
            'schema_diff.ddl_compare',
            'schema_diff.connect_server',
            'schema_diff.connect_database',
            'schema_diff.get_server',
            'schema_diff.close'
        ]

    def register_preferences(self):
        self.preference.register(
            'display', 'schema_diff_new_browser_tab',
            gettext("Open in new browser tab"), 'boolean', False,
            category_label=gettext('Display'),
            help_str=gettext('If set to True, the Schema Diff '
                             'will be opened in a new browser tab.')
        )

        self.preference.register(
            'display', 'ignore_whitespaces',
            gettext("Ignore whitespaces"), 'boolean', False,
            category_label=gettext('Display'),
            help_str=gettext('If set to True, then the Schema Diff '
                             'tool ignores the whitespaces while comparing '
                             'the string objects. Whitespace includes space, '
                             'tabs, and CRLF')
        )


blueprint = SchemaDiffModule(MODULE_NAME, __name__, static_url_path='/static')


@blueprint.route("/")
@login_required
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
        editor_title=editor_title
    )


@blueprint.route("/schema_diff.js")
@login_required
def script():
    """render the required javascript"""
    return Response(
        response=render_template("schema_diff/js/schema_diff.js", _=gettext),
        status=200,
        mimetype="application/javascript"
    )


def check_transaction_status(trans_id):
    """
    This function is used to check the transaction id
    is available in the session object.

    Args:
        trans_id:
    """

    if 'schemaDiff' not in session:
        return False, gettext(
            'Transaction ID not found in the session.'
        ), None, None

    schema_diff_data = session['schemaDiff']

    # Return from the function if transaction id not found
    if str(trans_id) not in schema_diff_data:
        return False, gettext(
            'Transaction ID not found in the session.'
        ), None, None

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
    '/initialize',
    methods=["GET"],
    endpoint="initialize"
)
@login_required
def initialize():
    """
    This function will initialize the schema diff and return the list
    of all the server's.
    """
    trans_id = None
    try:
        # Create a unique id for the transaction
        trans_id = str(random.randint(1, 9999999))

        if 'schemaDiff' not in session:
            schema_diff_data = dict()
        else:
            schema_diff_data = session['schemaDiff']

        # Use pickle to store the Schema Diff Model which will be used
        # later by the diff module.
        schema_diff_data[trans_id] = {
            'diff_model_obj': pickle.dumps(SchemaDiffModel(), -1)
        }

        # Store the schema diff dictionary into the session variable
        session['schemaDiff'] = schema_diff_data

    except Exception as e:
        app.logger.exception(e)

    return make_json_response(
        data={'schemaDiffTransId': trans_id})


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
@login_required
def servers():
    """
    This function will return the list of servers for the specified
    server id.
    """
    res = {}
    try:
        """Return a JSON document listing the server groups for the user"""
        driver = get_driver(PG_DEFAULT_DRIVER)

        from pgadmin.browser.server_groups.servers import\
            server_icon_and_background

        for server in Server.query.filter_by(user_id=current_user.id):
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
@login_required
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
@login_required
def connect_server(sid):
    server = Server.query.filter_by(id=sid).first()
    view = SchemaDiffRegistry.get_node_view('server')
    return view.connect(server.servergroup_id, sid)


@blueprint.route(
    '/database/connect/<int:sid>/<int:did>',
    methods=["POST"],
    endpoint="connect_database"
)
@login_required
def connect_database(sid, did):
    server = Server.query.filter_by(id=sid).first()
    view = SchemaDiffRegistry.get_node_view('database')
    return view.connect(server.servergroup_id, sid, did)


@blueprint.route(
    '/databases/<int:sid>',
    methods=["GET"],
    endpoint="databases"
)
@login_required
def databases(sid):
    """
    This function will return the list of databases for the specified
    server id.
    """
    res = []
    try:
        view = SchemaDiffRegistry.get_node_view('database')

        server = Server.query.filter_by(id=sid).first()
        response = view.nodes(gid=server.servergroup_id, sid=sid)
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
@login_required
def schemas(sid, did):
    """
    This function will return the list of schemas for the specified
    server id and database id.
    """
    res = []
    try:
        view = SchemaDiffRegistry.get_node_view('schema')
        server = Server.query.filter_by(id=sid).first()
        response = view.nodes(gid=server.servergroup_id, sid=sid, did=did)
        if response.status_code == 200:
            schemas = json.loads(response.data)['data']
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


@blueprint.route(
    '/compare/<int:trans_id>/<int:source_sid>/<int:source_did>/'
    '<int:source_scid>/<int:target_sid>/<int:target_did>/<int:target_scid>',
    methods=["GET"],
    endpoint="compare"
)
@login_required
def compare(trans_id, source_sid, source_did, source_scid,
            target_sid, target_did, target_scid):
    """
    This function will compare the two schemas.
    """
    # Check the transaction and connection status
    status, error_msg, diff_model_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
        return make_json_response(success=0, errormsg=error_msg, status=404)

    # Server version compatibility check
    status, msg = check_version_compatibility(source_sid, target_sid)

    if not status:
        return make_json_response(success=0, errormsg=msg, status=428)

    comparison_result = []

    diff_model_obj.set_comparison_info(gettext("Comparing objects..."), 0)
    update_session_diff_transaction(trans_id, session_obj,
                                    diff_model_obj)

    try:
        pref = Preferences.module('schema_diff')
        ignore_whitespaces = pref.preference('ignore_whitespaces').get()

        all_registered_nodes = SchemaDiffRegistry.get_registered_nodes()
        node_percent = round(100 / len(all_registered_nodes))
        total_percent = 0

        for node_name, node_view in all_registered_nodes.items():
            view = SchemaDiffRegistry.get_node_view(node_name)
            if hasattr(view, 'compare'):
                msg = gettext('Comparing {0}').\
                    format(gettext(view.blueprint.collection_label))
                diff_model_obj.set_comparison_info(msg, total_percent)
                # Update the message and total percentage in session object
                update_session_diff_transaction(trans_id, session_obj,
                                                diff_model_obj)

                res = view.compare(source_sid=source_sid,
                                   source_did=source_did,
                                   source_scid=source_scid,
                                   target_sid=target_sid,
                                   target_did=target_did,
                                   target_scid=target_scid,
                                   ignore_whitespaces=ignore_whitespaces)

                if res is not None:
                    comparison_result = comparison_result + res
            total_percent = total_percent + node_percent

        msg = gettext("Successfully compare the specified schemas.")
        total_percent = 100
        diff_model_obj.set_comparison_info(msg, total_percent)
        # Update the message and total percentage done in session object
        update_session_diff_transaction(trans_id, session_obj, diff_model_obj)

    except Exception as e:
        app.logger.exception(e)

    return make_json_response(data=comparison_result)


@blueprint.route(
    '/poll/<int:trans_id>', methods=["GET"], endpoint="poll"
)
@login_required
def poll(trans_id):
    """
    This function is used to check the schema comparison is completed or not.
    :param trans_id:
    :return:
    """

    # Check the transaction and connection status
    status, error_msg, diff_model_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
        return make_json_response(success=0, errormsg=error_msg, status=404)

    msg, diff_percentage = diff_model_obj.get_comparison_info()

    if diff_percentage == 100:
        diff_model_obj.set_comparison_info(gettext("Comparing objects..."), 0)
        update_session_diff_transaction(trans_id, session_obj,
                                        diff_model_obj)

    return make_json_response(data={'compare_msg': msg,
                                    'diff_percentage': diff_percentage})


@blueprint.route(
    '/ddl_compare/<int:trans_id>/<int:source_sid>/<int:source_did>/'
    '<int:source_scid>/<int:target_sid>/<int:target_did>/<int:target_scid>/'
    '<int:source_oid>/<int:target_oid>/<node_type>/<comp_status>/',
    methods=["GET"],
    endpoint="ddl_compare"
)
@login_required
def ddl_compare(trans_id, source_sid, source_did, source_scid,
                target_sid, target_did, target_scid, source_oid,
                target_oid, node_type, comp_status):
    """
    This function is used to compare the specified object and return the
    DDL comparison.
    """
    # Check the transaction and connection status
    status, error_msg, diff_model_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
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
    target_conn = src_manager.connection()

    if not (src_conn.connected() and target_conn.connected()):
        return False, gettext('Server(s) disconnected.')

    if src_manager.server_type != tar_manager.server_type:
        return False, gettext('Schema diff does not support the comparison '
                              'between Postgres Server and EDB Postgres '
                              'Advanced Server.')

    def get_round_val(x):
        if x < 10000:
            return x if x % 100 == 0 else x + 100 - x % 100
        else:
            return x + 10000 - x % 10000

    if get_round_val(src_manager.version) == \
            get_round_val(tar_manager.version):
        return True, None

    return False, gettext('Source and Target database server must be of '
                          'the same major version.')
