##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import logging
import os
import sys
from abc import ABCMeta, abstractmethod, abstractproperty
from smtplib import SMTPConnectError, SMTPResponseException, \
    SMTPServerDisconnected, SMTPDataError, SMTPHeloError, SMTPException, \
    SMTPAuthenticationError, SMTPSenderRefused, SMTPRecipientsRefused
from socket import error as SOCKETErrorException
from urllib.request import urlopen

import six
import time
from flask import current_app, render_template, url_for, make_response, \
    flash, Response, request, after_this_request, redirect, session
from flask_babelex import gettext
from flask_gravatar import Gravatar
from flask_login import current_user, login_required
from flask_security.changeable import change_user_password
from flask_security.decorators import anonymous_user_required
from flask_security.recoverable import reset_password_token_status, \
    generate_reset_password_token, update_password
from flask_security.signals import reset_password_instructions_sent
from flask_security.utils import config_value, do_flash, get_url, \
    get_message, slash_url_suffix, login_user, send_mail, logout_user
from flask_security.views import _security, _commit, _ctx
from werkzeug.datastructures import MultiDict

import config
from pgadmin import current_blueprint
from pgadmin.settings import get_setting, store_setting
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response
from pgadmin.utils.csrf import pgCSRFProtect
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.menu import MenuItem
from pgadmin.browser.register_browser_preferences import \
    register_browser_preferences
from pgadmin.utils.master_password import validate_master_password, \
    set_masterpass_check_text, cleanup_master_password, get_crypt_key, \
    set_crypt_key, process_masterpass_disabled
from pgadmin.model import User
from pgadmin.utils.constants import MIMETYPE_APP_JS, PGADMIN_NODE,\
    INTERNAL, KERBEROS

try:
    from flask_security.views import default_render_json
except ImportError as e:
    # Support Flask-Security-Too == 3.2
    if sys.version_info < (3, 8):
        from flask_security.views import _render_json as default_render_json

MODULE_NAME = 'browser'
BROWSER_STATIC = 'browser.static'
JQUERY_ACIPLUGIN = 'jquery.aciplugin'
BROWSER_INDEX = 'browser.index'
PGADMIN_BROWSER = 'pgAdmin.Browser'
PASS_ERROR_MSG = gettext('Your password has not been changed.')
SMTP_SOCKET_ERROR = gettext(
    'SMTP Socket error: {error}\n {pass_error}').format(
        error={}, pass_error=PASS_ERROR_MSG)
SMTP_ERROR = gettext('SMTP error: {error}\n {pass_error}').format(
    error={}, pass_error=PASS_ERROR_MSG)
PASS_ERROR = gettext('Error: {error}\n {pass_error}').format(
    error={}, pass_error=PASS_ERROR_MSG)


