##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the erd tool."""
import json

from flask import url_for, request, Response
from flask import render_template, current_app as app
from flask_security import login_required
from flask_babel import gettext
from werkzeug.user_agent import UserAgent
from pgadmin.utils import PgAdminModule, \
    SHORTCUT_FIELDS as shortcut_fields
from pgadmin.utils.ajax import make_json_response, bad_request, \
    internal_server_error
from pgadmin.model import Server
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.driver import get_driver
from pgadmin.browser.utils import underscore_unescape
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import get_schemas
from pgadmin.browser.server_groups.servers.databases.schemas.tables. \
    constraints.foreign_key import utils as fkey_utils
from pgadmin.utils.constants import PREF_LABEL_KEYBOARD_SHORTCUTS, \
    PREF_LABEL_DISPLAY, PREF_LABEL_OPTIONS
from .utils import ERDHelper
from pgadmin.utils.exception import ConnectionLost
from pgadmin.authenticate import socket_login_required
from ... import socketio

MODULE_NAME = 'erd'
SOCKETIO_NAMESPACE = '/{0}'.format(MODULE_NAME)


class ERDModule(PgAdminModule):
    """
    class ERDModule(PgAdminModule)

        A module class for ERD derived from PgAdminModule.
    """

    LABEL = gettext("ERD tool")

    def get_own_menuitems(self):
        return {}

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints
        """
        return [
            'erd.panel',
            'erd.initialize',
            'erd.prequisite',
            'erd.sql',
            'erd.close'
        ]

    def register_preferences(self):
        self.preference.register(
            'keyboard_shortcuts',
            'open_project',
            gettext('Open project'),
            'keyboardshortcut',
            {
                'alt': False,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 79,
                    'char': 'o'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'save_project',
            gettext('Save project'),
            'keyboardshortcut',
            {
                'alt': False,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 83,
                    'char': 's'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'save_project_as',
            gettext('Save project as'),
            'keyboardshortcut',
            {
                'alt': False,
                'shift': True,
                'control': True,
                'key': {
                    'key_code': 83,
                    'char': 's'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'generate_sql',
            gettext('Generate SQL'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 83,
                    'char': 's'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'download_image',
            gettext('Download image'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 73,
                    'char': 'i'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'add_table',
            gettext('Add table'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 65,
                    'char': 'a'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'edit_table',
            gettext('Edit table'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 69,
                    'char': 'e'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'clone_table',
            gettext('Clone table'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 67,
                    'char': 'c'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'drop_table',
            gettext('Drop table'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 68,
                    'char': 'd'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'add_edit_note',
            gettext('Add/Edit note'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 78,
                    'char': 'n'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'one_to_many',
            gettext('One to many link'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 79,
                    'char': 'o'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'many_to_many',
            gettext('Many to many link'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 77,
                    'char': 'm'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'auto_align',
            gettext('Auto align'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 76,
                    'char': 'l'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'show_details',
            gettext('Show more/fewer details'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': False,
                'control': True,
                'key': {
                    'key_code': 84,
                    'char': 't'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'zoom_to_fit',
            gettext('Zoom to fit'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': True,
                'control': False,
                'key': {
                    'key_code': 70,
                    'char': 'f'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'zoom_in',
            gettext('Zoom in'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': True,
                'control': False,
                'key': {
                    'key_code': 187,
                    'char': '+'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'zoom_out',
            gettext('Zoom out'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': True,
                'control': False,
                'key': {
                    'key_code': 189,
                    'char': '-'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'options',
            'sql_with_drop',
            gettext('SQL With DROP Table'),
            'boolean',
            False,
            category_label=PREF_LABEL_OPTIONS,
            help_str=gettext(
                'If enabled, the SQL generated by the ERD Tool will add '
                'DROP table DDL before each CREATE table DDL.'
            )
        )

        self.preference.register(
            'options',
            'table_relation_depth',
            gettext('Table Relation Depth'),
            'integer',
            -1,
            category_label=PREF_LABEL_OPTIONS,
            help_str=gettext(
                'The maximum depth pgAdmin should traverse to find '
                'related tables when generating an ERD for a table. '
                'Use -1 for no limit.'
            )
        )

        self.preference.register(
            'options', 'cardinality_notation',
            gettext('Cardinality Notation'), 'radioModern', 'crows',
            category_label=PREF_LABEL_OPTIONS, options=[
                {'label': gettext('Crow\'s foot'), 'value': 'crows'},
                {'label': gettext('Chen'), 'value': 'chen'},
            ],
            help_str=gettext(
                'Notation to be used to present cardinality.'
            )
        )

        self.preference.register(
            'options',
            'sql_with_drop',
            gettext('SQL With DROP Table'),
            'boolean',
            False,
            category_label=PREF_LABEL_OPTIONS,
            help_str=gettext(
                'If enabled, the SQL generated by the ERD Tool will add '
                'DROP table DDL before each CREATE table DDL.'
            )
        )


blueprint = ERDModule(MODULE_NAME, __name__, static_url_path='/static')


@blueprint.route(
    '/panel/<int:trans_id>',
    methods=["POST"],
    endpoint='panel'
)
@login_required
def panel(trans_id):
    """
    This method calls index.html to render the erd tool.

    Args:
        panel_title: Title of the panel
    """

    params = {
        'trans_id': trans_id,
        'title': request.form['title']
    }
    if request.args:
        params.update({k: v for k, v in request.args.items()})

    if 'gen' in params:
        params['gen'] = True if params['gen'] == 'true' else False

    # We need client OS information to render correct Keyboard shortcuts
    user_agent = UserAgent(request.headers.get('User-Agent'))

    """
    Animations and transitions are not automatically GPU accelerated and by
    default use browser's slow rendering engine. We need to set 'translate3d'
    value of '-webkit-transform' property in order to use GPU. After applying
    this property under linux, Webkit calculates wrong position of the
    elements so panel contents are not visible. To make it work, we need to
    explicitly set '-webkit-transform' property to 'none' for .ajs-notifier,
    .ajs-message, .ajs-modal classes.

    This issue is only with linux runtime application and observed in Query
    tool and debugger. When we open 'Open File' dialog then whole Query tool
    panel content is not visible though it contains HTML element in back end.

    The port number should have already been set by the runtime if we're
    running in desktop mode.
    """
    is_linux_platform = False

    from sys import platform as _platform
    if "linux" in _platform:
        is_linux_platform = True

    s = Server.query.filter_by(id=int(params['sid'])).first()

    params.update({
        'bgcolor': s.bgcolor,
        'fgcolor': s.fgcolor,
        'client_platform': user_agent.platform,
        'is_desktop_mode': app.PGADMIN_RUNTIME,
        'is_linux': is_linux_platform
    })

    return render_template(
        "erd/index.html",
        title=underscore_unescape(params['title']),
        params=json.dumps(params),
    )


@blueprint.route(
    '/initialize/<int:trans_id>/<int:sgid>/<int:sid>/<int:did>',
    methods=["POST"], endpoint='initialize'
)
@login_required
def initialize_erd(trans_id, sgid, sid, did):
    """
    This method is responsible for instantiating and initializing
    the erd tool object. It will also create a unique
    transaction id and store the information into session variable.

    Args:
        sgid: Server group Id
        sid: Server Id
        did: Database Id
    """
    # Read the data if present. Skipping read may cause connection
    # reset error if data is sent from the client
    if request.data:
        _ = request.data

    conn = _get_connection(sid, did, trans_id)

    return make_json_response(
        data={
            'connId': str(trans_id),
            'database': conn.db,
            'serverVersion': conn.manager.version,
        }
    )


def _get_connection(sid, did, trans_id):
    """
    Get the connection object of ERD.
    :param sid:
    :param did:
    :param trans_id:
    :return:
    """
    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
    try:
        conn = manager.connection(did=did, conn_id=trans_id,
                                  auto_reconnect=True,
                                  use_binary_placeholder=True)
        status, msg = conn.connect()
        if not status:
            app.logger.error(msg)
            raise ConnectionLost(sid, conn.db, trans_id)

        return conn
    except Exception as e:
        app.logger.error(e)
        raise


@blueprint.route('/prequisite/<int:trans_id>/<int:sgid>/<int:sid>/<int:did>',
                 methods=["GET"],
                 endpoint='prequisite')
@login_required
def prequisite(trans_id, sgid, sid, did):
    conn = _get_connection(sid, did, trans_id)
    helper = ERDHelper(trans_id, sid, did)
    status, col_types = helper.get_types()

    if not status:
        return internal_server_error(errormsg=col_types)

    status, schemas = get_schemas(conn, show_system_objects=False)

    if not status:
        return internal_server_error(errormsg=schemas)

    return make_json_response(
        data={
            'col_types': col_types,
            'schemas': schemas['rows']
        },
        status=200
    )


def translate_foreign_keys(tab_fks, tab_data, all_nodes):
    """
    This function will take the from table foreign keys and translate
    it into non oid based format. It will allow creating FK sql even
    if table is not already created.
    :param tab_fks: Table foreign keyss
    :param tab_data: Table data
    :param all_nodes: All the nodes info from ERD
    :return: Translated foreign key data
    """
    for tab_fk in tab_fks:
        if 'columns' not in tab_fk:
            continue
        try:
            remote_table = all_nodes[tab_fk['columns'][0]['references']]
        except KeyError:
            continue
        tab_fk['schema'] = tab_data['schema']
        tab_fk['table'] = tab_data['name']
        tab_fk['remote_schema'] = remote_table['schema']
        tab_fk['remote_table'] = remote_table['name']

        new_column = {
            'local_column': tab_fk['columns'][0]['local_column'],
            'referenced': tab_fk['columns'][0]['referenced']
        }
        tab_fk['columns'][0] = new_column

    return tab_fks


@blueprint.route('/sql/<int:trans_id>/<int:sgid>/<int:sid>/<int:did>',
                 methods=["POST"],
                 endpoint='sql')
@login_required
def sql(trans_id, sgid, sid, did):
    data = json.loads(request.data)
    with_drop = False
    if request.args and 'with_drop' in request.args:
        with_drop = True if request.args.get('with_drop') == 'true' else False

    helper = ERDHelper(trans_id, sid, did)
    conn = _get_connection(sid, did, trans_id)

    sql = ''
    tab_foreign_keys = []
    all_nodes = data.get('nodes', {})

    table_sql = ''
    for tab_key, tab_data in all_nodes.items():
        tab_fks = tab_data.pop('foreign_key', [])
        tab_foreign_keys.extend(translate_foreign_keys(tab_fks, tab_data,
                                                       all_nodes))
        table_sql += '\n\n' + helper.get_table_sql(tab_data,
                                                   with_drop=with_drop)

    if with_drop:
        for tab_fk in tab_foreign_keys:
            fk_sql = fkey_utils.get_delete_sql(conn, tab_fk)
            sql += '\n\n' + fk_sql

    if sql != '':
        sql += '\n\n'

    sql += table_sql
    for tab_fk in tab_foreign_keys:
        fk_sql, name = fkey_utils.get_sql(conn, tab_fk, None)
        sql += '\n\n' + fk_sql

    return make_json_response(
        data=sql,
        status=200
    )


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


@socketio.on('tables', namespace=SOCKETIO_NAMESPACE)
@socket_login_required
def tables(params):
    try:
        helper = ERDHelper(params['trans_id'], params['sid'], params['did'])
        _get_connection(params['sid'], params['did'], params['trans_id'])

        status, tables = helper.get_all_tables(params.get('scid', None),
                                               params.get('tid', None))

        if not status:
            tables = tables.json if isinstance(tables, Response) else tables
            socketio.emit('tables_failed', tables,
                          namespace=SOCKETIO_NAMESPACE,
                          to=request.sid)
            return
        socketio.emit('tables_success', tables, namespace=SOCKETIO_NAMESPACE,
                      to=request.sid)
    except Exception as e:
        socketio.emit('tables_failed', str(e), namespace=SOCKETIO_NAMESPACE,
                      to=request.sid)


@blueprint.route('/close/<int:trans_id>/<int:sgid>/<int:sid>/<int:did>',
                 methods=["DELETE"],
                 endpoint='close')
@login_required
def close(trans_id, sgid, sid, did):
    manager = get_driver(
        PG_DEFAULT_DRIVER).connection_manager(sid)
    if manager is not None:
        conn = manager.connection(did=did, conn_id=trans_id)

        # Release the connection
        if conn.connected():
            conn.cancel_transaction(trans_id, did=did)
            manager.release(did=did, conn_id=trans_id)
    return make_json_response(data={'status': True})
