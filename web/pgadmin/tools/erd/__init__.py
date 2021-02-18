##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the erd tool."""
import simplejson as json

from flask import url_for, request
from flask import render_template, current_app as app
from flask_security import login_required
from flask_babelex import gettext
from werkzeug.useragents import UserAgent
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
    PREF_LABEL_DISPLAY
from .utils import ERDHelper
from pgadmin.utils.exception import ConnectionLost

MODULE_NAME = 'erd'


class ERDModule(PgAdminModule):
    """
    class ERDModule(PgAdminModule)

        A module class for ERD derived from PgAdminModule.
    """

    LABEL = gettext("ERD tool")

    def get_own_menuitems(self):
        return {}

    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.erd',
            'path': url_for('erd.index') + "erd",
            'when': None
        }]

    def get_panels(self):
        return []

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
            'erd.tables',
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

    close_url = request.form['close_url']

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

    s = Server.query.filter_by(id=params['sid']).first()

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
        close_url=close_url,
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


@blueprint.route('/sql/<int:trans_id>/<int:sgid>/<int:sid>/<int:did>',
                 methods=["POST"],
                 endpoint='sql')
@login_required
def sql(trans_id, sgid, sid, did):
    data = json.loads(request.data, encoding='utf-8')
    helper = ERDHelper(trans_id, sid, did)
    conn = _get_connection(sid, did, trans_id)

    sql = ''
    for tab_key, tab_data in data.get('nodes', {}).items():
        sql += '\n\n' + helper.get_table_sql(tab_data)

    for link_key, link_data in data.get('links', {}).items():
        link_sql, name = fkey_utils.get_sql(conn, link_data, None)
        sql += '\n\n' + link_sql

    return make_json_response(
        data=sql,
        status=200
    )


@blueprint.route('/tables/<int:trans_id>/<int:sgid>/<int:sid>/<int:did>',
                 methods=["GET"],
                 endpoint='tables')
@login_required
def tables(trans_id, sgid, sid, did):
    helper = ERDHelper(trans_id, sid, did)
    _get_connection(sid, did, trans_id)
    status, tables = helper.get_all_tables()

    if not status:
        return internal_server_error(errormsg=tables)

    return make_json_response(
        data=tables,
        status=200
    )


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