class BrowserModule(PgAdminModule):
    LABEL = gettext('Browser')

    def get_own_stylesheets(self):
        stylesheets = []
        context_menu_file = 'vendor/jQuery-contextMenu/' \
                            'jquery.contextMenu.min.css'
        wcdocker_file = 'vendor/wcDocker/wcDocker.min.css'
        if current_app.debug:
            context_menu_file = 'vendor/jQuery-contextMenu/' \
                                'jquery.contextMenu.css'
            wcdocker_file = 'vendor/wcDocker/wcDocker.css'
        # Add browser stylesheets
        for (endpoint, filename) in [
            ('static', 'vendor/codemirror/codemirror.css'),
            ('static', 'vendor/codemirror/addon/dialog/dialog.css'),
            ('static', context_menu_file),
            ('static', wcdocker_file),
            (BROWSER_STATIC, 'vendor/aciTree/css/aciTree.css')
        ]:
            stylesheets.append(url_for(endpoint, filename=filename))
        return stylesheets

    def get_own_javascripts(self):
        scripts = list()
        scripts.append({
            'name': 'alertify',
            'path': url_for(
                'static',
                filename='vendor/alertifyjs/alertify' if current_app.debug
                else 'vendor/alertifyjs/alertify.min'
            ),
            'exports': 'alertify',
            'preloaded': True
        })
        scripts.append({
            'name': 'jqueryui.position',
            'path': url_for(
                'static',
                filename='vendor/jQuery-contextMenu/jquery.ui.position' if
                current_app.debug else
                'vendor/jQuery-contextMenu/jquery.ui.position.min'
            ),
            'deps': ['jquery'],
            'exports': 'jQuery.ui.position',
            'preloaded': True
        })
        scripts.append({
            'name': 'jquery.contextmenu',
            'path': url_for(
                'static',
                filename='vendor/jQuery-contextMenu/jquery.contextMenu' if
                current_app.debug else
                'vendor/jQuery-contextMenu/jquery.contextMenu.min'
            ),
            'deps': ['jquery', 'jqueryui.position'],
            'exports': 'jQuery.contextMenu',
            'preloaded': True
        })
        scripts.append({
            'name': JQUERY_ACIPLUGIN,
            'path': url_for(
                BROWSER_STATIC,
                filename='vendor/aciTree/jquery.aciPlugin.min'
            ),
            'deps': ['jquery'],
            'exports': 'aciPluginClass',
            'preloaded': True
        })
        scripts.append({
            'name': 'jquery.acitree',
            'path': url_for(
                BROWSER_STATIC,
                filename='vendor/aciTree/jquery.aciTree' if
                current_app.debug else 'vendor/aciTree/jquery.aciTree.min'
            ),
            'deps': ['jquery', JQUERY_ACIPLUGIN],
            'exports': 'aciPluginClass.plugins.aciTree',
            'preloaded': True
        })
        scripts.append({
            'name': 'jquery.acisortable',
            'path': url_for(
                BROWSER_STATIC,
                filename='vendor/aciTree/jquery.aciSortable.min'
            ),
            'deps': ['jquery', JQUERY_ACIPLUGIN],
            'exports': 'aciPluginClass.plugins.aciSortable',
            'when': None,
            'preloaded': True
        })
        scripts.append({
            'name': 'jquery.acifragment',
            'path': url_for(
                BROWSER_STATIC,
                filename='vendor/aciTree/jquery.aciFragment.min'
            ),
            'deps': ['jquery', JQUERY_ACIPLUGIN],
            'exports': 'aciPluginClass.plugins.aciFragment',
            'when': None,
            'preloaded': True
        })
        scripts.append({
            'name': 'wcdocker',
            'path': url_for(
                'static',
                filename='vendor/wcDocker/wcDocker' if current_app.debug
                else 'vendor/wcDocker/wcDocker.min'
            ),
            'deps': ['jquery.contextmenu'],
            'exports': '',
            'preloaded': True
        })

        scripts.append({
            'name': 'pgadmin.browser.datamodel',
            'path': url_for(BROWSER_STATIC, filename='js/datamodel'),
            'preloaded': True
        })

        for name, script in [
            [PGADMIN_BROWSER, 'js/browser'],
            ['pgadmin.browser.endpoints', 'js/endpoints'],
            ['pgadmin.browser.error', 'js/error']
        ]:
            scripts.append({
                'name': name,
                'path': url_for(BROWSER_INDEX) + script,
                'preloaded': True
            })

        for name, script in [
            ['pgadmin.browser.node', 'js/node'],
            ['pgadmin.browser.messages', 'js/messages'],
            ['pgadmin.browser.collection', 'js/collection']
        ]:
            scripts.append({
                'name': name,
                'path': url_for(BROWSER_INDEX) + script,
                'preloaded': True,
                'deps': ['pgadmin.browser.datamodel']
            })

        for name, end in [
            ['pgadmin.browser.menu', 'js/menu'],
            ['pgadmin.browser.panel', 'js/panel'],
            ['pgadmin.browser.frame', 'js/frame']
        ]:
            scripts.append({
                'name': name, 'path': url_for(BROWSER_STATIC, filename=end),
                'preloaded': True})

        scripts.append({
            'name': 'pgadmin.browser.node.ui',
            'path': url_for(BROWSER_STATIC, filename='js/node.ui'),
            'when': 'server_group'
        })

        for module in self.submodules:
            scripts.extend(module.get_own_javascripts())
        return scripts

    def get_own_menuitems(self):
        menus = {
            'file_items': [
                MenuItem(
                    name='mnu_locklayout',
                    module=PGADMIN_BROWSER,
                    label=gettext('Lock Layout'),
                    priority=999,
                    menu_items=[MenuItem(
                        name='mnu_lock_none',
                        module=PGADMIN_BROWSER,
                        callback='mnu_lock_none',
                        priority=0,
                        label=gettext('None'),
                        checked=True
                    ), MenuItem(
                        name='mnu_lock_docking',
                        module=PGADMIN_BROWSER,
                        callback='mnu_lock_docking',
                        priority=1,
                        label=gettext('Prevent Docking'),
                        checked=False
                    ), MenuItem(
                        name='mnu_lock_full',
                        module=PGADMIN_BROWSER,
                        callback='mnu_lock_full',
                        priority=2,
                        label=gettext('Full Lock'),
                        checked=False
                    )]
                )
            ]
        }

        # We need 'Configure...' and 'View log...' Menu only in runtime.
        if current_app.PGADMIN_RUNTIME:
            full_screen_label = gettext('Enter Full Screen  (F10)')
            actual_size_label = gettext('Actual Size (Ctrl 0)')
            zoom_in_label = gettext('Zoom In (Ctrl +)')
            zoom_out_label = gettext('Zoom Out (Ctrl -)')

            if sys.platform == 'darwin':
                full_screen_label = gettext('Enter Full Screen  (Cmd Ctrl F)')
                actual_size_label = gettext('Actual Size (Cmd 0)')
                zoom_in_label = gettext('Zoom In (Cmd +)')
                zoom_out_label = gettext('Zoom Out (Cmd -)')

            menus['file_items'].append(
                MenuItem(
                    name='mnu_runtime',
                    module=PGADMIN_BROWSER,
                    label=gettext('Runtime'),
                    priority=999,
                    menu_items=[MenuItem(
                        name='mnu_configure_runtime',
                        module=PGADMIN_BROWSER,
                        callback='mnu_configure_runtime',
                        priority=0,
                        label=gettext('Configure...')
                    ), MenuItem(
                        name='mnu_viewlog_runtime',
                        module=PGADMIN_BROWSER,
                        callback='mnu_viewlog_runtime',
                        priority=1,
                        label=gettext('View log...'),
                        below=True,
                    ), MenuItem(
                        name='mnu_toggle_fullscreen_runtime',
                        module=PGADMIN_BROWSER,
                        callback='mnu_toggle_fullscreen_runtime',
                        priority=2,
                        label=full_screen_label
                    ), MenuItem(
                        name='mnu_actual_size_runtime',
                        module=PGADMIN_BROWSER,
                        callback='mnu_actual_size_runtime',
                        priority=3,
                        label=actual_size_label
                    ), MenuItem(
                        name='mnu_zoomin_runtime',
                        module=PGADMIN_BROWSER,
                        callback='mnu_zoomin_runtime',
                        priority=4,
                        label=zoom_in_label
                    ), MenuItem(
                        name='mnu_zoomout_runtime',
                        module=PGADMIN_BROWSER,
                        callback='mnu_zoomout_runtime',
                        priority=5,
                        label=zoom_out_label
                    )]
                )
            )

        return menus

    def register_preferences(self):
        register_browser_preferences(self)

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return [BROWSER_INDEX, 'browser.nodes',
                'browser.check_master_password',
                'browser.set_master_password',
                'browser.reset_master_password',
                'browser.lock_layout',
                'browser.signal_runtime']


