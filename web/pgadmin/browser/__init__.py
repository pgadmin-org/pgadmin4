##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import logging
import os
import secrets
import sys
from abc import ABCMeta, abstractmethod
from smtplib import SMTPConnectError, SMTPResponseException, \
    SMTPServerDisconnected, SMTPDataError, SMTPHeloError, SMTPException, \
    SMTPAuthenticationError, SMTPSenderRefused, SMTPRecipientsRefused
from socket import error as SOCKETErrorException

import keyring
from keyring.errors import KeyringLocked, NoKeyringError
from pgadmin.utils.constants import KEY_RING_SERVICE_NAME, \
    KEY_RING_USER_NAME,MessageType

from flask import current_app, render_template, url_for, make_response, \
    flash, Response, request, redirect, session
from flask_babel import gettext
from libgravatar import Gravatar
from flask_security import current_user
from flask_login.utils import login_url
from flask_security.changeable import send_password_changed_notice
from flask_security.decorators import anonymous_user_required
from flask_security.recoverable import reset_password_token_status, \
    generate_reset_password_token, update_password
from flask_security.signals import reset_password_instructions_sent
from flask_security.utils import config_value, do_flash, get_url, \
    get_message, slash_url_suffix, login_user, send_mail, hash_password, \
    get_post_logout_redirect
from flask_security.views import _security, view_commit, _ctx
from werkzeug.datastructures import MultiDict

import config
from pgadmin import current_blueprint
from pgadmin.authenticate import get_logout_url
from pgadmin.authenticate.mfa.utils import is_mfa_enabled
from pgadmin.settings import get_setting
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    bad_request
from pgadmin.utils.csrf import pgCSRFProtect
from pgadmin.utils.preferences import Preferences
from pgadmin.browser.register_browser_preferences import \
    register_browser_preferences
from pgadmin.utils.master_password import validate_master_password, \
    set_masterpass_check_text, cleanup_master_password, get_crypt_key, \
    set_crypt_key, process_masterpass_disabled, \
    delete_local_storage_master_key, \
    get_master_password_key_from_os_secret, \
    get_master_password_from_master_hook
from pgadmin.model import User, db
from pgadmin.utils.constants import MIMETYPE_APP_JS, PGADMIN_NODE, \
    INTERNAL, KERBEROS, LDAP, QT_DEFAULT_PLACEHOLDER, OAUTH2, WEBSERVER, \
    VW_EDT_DEFAULT_PLACEHOLDER
from pgadmin.authenticate import AuthSourceManager
from pgadmin.utils.exception import CryptKeyMissing

from pgadmin.user_login_check import pga_login_required
from flask_security.views import default_render_json

MODULE_NAME = 'browser'
BROWSER_STATIC = 'browser.static'
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

    def register_preferences(self):
        register_browser_preferences(self)

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return [BROWSER_INDEX, 'browser.nodes',
                'browser.check_corrupted_db_file',
                'browser.check_master_password',
                'browser.set_master_password',
                'browser.reset_master_password',
                ]

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        from .server_groups import blueprint as module
        self.submodules.append(module)
        super().register(app, options)


blueprint = BrowserModule(MODULE_NAME, __name__)