blueprint = BrowserModule(MODULE_NAME, __name__)


@six.add_metaclass(ABCMeta)
class BrowserPluginModule(PgAdminModule):
    """
    Abstract base class for browser submodules.

    It helps to define the node for each and every node comes under the browser
    tree. It makes sure every module comes under browser will have prefix
    '/browser', and sets the 'url_prefix', 'static_url_path', etc.

    Also, creates some of the preferences to be used by the node.
    """

    browser_url_prefix = blueprint.url_prefix + '/'
    SHOW_ON_BROWSER = True

    def __init__(self, import_name, **kwargs):
        """
        Construct a new 'BrowserPluginModule' object.

        :param import_name: Name of the module
        :param **kwargs:    Extra parameters passed to the base class
                            pgAdminModule.

        :return: returns nothing

        It sets the url_prefix to based on the 'node_path'. And,
        static_url_path to relative path to '/static'.

        Every module extended from this will be identified as 'NODE-<type>'.

        Also, create a preference 'show_node_<type>' to fetch whether it
        can be shown in the browser or not. Also,  refer to the
        browser-preference.
        """
        kwargs.setdefault("url_prefix", self.node_path)
        kwargs.setdefault("static_url_path", '/static')

        self.browser_preference = None
        self.pref_show_system_objects = None
        self.pref_show_node = None

        super(BrowserPluginModule, self).__init__(
            "NODE-%s" % self.node_type,
            import_name,
            **kwargs
        )

    @property
    def jssnippets(self):
        """
        Returns a snippet of javascript to include in the page
        """
        return []

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False

    def get_own_javascripts(self):
        """
        Returns the list of javascripts information used by the module.

        Each javascripts information must contain name, path of the script.

        The name must be unique for each module, hence - in order to refer them
        properly, we do use 'pgadmin.node.<type>' as norm.

        That can also refer to when to load the script.

        i.e.
        We may not need to load the javascript of table node, when we're
        not yet connected to a server, and no database is loaded. Hence - it
        make sense to load them when a database is loaded.

        We may also add 'deps', which also refers to the list of javascripts,
        it may depends on.
        """
        scripts = []

        if self.module_use_template_javascript:
            scripts.extend([{
                'name': PGADMIN_NODE % self.node_type,
                'path': url_for(BROWSER_INDEX
                                ) + '%s/module' % self.node_type,
                'when': self.script_load,
                'is_template': True
            }])
        else:
            scripts.extend([{
                'name': PGADMIN_NODE % self.node_type,
                'path': url_for(
                    '%s.static' % self.name,
                    filename=('js/%s' % self.node_type)
                ),
                'when': self.script_load,
                'is_template': False
            }])

        for module in self.submodules:
            scripts.extend(module.get_own_javascripts())

        return scripts

    def generate_browser_node(
        self, node_id, parent_id, label, icon, inode, node_type, **kwargs
    ):
        """
        Helper function to create a browser node for this particular subnode.

        :param node_id:   Unique Id for each node
        :param parent_id: Id of the parent.
        :param label:     Label for the node
        :param icon:      Icon for displaying along with this node on browser
                          tree. Icon refers to a class name, it refers to.
        :param inode:     True/False.
                          Used by the browser tree node to check, if the
                          current node will have children or not.
        :param node_type: String to refer to the node type.
        :param **kwargs:  A node can have extra information other than this
                          data, which can be passed as key-value pair as
                          argument here.
                          i.e. A database, server node can have extra
                          information like connected, or not.

        Returns a dictionary object representing this node object for the
        browser tree.
        """
        obj = {
            "id": "%s/%s" % (node_type, node_id),
            "label": label,
            "icon": icon,
            "inode": inode,
            "_type": node_type,
            "_id": node_id,
            "_pid": parent_id,
            "module": PGADMIN_NODE % node_type
        }
        for key in kwargs:
            obj.setdefault(key, kwargs[key])
        return obj

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                "browser/css/node.css",
                node_type=self.node_type,
                _=gettext
            )]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)
        return snippets

    @abstractmethod
    def get_nodes(self):
        """
        Each browser module is responsible for fetching
        its own tree subnodes.
        """
        return []

    @abstractproperty
    def node_type(self):
        pass

    @abstractproperty
    def script_load(self):
        """
        This property defines, when to load this script.
        In order to allow creation of an object, we need to load script for any
        node at the parent level.

        i.e.
        - In order to allow creating a server object, it should be loaded at
          server-group node.
        """
        pass

    @property
    def node_path(self):
        """
        Defines the url path prefix for this submodule.
        """
        return self.browser_url_prefix + self.node_type

    @property
    def javascripts(self):
        """
        Override the javascript of PgAdminModule, so that - we don't return
        javascripts from the get_own_javascripts itself.
        """
        return []

    @property
    def label(self):
        """
        Module label.
        """
        return self.LABEL

    @property
    def show_node(self):
        """
        A proper to check to show node for this module on the browser tree or
        not.

        Relies on show_node preference object, otherwise on the SHOW_ON_BROWSER
        default value.
        """
        if self.pref_show_node:
            return self.pref_show_node.get()
        else:
            return self.SHOW_ON_BROWSER

    @property
    def show_system_objects(self):
        """
        Show/Hide the system objects in the database server.
        """
        if self.pref_show_system_objects:
            return self.pref_show_system_objects.get()
        else:
            return False

    def register_preferences(self):
        """
        Registers the preferences object for this module.

        Sets the browser_preference, show_system_objects, show_node preference
        objects for this submodule.
        """
        # Add the node information for browser, not in respective node
        # preferences
        self.browser_preference = blueprint.preference
        self.pref_show_system_objects = blueprint.preference.preference(
            'display', 'show_system_objects'
        )
        self.pref_show_node = self.browser_preference.preference(
            'node', 'show_node_' + self.node_type,
            self.label, 'boolean', self.SHOW_ON_BROWSER,
            category_label=gettext('Nodes')
        )


def _get_logout_url():
    if config.SERVER_MODE and\
            session['_auth_source_manager_obj']['current_source'] == \
            KERBEROS:
        return '{0}?next={1}'.format(url_for(
            'authenticate.kerberos_logout'), url_for(BROWSER_INDEX))

    return '{0}?next={1}'.format(
        url_for('security.logout'), url_for(BROWSER_INDEX))


def _get_supported_browser():
    """
    This function return supported browser.
    :return: browser name, browser known, browser version
    """
    browser = request.user_agent.browser
    version = request.user_agent.version and int(
        request.user_agent.version.split('.')[0])

    browser_name = None
    browser_known = True
    if browser == 'chrome' and version < 72:
        browser_name = 'Chrome'
    elif browser == 'firefox' and version < 65:
        browser_name = 'Firefox'
    # comparing EdgeHTML engine version
    elif browser == 'edge' and version < 18:
        browser_name = 'Edge'
        # browser version returned by edge browser is actual EdgeHTML
        # engine version. Below code gets actual browser version using
        # EdgeHTML version
        engine_to_actual_browser_version = {
            16: 41,
            17: 42,
            18: 44
        }
        version = engine_to_actual_browser_version.get(version, '< 44')
    elif browser == 'safari' and version < 12:
        browser_name = 'Safari'
    elif browser == 'msie':
        browser_name = 'Internet Explorer'
    elif browser != 'chrome' and browser != 'firefox' and \
            browser != 'edge' and browser != 'safari':
        browser_name = browser
        browser_known = False

    return browser_name, browser_known, version