class BrowserPluginModule(PgAdminModule, metaclass=ABCMeta):
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

        super().__init__(
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
            "id": "%s_%s" % (node_type, node_id),
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

    @property
    @abstractmethod
    def node_type(self):
        pass

    @property
    @abstractmethod
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
    return '{0}?next={1}'.format(
        url_for(current_app.login_manager.logout_view), url_for(BROWSER_INDEX))


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


@blueprint.add_app_template_filter
def gravatar(username):
    """
    This function adds a template filter which
    returns gravatar image for user.
    :return: gravatar image
    """
    g = Gravatar(username)
    return g.get_image(
        size=100,
        rating='g',
        default='retro'
    )


@blueprint.route("/")
@pgCSRFProtect.exempt
@pga_login_required
def index():
    """Render and process the main browser window."""

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

            flash(msg, MessageType.WARNING)

    session['allow_save_password'] = True

    if config.SERVER_MODE and not config.MASTER_PASSWORD_REQUIRED and \
            'pass_enc_key' in session:
        session['allow_save_password'] = False

    response = Response(render_template(
        MODULE_NAME + "/index.html",
        username=current_user.username,
        _=gettext
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
                        path=config.SESSION_COOKIE_PATH,
                        secure=config.SESSION_COOKIE_SECURE,
                        httponly=config.SESSION_COOKIE_HTTPONLY,
                        samesite=config.SESSION_COOKIE_SAMESITE,
                        **domain)

    return response


def validate_shared_storage_config(data, shared_storage_keys):
    """
    Validate the config values are correct or not
    """
    if shared_storage_keys.issubset(data.keys()):
        if isinstance(data['name'], str) and isinstance(
                data['path'], str) and \
                isinstance(data['restricted_access'], bool):
            return True
    return False


def get_shared_storage_list():
    """
    Return the shared storage list after checking all required keys are present
    or not in config. This is for server mode only.
    """
    shared_storage_list = []
    restricted_shared_storage_list = []
    if config.SERVER_MODE:
        shared_storage_keys = set(['name', 'path', 'restricted_access'])
        shared_storage_config = [
            sdir for sdir in config.SHARED_STORAGE if
            validate_shared_storage_config(sdir, shared_storage_keys)]

        config.SHARED_STORAGE = shared_storage_config
        shared_storage_list = [sdir['name'] for sdir in shared_storage_config]
        restricted_shared_storage_list = [sdir['name'] for sdir in
                                          shared_storage_config if
                                          sdir['restricted_access']]

    return shared_storage_list, restricted_shared_storage_list


@blueprint.route("/js/utils.js")
@pgCSRFProtect.exempt
@pga_login_required
def utils():
    layout = get_setting('Browser/Layout', default='')
    snippets = []

    prefs = Preferences.module('paths')
    pg_help_path_pref = prefs.preference('pg_help_path')
    pg_help_path = pg_help_path_pref.get()

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

    highlight_selection_matches_pref = prefs.preference(
        'highlight_selection_matches'
    )
    highlight_selection_matches = highlight_selection_matches_pref.get()

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

    # Get the pgadmin server's locale
    default_locale = ''
    if current_app.PGADMIN_RUNTIME:
        import locale
        try:
            locale_info = locale.getdefaultlocale()
            if len(locale_info) > 0:
                default_locale = locale_info[0].replace('_', '-')
        except Exception:
            current_app.logger.debug('Failed to get the default locale.')

    for submodule in current_blueprint.submodules:
        snippets.extend(submodule.jssnippets)

    auth_only_internal = False
    auth_source = []

    if config.SERVER_MODE:
        if session['auth_source_manager']['current_source'] == INTERNAL:
            auth_only_internal = True
        auth_source = session['auth_source_manager'][
            'source_friendly_name']

    shared_storage_list, \
        restricted_shared_storage_list = get_shared_storage_list()

    return make_response(
        render_template(
            'browser/js/utils.js',
            layout=layout,
            jssnippets=snippets,
            pg_help_path=pg_help_path,
            editor_tab_size=editor_tab_size,
            editor_use_spaces=editor_use_spaces,
            editor_wrap_code=editor_wrap_code,
            editor_brace_matching=brace_matching,
            editor_highlight_selection_matches=highlight_selection_matches,
            editor_insert_pair_brackets=insert_pair_brackets,
            editor_indent_with_tabs=editor_indent_with_tabs,
            app_name=config.APP_NAME,
            app_version_int=config.APP_VERSION_INT,
            pg_libpq_version=pg_libpq_version,
            support_ssh_tunnel=config.SUPPORT_SSH_TUNNEL,
            logout_url=get_logout_url(),
            platform=sys.platform,
            qt_default_placeholder=QT_DEFAULT_PLACEHOLDER,
            vw_edt_default_placeholder=VW_EDT_DEFAULT_PLACEHOLDER,
            enable_psql=config.ENABLE_PSQL,
            pgadmin_server_locale=default_locale,
            _=gettext,
            auth_only_internal=auth_only_internal,
            mfa_enabled=is_mfa_enabled(),
            is_admin=current_user.has_role("Administrator"),
            login_url=login_url,
            username=current_user.username.replace("'","\\'"),
            auth_source=auth_source,
            heartbeat_timeout=config.SERVER_HEARTBEAT_TIMEOUT,
            password_length_min=config.PASSWORD_LENGTH_MIN,
            shared_storage_list=shared_storage_list,
            restricted_shared_storage_list=[] if current_user.has_role(
                "Administrator") else restricted_shared_storage_list,
            enable_server_passexec_cmd=config.ENABLE_SERVER_PASS_EXEC_CMD,
            max_server_tags_allowed=config.MAX_SERVER_TAGS_ALLOWED,
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
@pga_login_required
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
@pga_login_required
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
@pga_login_required
def get_nodes():
    """Build a list of treeview nodes from the child nodes."""
    nodes = []
    for submodule in current_blueprint.submodules:
        nodes.extend(submodule.get_nodes())

    return make_json_response(data=nodes)


def form_master_password_response(existing=True, present=False, errmsg=None,
                                  keyring_name='', master_password_hook=False):
    return make_json_response(data={
        'present': present,
        'reset': existing,
        'errmsg': errmsg,
        'keyring_name': keyring_name,
        'master_password_hook': master_password_hook,
        'is_error': True if errmsg else False
    })


@blueprint.route("/check_corrupted_db_file",
                 endpoint="check_corrupted_db_file", methods=["GET"])
def check_corrupted_db_file():
    """
    Get the corrupted database file path.
    """
    file_location = os.environ['CORRUPTED_DB_BACKUP_FILE'] \
        if 'CORRUPTED_DB_BACKUP_FILE' in os.environ else ''
    # reset the corrupted db file path in env.
    os.environ['CORRUPTED_DB_BACKUP_FILE'] = ''
    return make_json_response(data=file_location)


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
    status, crypt_key = get_crypt_key()
    if not status and config.MASTER_PASSWORD_HOOK:
        crypt_key = get_master_password_from_master_hook()

    # Set masterpass_check if MASTER_PASSWORD_HOOK is set which provides
    # encryption key
    if config.SERVER_MODE and config.MASTER_PASSWORD_HOOK:
        set_masterpass_check_text(crypt_key)
    return make_json_response(data=status)


@blueprint.route("/master_password", endpoint="set_master_password",
                 methods=["POST"])
def set_master_password():
    """
    Set the master password and store in the memory
    This password will be used to encrypt/decrypt saved server passwords
    """
    data = None
    if request.form:
        data = request.form
    elif request.data:
        data = request.data
        if hasattr(request.data, 'decode'):
            data = request.data.decode('utf-8')

        if data != '':
            data = json.loads(data)

    keyring_name = ''
    errmsg = ''
    master_password_hook = False
    if not config.SERVER_MODE:
        if config.USE_OS_SECRET_STORAGE:
            try:
                # Try to get master key is from local os storage
                master_key = get_master_password_key_from_os_secret()
                master_password = data.get('password', None)
                keyring_name = config.KEYRING_NAME
                if not master_key:
                    # Generate new one and migration required
                    master_key = secrets.token_urlsafe(12)
                    keyring.delete_password(KEY_RING_SERVICE_NAME,
                                            'entry_to_check_keychain_access')
                    # migrate existing server passwords
                    from pgadmin.browser.server_groups.servers.utils \
                        import migrate_saved_passwords
                    migrated_save_passwords, error = migrate_saved_passwords(
                        master_key, master_password)

                    if migrated_save_passwords:
                        # Update keyring
                        keyring.set_password(KEY_RING_SERVICE_NAME,
                                             KEY_RING_USER_NAME,
                                             master_key)
                        # set crypt key
                        set_crypt_key(master_key)
                        return form_master_password_response(
                            existing=True,
                            present=True,
                            keyring_name=keyring_name)
                    else:
                        if not error:
                            # Update keyring
                            keyring.set_password(KEY_RING_SERVICE_NAME,
                                                 KEY_RING_USER_NAME,
                                                 master_key)
                            set_crypt_key(master_key)
                            return form_master_password_response(
                                present=True)
                        # Migration failed
                        elif error != 'Master password required':
                            errmsg = error
                            return form_master_password_response(
                                existing=False,
                                present=True,
                                errmsg=errmsg,
                                keyring_name=keyring_name)
                else:
                    current_app.logger.debug(
                        'Master key was already present in the keyring,'
                        'hence not doing any migration')
                    # Key is already generated and set, no migration required
                    # set crypt key
                    set_crypt_key(master_key)
                    return form_master_password_response(
                        present=True)
            except Exception as e:
                error = 'Failed to get/set encryption key using OS password ' \
                        'manager because of exception.' \
                        ' Error: {0}'.format(e)
                current_app.logger.exception(error)
                # Disable local os storage if any exception other than
                # access denied
                if not isinstance(e, KeyringLocked):
                    config.USE_OS_SECRET_STORAGE = False
                    # delete key if exception other than no keyring backend
                    # error
                    if not isinstance(e, NoKeyringError):
                        delete_local_storage_master_key()

                    # Delete saved password encrypted with kecyhain master key
                    from pgadmin.browser.server_groups.servers.utils \
                        import remove_saved_passwords, update_session_manager
                    remove_saved_passwords(current_user.id)
                    update_session_manager(current_user.id)

                return form_master_password_response(
                    existing=False,
                    present=True,
                    errmsg=errmsg,
                    keyring_name=keyring_name)
    else:
        # If the master password is required and the master password hook
        # is specified then try to retrieve the encryption key and update data.
        # If there is an error while retrieving it, return an error message.
        if config.MASTER_PASSWORD_REQUIRED and config.MASTER_PASSWORD_HOOK:
            master_password = get_master_password_from_master_hook()
            if master_password:
                data = {'password': master_password, 'submit_password': True}
            else:
                errmsg = gettext(
                    'The master password could not be retrieved from the'
                    ' MASTER_PASSWORD_HOOK utility specified {0}. Please check'
                    ' that the hook utility is configured correctly.'.format(
                        config.MASTER_PASSWORD_HOOK))
                return form_master_password_response(
                    existing=False,
                    present=False,
                    errmsg=errmsg,
                    master_password_hook=config.MASTER_PASSWORD_HOOK,
                    keyring_name=keyring_name
                )

    # Master password is applicable for Desktop mode and in server mode
    # only when auth sources are oauth, kerberos, webserver.
    if (not config.SERVER_MODE) or OAUTH2 in config.AUTHENTICATION_SOURCES \
        or KERBEROS in config.AUTHENTICATION_SOURCES \
        or WEBSERVER in config.AUTHENTICATION_SOURCES \
            and config.MASTER_PASSWORD_REQUIRED:
        # if master pass is set previously
        if current_user.masterpass_check is not None and \
            data.get('submit_password', False) and \
                not validate_master_password(data.get('password')):

            if config.SERVER_MODE and config.MASTER_PASSWORD_HOOK:
                master_password_hook = True
            else:
                errmsg = gettext("Incorrect master password")
            return form_master_password_response(
                existing=True,
                present=False,
                errmsg=errmsg,
                master_password_hook=master_password_hook,
                keyring_name=keyring_name
            )

        # if master password received in request
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

        # If password in request is empty then try to get it with
        # get_crypt_key method. If get_crypt_key() returns false status and
        # masterpass_check is already set, provide a popup to enter
        # master password(present) without the reset option.(existing).
        elif not get_crypt_key()[0] and \
                current_user.masterpass_check is not None:
            return form_master_password_response(
                existing=True,
                present=False,
                keyring_name=keyring_name
            )

        # If get_crypt_key return True,but crypt_key is none and
        # user entered blank password, return error message.
        elif not get_crypt_key()[1]:
            error_message = None
            # If user attempted to enter a blank password, then throw error
            if data.get('submit_password') and data.get('password') == '':
                error_message = gettext("Master password cannot be empty")
            return form_master_password_response(
                existing=False,
                present=False,
                errmsg=error_message,
                keyring_name=keyring_name
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


# Only register route if SECURITY_CHANGEABLE is set to True
# We can't access app context here so cannot
# use app.config['SECURITY_CHANGEABLE']
if hasattr(config, 'SECURITY_CHANGEABLE') and config.SECURITY_CHANGEABLE:
    @blueprint.route("/change_password", endpoint="change_password",
                     methods=['GET', 'POST'])
    @pgCSRFProtect.exempt
    @pga_login_required
    def change_password():
        """View function which handles a change password request."""

        form_class = _security.forms.get('change_password_form').cls
        req_json = request.get_json(silent=True)

        if not req_json:
            form = form_class()
            return {
                'csrf_token': form.csrf_token._value()
            }
        elif req_json:
            form = form_class(MultiDict(req_json))
            if form.validate():
                errormsg = None
                # change_user_password from flask-security logs out the user
                # this is undesirable, so change password on own
                try:
                    user = User.query.filter(
                        User.fs_uniquifier == current_user.fs_uniquifier)\
                        .first()
                    user.password = hash_password(form.new_password.data)

                    try:
                        send_password_changed_notice(user)
                    except Exception as _:
                        # No need to throw error if failed in sending email
                        pass
                except Exception as e:
                    # Handle other exceptions.
                    logging.exception(str(e), exc_info=True)
                    errormsg = gettext(PASS_ERROR).format(e)

                if errormsg is None:
                    old_key = get_crypt_key()[1]
                    set_crypt_key(form.new_password.data, False)

                    from pgadmin.browser.server_groups.servers.utils \
                        import reencrpyt_server_passwords
                    reencrpyt_server_passwords(
                        current_user.id, old_key, form.new_password.data)

                    db.session.commit()
                elif errormsg is not None:
                    return internal_server_error(errormsg)
            else:
                return bad_request(list(form.errors.values())[0][0])

        return make_json_response(
            success=1,
            info=gettext('pgAdmin user password changed successfully')
        )

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
        form_class = _security.forms.get('forgot_password_form').cls
        req_json = request.get_json(silent=True)

        if req_json:
            form = form_class(MultiDict(req_json))
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
                      MessageType.ERROR)
                has_error = True
            if not has_error:
                try:
                    send_reset_password_instructions(form.user)
                except SOCKETErrorException as e:
                    # Handle socket errors which are not
                    # covered by SMTPExceptions.
                    logging.exception(str(e), exc_info=True)
                    flash(gettext(SMTP_SOCKET_ERROR).format(e),
                          MessageType.ERROR)
                    has_error = True
                except (SMTPConnectError, SMTPResponseException,
                        SMTPServerDisconnected, SMTPDataError, SMTPHeloError,
                        SMTPException, SMTPAuthenticationError,
                        SMTPSenderRefused, SMTPRecipientsRefused) as e:

                    # Handle smtp specific exceptions.
                    logging.exception(str(e), exc_info=True)
                    flash(gettext(SMTP_ERROR).format(e),
                          MessageType.ERROR)
                    has_error = True
                except Exception as e:
                    # Handle other exceptions.
                    logging.exception(str(e), exc_info=True)
                    flash(gettext(PASS_ERROR).format(e),
                          MessageType.ERROR)
                    has_error = True

            if request.get_json(silent=True) is None and not has_error:
                do_flash(*get_message('PASSWORD_RESET_REQUEST',
                                      email=form.user.email))

        if request.get_json(silent=True) and not has_error:
            return default_render_json(form, include_user=False)

        for errors in form.errors.values():
            for error in errors:
                flash(str(error), MessageType.WARNING)

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
        form_class = _security.forms.get('reset_password_form').cls
        form = form_class(request.form) if request.form else form_class()

        form.user = user

        if form.validate_on_submit():
            try:
                update_password(user, form.password.data)
            except SOCKETErrorException as e:
                # Handle socket errors which are not covered by SMTPExceptions.
                logging.exception(str(e), exc_info=True)
                flash(gettext(SMTP_SOCKET_ERROR).format(e),
                      MessageType.ERROR)
                has_error = True
            except (SMTPConnectError, SMTPResponseException,
                    SMTPServerDisconnected, SMTPDataError, SMTPHeloError,
                    SMTPException, SMTPAuthenticationError, SMTPSenderRefused,
                    SMTPRecipientsRefused) as e:

                # Handle smtp specific exceptions.
                logging.exception(str(e), exc_info=True)
                flash(gettext(SMTP_ERROR).format(e),
                      MessageType.ERROR)
                has_error = True
            except Exception as e:
                # Handle other exceptions.
                logging.exception(str(e), exc_info=True)
                flash(gettext(PASS_ERROR).format(e),
                      MessageType.ERROR)
                has_error = True

            if not has_error:
                view_commit()
                auth_obj = AuthSourceManager(form, [INTERNAL])
                session['_auth_source_manager_obj'] = auth_obj.as_dict()

                if user.login_attempts >= config.MAX_LOGIN_ATTEMPTS > 0:
                    flash(gettext('You successfully reset your password but'
                                  ' your account is locked. Please contact '
                                  'the Administrator.'),
                          MessageType.WARNING)
                    return redirect(get_post_logout_redirect())
                do_flash(*get_message('PASSWORD_RESET'))
                login_user(user)
                auth_obj = AuthSourceManager(form, [INTERNAL])
                session['auth_source_manager'] = auth_obj.as_dict()

                return redirect(
                    current_app.config['SECURITY_POST_RESET_VIEW'] or
                    current_app.config['SECURITY_POST_LOGIN_VIEW'])

        return _security.render_template(
            config_value('RESET_PASSWORD_TEMPLATE'),
            reset_password_form=form,
            reset_password_token=token,
            **_ctx('reset_password'))