def check_browser_upgrade():
    """
    This function is used to check the browser version.
    :return:
    """
    data = None
    url = '%s?version=%s' % (config.UPGRADE_CHECK_URL, config.APP_VERSION)
    current_app.logger.debug('Checking version data at: %s' % url)

    try:
        # Do not wait for more than 5 seconds.
        # It stuck on rendering the browser.html, while working in the
        # broken network.
        if os.path.exists(config.CA_FILE):
            response = urlopen(url, data, 5, cafile=config.CA_FILE)
        else:
            response = urlopen(url, data, 5)
        current_app.logger.debug(
            'Version check HTTP response code: %d' % response.getcode()
        )

        if response.getcode() == 200:
            data = json.loads(response.read().decode('utf-8'))
            current_app.logger.debug('Response data: %s' % data)
    except Exception:
        current_app.logger.exception('Exception when checking for update')

    if data is not None and \
        data[config.UPGRADE_CHECK_KEY]['version_int'] > \
            config.APP_VERSION_INT:
        msg = render_template(
            MODULE_NAME + "/upgrade.html",
            current_version=config.APP_VERSION,
            upgrade_version=data[config.UPGRADE_CHECK_KEY]['version'],
            product_name=config.APP_NAME,
            download_url=data[config.UPGRADE_CHECK_KEY]['download_url']
        )

        flash(msg, 'warning')


@blueprint.route("/")
@pgCSRFProtect.exempt
@login_required
def index():
    """Render and process the main browser window."""
    # Register Gravatar module with the app only if required
    if config.SHOW_GRAVATAR_IMAGE:
        Gravatar(
            current_app,
            size=100,
            rating='g',
            default='retro',
            force_default=False,
            use_ssl=True,
            base_url=None
        )

    # Check the browser is a supported version
    # NOTE: If the checks here are updated, make sure the supported versions
    # at https://www.pgadmin.org/faq/#11 are updated to match!
    if config.CHECK_SUPPORTED_BROWSER:
        browser_name, browser_known, version = _get_supported_browser()

        if browser_name is not None:
            msg = render_template(
                MODULE_NAME + "/browser.html",
                version=version,
                browser=browser_name,
                known=browser_known
            )

            flash(msg, 'warning')

    # Get the current version info from the website, and flash a message if
    # the user is out of date, and the check is enabled.
    if config.UPGRADE_CHECK_ENABLED:
        last_check = get_setting('LastUpdateCheck', default='0')
        today = time.strftime('%Y%m%d')
        if int(last_check) < int(today):
            check_browser_upgrade()
            store_setting('LastUpdateCheck', today)

    auth_only_internal = False
    auth_source = []

    session['allow_save_password'] = True

    if config.SERVER_MODE:
        if len(config.AUTHENTICATION_SOURCES) == 1\
                and INTERNAL in config.AUTHENTICATION_SOURCES:
            auth_only_internal = True
        auth_source = session['_auth_source_manager_obj'][
            'source_friendly_name']

        if session['_auth_source_manager_obj']['current_source'] == KERBEROS:
            session['allow_save_password'] = False

    response = Response(render_template(
        MODULE_NAME + "/index.html",
        username=current_user.username,
        auth_source=auth_source,
        is_admin=current_user.has_role("Administrator"),
        logout_url=_get_logout_url(),
        _=gettext,
        auth_only_internal=auth_only_internal
    ))

    # Set the language cookie after login, so next time the user will have that
    # same option at the login time.
    misc_preference = Preferences.module('misc')
    user_languages = misc_preference.preference(
        'user_language'
    )
    language = 'en'
    if user_languages:
        language = user_languages.get() or 'en'

    domain = dict()
    if config.COOKIE_DEFAULT_DOMAIN and\
            config.COOKIE_DEFAULT_DOMAIN != 'localhost':
        domain['domain'] = config.COOKIE_DEFAULT_DOMAIN

    response.set_cookie("PGADMIN_LANGUAGE", value=language,
                        path=config.COOKIE_DEFAULT_PATH,
                        secure=config.SESSION_COOKIE_SECURE,
                        httponly=config.SESSION_COOKIE_HTTPONLY,
                        samesite=config.SESSION_COOKIE_SAMESITE,
                        **domain)

    return response


@blueprint.route("/js/utils.js")
@pgCSRFProtect.exempt
@login_required
def utils():
    layout = get_setting('Browser/Layout', default='')
    snippets = []

    prefs = Preferences.module('paths')

    pg_help_path_pref = prefs.preference('pg_help_path')
    pg_help_path = pg_help_path_pref.get()

    edbas_help_path_pref = prefs.preference('edbas_help_path')
    edbas_help_path = edbas_help_path_pref.get()

    # Get sqleditor options
    prefs = Preferences.module('sqleditor')

    editor_tab_size_pref = prefs.preference('tab_size')
    editor_tab_size = editor_tab_size_pref.get()

    editor_use_spaces_pref = prefs.preference('use_spaces')
    editor_use_spaces = editor_use_spaces_pref.get()

    editor_wrap_code_pref = prefs.preference('wrap_code')
    editor_wrap_code = editor_wrap_code_pref.get()

    brace_matching_pref = prefs.preference('brace_matching')
    brace_matching = brace_matching_pref.get()

    insert_pair_brackets_perf = prefs.preference('insert_pair_brackets')
    insert_pair_brackets = insert_pair_brackets_perf.get()

    # This will be opposite of use_space option
    editor_indent_with_tabs = False if editor_use_spaces else True

    # Try to fetch current libpq version from the driver
    try:
        from config import PG_DEFAULT_DRIVER
        from pgadmin.utils.driver import get_driver
        driver = get_driver(PG_DEFAULT_DRIVER)
        pg_libpq_version = driver.libpq_version()
    except Exception:
        pg_libpq_version = 0

    for submodule in current_blueprint.submodules:
        snippets.extend(submodule.jssnippets)
    return make_response(
        render_template(
            'browser/js/utils.js',
            layout=layout,
            jssnippets=snippets,
            pg_help_path=pg_help_path,
            edbas_help_path=edbas_help_path,
            editor_tab_size=editor_tab_size,
            editor_use_spaces=editor_use_spaces,
            editor_wrap_code=editor_wrap_code,
            editor_brace_matching=brace_matching,
            editor_insert_pair_brackets=insert_pair_brackets,
            editor_indent_with_tabs=editor_indent_with_tabs,
            app_name=config.APP_NAME,
            app_version_int=config.APP_VERSION_INT,
            pg_libpq_version=pg_libpq_version,
            support_ssh_tunnel=config.SUPPORT_SSH_TUNNEL,
            logout_url=_get_logout_url()
        ),
        200, {'Content-Type': MIMETYPE_APP_JS})


@blueprint.route("/js/endpoints.js")
@pgCSRFProtect.exempt
def exposed_urls():
    return make_response(
        render_template('browser/js/endpoints.js'),
        200, {'Content-Type': MIMETYPE_APP_JS}
    )


@blueprint.route("/js/error.js")
@pgCSRFProtect.exempt
@login_required
def error_js():
    return make_response(
        render_template('browser/js/error.js', _=gettext),
        200, {'Content-Type': MIMETYPE_APP_JS})


@blueprint.route("/js/messages.js")
@pgCSRFProtect.exempt
def messages_js():
    return make_response(
        render_template('browser/js/messages.js', _=gettext),
        200, {'Content-Type': MIMETYPE_APP_JS})


@blueprint.route("/browser.css")
@pgCSRFProtect.exempt
@login_required
def browser_css():
    """Render and return CSS snippets from the nodes and modules."""
    snippets = []

    for submodule in blueprint.submodules:
        snippets.extend(submodule.csssnippets)
    return make_response(
        render_template(
            'browser/css/browser.css', snippets=snippets, _=gettext
        ),
        200, {'Content-Type': 'text/css'})


@blueprint.route("/nodes/", endpoint="nodes")
@login_required
def get_nodes():
    """Build a list of treeview nodes from the child nodes."""
    nodes = []
    for submodule in current_blueprint.submodules:
        nodes.extend(submodule.get_nodes())

    return make_json_response(data=nodes)


def form_master_password_response(existing=True, present=False, errmsg=None):
    content_new = (
        gettext("Set Master Password"),
        "<br/>".join([
            gettext("Please set a master password for pgAdmin."),
            gettext("This will be used to secure and later unlock saved "
                    "passwords and other credentials.")])
    )
    content_existing = (
        gettext("Unlock Saved Passwords"),
        "<br/>".join([
            gettext("Please enter your master password."),
            gettext("This is required to unlock saved passwords and "
                    "reconnect to the database server(s).")])
    )

    return make_json_response(data={
        'present': present,
        'title': content_existing[0] if existing else content_new[0],
        'content': render_template(
            'browser/master_password.html',
            content_text=content_existing[1] if existing else content_new[1],
            errmsg=errmsg
        ),
        'reset': existing
    })


@blueprint.route("/master_password", endpoint="check_master_password",
                 methods=["GET"])
def check_master_password():
    """
    Checks if the master password is available in the memory
    This password will be used to encrypt/decrypt saved server passwords
    """
    return make_json_response(data=get_crypt_key()[0])


@blueprint.route("/master_password", endpoint="reset_master_password",
                 methods=["DELETE"])
def reset_master_password():
    """
    Removes the master password and remove all saved passwords
    This password will be used to encrypt/decrypt saved server passwords
    """
    cleanup_master_password()
    return make_json_response(data=get_crypt_key()[0])


@blueprint.route("/master_password", endpoint="set_master_password",
                 methods=["POST"])
def set_master_password():
    """
    Set the master password and store in the memory
    This password will be used to encrypt/decrypt saved server passwords
    """

    data = None

    if hasattr(request.data, 'decode'):
        data = request.data.decode('utf-8')

    if data != '':
        data = json.loads(data)

    # Master password is not applicable for server mode
    if not config.SERVER_MODE and config.MASTER_PASSWORD_REQUIRED:

        # if master pass is set previously
        if current_user.masterpass_check is not None and \
            data.get('button_click') and \
                not validate_master_password(data.get('password')):
            return form_master_password_response(
                existing=True,
                present=False,
                errmsg=gettext("Incorrect master password")
            )

        if data != '' and data.get('password', '') != '':

            # store the master pass in the memory
            set_crypt_key(data.get('password'))

            if current_user.masterpass_check is None:
                # master check is not set, which means the server password
                # data is old and is encrypted with old key
                # Re-encrypt with new key

                from pgadmin.browser.server_groups.servers.utils \
                    import reencrpyt_server_passwords
                reencrpyt_server_passwords(
                    current_user.id, current_user.password,
                    data.get('password'))

            # set the encrypted sample text with the new
            # master pass
            set_masterpass_check_text(data.get('password'))

        elif not get_crypt_key()[0] and \
                current_user.masterpass_check is not None:
            return form_master_password_response(
                existing=True,
                present=False,
            )
        elif not get_crypt_key()[0]:
            error_message = None
            if data.get('button_click') and data.get('password') == '':
                # If user attempted to enter a blank password, then throw error
                error_message = gettext("Master password cannot be empty")
            return form_master_password_response(
                existing=False,
                present=False,
                errmsg=error_message
            )

    # if master password is disabled now, but was used once then
    # remove all the saved passwords
    process_masterpass_disabled()

    if config.SERVER_MODE and current_user.masterpass_check is None:

        crypt_key = get_crypt_key()[1]
        from pgadmin.browser.server_groups.servers.utils \
            import reencrpyt_server_passwords
        reencrpyt_server_passwords(
            current_user.id, current_user.password, crypt_key)

        set_masterpass_check_text(crypt_key)

    return form_master_password_response(
        present=True,
    )


@blueprint.route("/lock_layout", endpoint="lock_layout", methods=["PUT"])
def lock_layout():
    data = None

    if hasattr(request.data, 'decode'):
        data = request.data.decode('utf-8')

    if data != '':
        data = json.loads(data)

    blueprint.lock_layout.set(data['value'])

    return make_json_response()


@blueprint.route("/signal_runtime", endpoint="signal_runtime",
                 methods=["POST"])
def signal_runtime():
    # If not runtime then no need to send signal
    if current_app.PGADMIN_RUNTIME:
        data = None

        if hasattr(request.data, 'decode'):
            data = request.data.decode('utf-8')

        if data != '':
            data = json.loads(data)

        # Add Info Handler to current app just to send signal to runtime
        tmp_handler = logging.StreamHandler()
        tmp_handler.setLevel(logging.INFO)
        current_app.logger.addHandler(tmp_handler)
        # Send signal to runtime
        current_app.logger.info(data['command'])
        # Remove the temporary handler
        current_app.logger.removeHandler(tmp_handler)

    return make_json_response()

# Only register route if SECURITY_CHANGEABLE is set to True
# We can't access app context here so cannot
# use app.config['SECURITY_CHANGEABLE']


if hasattr(config, 'SECURITY_CHANGEABLE') and config.SECURITY_CHANGEABLE:
    @blueprint.route("/change_password", endpoint="change_password",
                     methods=['GET', 'POST'])
    @pgCSRFProtect.exempt
    @login_required
    def change_password():
        """View function which handles a change password request."""

        has_error = False
        form_class = _security.change_password_form

        if request.json:
            form = form_class(MultiDict(request.json))
        else:
            form = form_class()

        if form.validate_on_submit():
            try:
                change_user_password(current_user, form.new_password.data)
            except SOCKETErrorException as e:
                # Handle socket errors which are not covered by SMTPExceptions.
                logging.exception(str(e), exc_info=True)
                flash(gettext(SMTP_SOCKET_ERROR).format(e),
                      'danger')
                has_error = True
            except (SMTPConnectError, SMTPResponseException,
                    SMTPServerDisconnected, SMTPDataError, SMTPHeloError,
                    SMTPException, SMTPAuthenticationError, SMTPSenderRefused,
                    SMTPRecipientsRefused) as e:
                # Handle smtp specific exceptions.
                logging.exception(str(e), exc_info=True)
                flash(gettext(SMTP_ERROR).format(e),
                      'danger')
                has_error = True
            except Exception as e:
                # Handle other exceptions.
                logging.exception(str(e), exc_info=True)
                flash(
                    gettext(PASS_ERROR).format(e),
                    'danger'
                )
                has_error = True

            if request.json is None and not has_error:
                after_this_request(_commit)
                do_flash(*get_message('PASSWORD_CHANGE'))

                old_key = get_crypt_key()[1]
                set_crypt_key(form.new_password.data, False)

                from pgadmin.browser.server_groups.servers.utils \
                    import reencrpyt_server_passwords
                reencrpyt_server_passwords(
                    current_user.id, old_key, form.new_password.data)

                return redirect(get_url(_security.post_change_view) or
                                get_url(_security.post_login_view))

        if request.json and not has_error:
            form.user = current_user
            return default_render_json(form)

        return _security.render_template(
            config_value('CHANGE_PASSWORD_TEMPLATE'),
            change_password_form=form,
            **_ctx('change_password'))

# Only register route if SECURITY_RECOVERABLE is set to True
if hasattr(config, 'SECURITY_RECOVERABLE') and config.SECURITY_RECOVERABLE:

    def send_reset_password_instructions(user):
        """Sends the reset password instructions email for the specified user.

        :param user: The user to send the instructions to
        """
        token = generate_reset_password_token(user)
        reset_link = url_for('browser.reset_password', token=token,
                             _external=True)

        send_mail(config_value('EMAIL_SUBJECT_PASSWORD_RESET'), user.email,
                  'reset_instructions',
                  user=user, reset_link=reset_link)

        reset_password_instructions_sent.send(
            current_app._get_current_object(),
            user=user, token=token)

    @blueprint.route("/reset_password", endpoint="forgot_password",
                     methods=['GET', 'POST'])
    @pgCSRFProtect.exempt
    @anonymous_user_required
    def forgot_password():
        """View function that handles a forgotten password request."""
        has_error = False
        form_class = _security.forgot_password_form

        if request.json:
            form = form_class(MultiDict(request.json))
        else:
            form = form_class()

        if form.validate_on_submit():
            # Check the Authentication source of the User
            user = User.query.filter_by(
                email=form.data['email'],
                auth_source=INTERNAL
            ).first()

            if user is None:
                # If the user is not an internal user, raise the exception
                flash(gettext('Your account is authenticated using an '
                              'external {} source. '
                              'Please contact the administrators of this '
                              'service if you need to reset your password.'
                              ).format(form.user.auth_source),
                      'danger')
                has_error = True
            if not has_error:
                try:
                    send_reset_password_instructions(form.user)
                except SOCKETErrorException as e:
                    # Handle socket errors which are not
                    # covered by SMTPExceptions.
                    logging.exception(str(e), exc_info=True)
                    flash(gettext(SMTP_SOCKET_ERROR).format(e),
                          'danger')
                    has_error = True
                except (SMTPConnectError, SMTPResponseException,
                        SMTPServerDisconnected, SMTPDataError, SMTPHeloError,
                        SMTPException, SMTPAuthenticationError,
                        SMTPSenderRefused, SMTPRecipientsRefused) as e:

                    # Handle smtp specific exceptions.
                    logging.exception(str(e), exc_info=True)
                    flash(gettext(SMTP_ERROR).format(e),
                          'danger')
                    has_error = True
                except Exception as e:
                    # Handle other exceptions.
                    logging.exception(str(e), exc_info=True)
                    flash(gettext(PASS_ERROR).format(e),
                          'danger')
                    has_error = True

            if request.json is None and not has_error:
                do_flash(*get_message('PASSWORD_RESET_REQUEST',
                                      email=form.user.email))

        if request.json and not has_error:
            return default_render_json(form, include_user=False)

        return _security.render_template(
            config_value('FORGOT_PASSWORD_TEMPLATE'),
            forgot_password_form=form,
            **_ctx('forgot_password'))

    # We are not in app context so cannot use
    # url_for('browser.forgot_password')
    # So hard code the url '/browser/reset_password' while passing as
    # parameter to slash_url_suffix function.
    @blueprint.route(
        '/reset_password' + slash_url_suffix(
            '/browser/reset_password', '<token>'
        ),
        methods=['GET', 'POST'],
        endpoint='reset_password'
    )
    @pgCSRFProtect.exempt
    @anonymous_user_required
    def reset_password(token):
        """View function that handles a reset password request."""
        expired, invalid, user = reset_password_token_status(token)

        if invalid:
            do_flash(*get_message('INVALID_RESET_PASSWORD_TOKEN'))
        if expired:
            do_flash(*get_message('PASSWORD_RESET_EXPIRED', email=user.email,
                                  within=_security.reset_password_within))
        if invalid or expired:
            return redirect(url_for('browser.forgot_password'))
        has_error = False
        form = _security.reset_password_form()

        if form.validate_on_submit():
            try:
                update_password(user, form.password.data)
            except SOCKETErrorException as e:
                # Handle socket errors which are not covered by SMTPExceptions.
                logging.exception(str(e), exc_info=True)
                flash(gettext(SMTP_SOCKET_ERROR).format(e),
                      'danger')
                has_error = True
            except (SMTPConnectError, SMTPResponseException,
                    SMTPServerDisconnected, SMTPDataError, SMTPHeloError,
                    SMTPException, SMTPAuthenticationError, SMTPSenderRefused,
                    SMTPRecipientsRefused) as e:

                # Handle smtp specific exceptions.
                logging.exception(str(e), exc_info=True)
                flash(gettext(SMTP_ERROR).format(e),
                      'danger')
                has_error = True
            except Exception as e:
                # Handle other exceptions.
                logging.exception(str(e), exc_info=True)
                flash(gettext(PASS_ERROR).format(e),
                      'danger')
                has_error = True

            if not has_error:
                after_this_request(_commit)
                do_flash(*get_message('PASSWORD_RESET'))
                login_user(user)
                return redirect(get_url(_security.post_reset_view) or
                                get_url(_security.post_login_view))

        return _security.render_template(
            config_value('RESET_PASSWORD_TEMPLATE'),
            reset_password_form=form,
            reset_password_token=token,
            **_ctx('reset_password'))
