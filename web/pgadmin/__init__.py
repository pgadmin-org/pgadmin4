##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""The main pgAdmin module. This handles the application initialisation tasks,
such as setup of logging, dynamic loading of modules etc."""
import logging
import os
import sys
import re
import ipaddress
import traceback
import shutil

from types import MethodType
from collections import defaultdict
from importlib import import_module

from flask import Flask, abort, request, current_app, session, url_for
from flask_socketio import SocketIO
from werkzeug.exceptions import HTTPException
from flask_babel import Babel, gettext
from flask_babel import gettext as _
from flask_login import user_logged_in, user_logged_out
from flask_mail import Mail
from flask_paranoid import Paranoid
from flask_security import Security, SQLAlchemyUserDatastore, current_user
from flask_security.utils import login_user, logout_user
from flask_migrate import Migrate
from werkzeug.datastructures import ImmutableDict
from werkzeug.local import LocalProxy
from werkzeug.utils import find_modules
from jinja2 import select_autoescape
from flask_wtf.csrf import CSRFError

from pgadmin.model import db, Role, Server, SharedServer, ServerGroup, \
    User, Keys, Version, SCHEMA_VERSION as CURRENT_SCHEMA_VERSION
from pgadmin.utils import PgAdminModule, driver, KeyManager, heartbeat
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.session import create_session_interface, pga_unauthorised
from pgadmin.utils.versioned_template_loader import VersionedTemplateLoader
from datetime import timedelta, datetime
from pgadmin.setup import get_version, set_version, check_db_tables
from pgadmin.utils.ajax import internal_server_error, make_json_response, \
    unauthorized
from pgadmin.utils.csrf import pgCSRFProtect
from pgadmin import authenticate
from pgadmin.utils.security_headers import SecurityHeaders
from pgadmin.utils.constants import KERBEROS, OAUTH2, INTERNAL, LDAP, WEBSERVER
from jsonformatter import JsonFormatter

# Explicitly set the mime-types so that a corrupted windows registry will not
# affect pgAdmin 4 to be load properly. This will avoid the issues that may
# occur due to security fix of X_CONTENT_TYPE_OPTIONS = "nosniff".
import mimetypes

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')


winreg = None
if os.name == 'nt':
    import winreg

socketio = SocketIO(manage_session=False, async_mode='threading',
                    logger=False, engineio_logger=False, debug=False,
                    ping_interval=25, ping_timeout=120)

_INDEX_PATH = 'browser.index'


class PgAdmin(Flask):
    def __init__(self, *args, **kwargs):
        # Set the template loader to a postgres-version-aware loader
        self.jinja_options = ImmutableDict(
            autoescape=select_autoescape(enabled_extensions=('html', 'xml')),
            loader=VersionedTemplateLoader(self)
        )
        self.logout_hooks = []
        self.before_app_start = []

        super().__init__(*args, **kwargs)

    def find_submodules(self, basemodule):
        try:
            for module_name in find_modules(basemodule, True):
                if module_name in self.config['MODULE_BLACKLIST']:
                    self.logger.info(
                        'Skipping blacklisted module: %s' % module_name
                    )
                    continue
                self.logger.info(
                    'Examining potential module: %s' % module_name)
                module = import_module(module_name)
                for key in list(module.__dict__.keys()):
                    if isinstance(module.__dict__[key], PgAdminModule):
                        yield module.__dict__[key]
        except Exception:
            return []

    @property
    def submodules(self):
        for blueprint in self.blueprints.values():
            if isinstance(blueprint, PgAdminModule):
                yield blueprint

    @property
    def messages(self):
        messages = dict()
        for module in self.submodules:
            messages.update(getattr(module, "messages", dict()))
        return messages

    @property
    def exposed_endpoint_url_map(self):
        #############################################################
        # To handle WSGI paths
        # If user has setup application under WSGI alias
        # like 'localhost/pgadmin4' then we have to append '/pgadmin4'
        # into endpoints
        #############################################################
        wsgi_root_path = ''
        if url_for(_INDEX_PATH) != '/browser/':
            wsgi_root_path = url_for(_INDEX_PATH).replace(
                '/browser/', ''
            )

        def get_full_url_path(url):
            """
            Generate endpoint URL at per WSGI alias
            """
            return wsgi_root_path + url

        # Fetch all endpoints and their respective url
        for rule in current_app.url_map.iter_rules('static'):
            yield rule.endpoint, get_full_url_path(rule.rule)

        for module in self.submodules:
            for endpoint in module.exposed_endpoints:
                for rule in current_app.url_map.iter_rules(endpoint):
                    yield rule.endpoint, get_full_url_path(rule.rule)

        yield 'pgadmin.root', wsgi_root_path

    @property
    def menu_items(self):
        from operator import attrgetter

        menu_items = defaultdict(list)
        for module in self.submodules:
            for key, value in module.menu_items.items():
                menu_items[key].extend(value)
        menu_items = dict((key, sorted(value, key=attrgetter('priority')))
                          for key, value in menu_items.items())
        return menu_items

    def register_logout_hook(self, module):
        if hasattr(module, 'on_logout') and \
                isinstance(getattr(module, 'on_logout'), MethodType):
            self.logout_hooks.append(module)

    def register_before_app_start(self, callback):
        self.before_app_start.append(callback)

    def run_before_app_start(self):
        # call before app starts or is exported
        with self.app_context(), self.test_request_context():
            for callback in self.before_app_start:
                callback()


def _find_blueprint():
    if request.blueprint:
        return current_app.blueprints[request.blueprint]


current_blueprint = LocalProxy(_find_blueprint)


def create_app(app_name=None):
    # Configuration settings
    import config
    if not app_name:
        app_name = config.APP_NAME

    # Check if app is created for CLI operations or Web
    cli_mode = False
    if app_name.endswith('-cli'):
        cli_mode = True

    # Only enable password related functionality in server mode.
    if config.SERVER_MODE is True:
        # Some times we need to access these config params where application
        # context is not available (we can't use current_app.config in those
        # cases even with current_app.app_context())
        # So update these params in config itself.
        # And also these updated config values will picked up by application
        # since we are updating config before the application instance is
        # created.

        config.SECURITY_RECOVERABLE = True
        config.SECURITY_CHANGEABLE = True
        # Now we'll open change password page in dialog
        # we don't want it to redirect to main page after password
        # change operation so we will open the same password change page again.
        config.SECURITY_POST_CHANGE_VIEW = 'browser.change_password'

    """Create the Flask application, startup logging and dynamically load
    additional modules (blueprints) that are found in this directory."""
    app = PgAdmin(__name__, static_url_path='/static')
    # Removes unwanted whitespace from render_template function
    app.jinja_env.trim_blocks = True
    app.config.from_object(config)
    app.config.update(dict(PROPAGATE_EXCEPTIONS=True))

    config.SETTINGS_SCHEMA_VERSION = CURRENT_SCHEMA_VERSION
    ##########################################################################
    # Setup logging and log the application startup
    ##########################################################################

    # We won't care about errors in the logging system, we are more
    # interested in application errors.
    logging.raiseExceptions = False

    # Add SQL level logging, and set the base logging level
    logging.addLevelName(25, 'SQL')
    app.logger.setLevel(logging.DEBUG)
    app.logger.handlers = []

    # We also need to update the handler on the webserver in order to see
    # request. Setting the level prevents werkzeug from setting up it's own
    # stream handler thus ensuring all the logging goes through the pgAdmin
    # logger.
    logger = logging.getLogger('werkzeug')
    logger.setLevel(config.CONSOLE_LOG_LEVEL)

    # Set SQLITE_PATH to TEST_SQLITE_PATH while running test cases
    if (
        'PGADMIN_TESTING_MODE' in os.environ and
        os.environ['PGADMIN_TESTING_MODE'] == '1'
    ):
        config.SQLITE_PATH = config.TEST_SQLITE_PATH
        config.MASTER_PASSWORD_REQUIRED = False
        config.UPGRADE_CHECK_ENABLED = False

    if not cli_mode:
        # Ensure the various working directories exist
        from pgadmin.setup import create_app_data_directory
        create_app_data_directory(config)

        # File logging
        from pgadmin.utils.enhanced_log_rotation import \
            EnhancedRotatingFileHandler
        fh = EnhancedRotatingFileHandler(config.LOG_FILE,
                                         config.LOG_ROTATION_SIZE,
                                         config.LOG_ROTATION_AGE,
                                         config.LOG_ROTATION_MAX_LOG_FILES)

        fh.setLevel(config.FILE_LOG_LEVEL)

        if config.JSON_LOGGER:
            json_formatter = JsonFormatter(config.FILE_LOG_FORMAT_JSON)
            fh.setFormatter(json_formatter)
        else:
            fh.setFormatter(logging.Formatter(config.FILE_LOG_FORMAT))

        app.logger.addHandler(fh)
        logger.addHandler(fh)

    # Console logging
    ch = logging.StreamHandler()
    ch.setLevel(config.CONSOLE_LOG_LEVEL)

    if config.JSON_LOGGER:
        json_formatter = JsonFormatter(config.CONSOLE_LOG_FORMAT_JSON)
        ch.setFormatter(json_formatter)
    else:
        ch.setFormatter(logging.Formatter(config.CONSOLE_LOG_FORMAT))

    app.logger.addHandler(ch)
    logger.addHandler(ch)

    # Log the startup
    app.logger.info('########################################################')
    app.logger.info('Starting %s v%s...', config.APP_NAME, config.APP_VERSION)
    app.logger.info('########################################################')
    app.logger.debug("Python syspath: %s", sys.path)

    ##########################################################################
    # Setup i18n
    ##########################################################################

    # Initialise i18n
    babel = Babel(app)

    def get_locale():
        """Get the language for the user."""
        language = 'en'
        if config.SERVER_MODE is False:
            # Get the user language preference from the miscellaneous module
            user_id = None
            if current_user and current_user.is_authenticated:
                user_id = current_user.id
            else:
                user = user_datastore.find_user(email=config.DESKTOP_USER)
                if user is not None:
                    user_id = user.id
            user_language = Preferences.raw_value(
                'misc', 'user_language', 'user_interface', user_id
            )
            if user_language is not None:
                language = user_language
        else:
            # If language is available in get request then return the same
            # otherwise check the session or cookie
            data = request.form
            if 'language' in data:
                language = data['language'] or language
                setattr(session, 'PGADMIN_LANGUAGE', language)
            elif hasattr(session, 'PGADMIN_LANGUAGE'):
                language = getattr(session, 'PGADMIN_LANGUAGE', language)
            elif hasattr(request.cookies, 'PGADMIN_LANGUAGE'):
                language = getattr(
                    request.cookies, 'PGADMIN_LANGUAGE', language
                )

        return language

    babel.init_app(app, locale_selector=get_locale)
    ##########################################################################
    # Setup authentication
    ##########################################################################
    if config.CONFIG_DATABASE_URI is not None and \
            len(config.CONFIG_DATABASE_URI) > 0:
        app.config['SQLALCHEMY_DATABASE_URI'] = config.CONFIG_DATABASE_URI
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///{0}?timeout={1}' \
            .format(config.SQLITE_PATH.replace('\\', '/'),
                    getattr(config, 'SQLITE_TIMEOUT', 500)
                    )

    # Override USER_DOES_NOT_EXIST and INVALID_PASSWORD messages from flask.
    app.config['SECURITY_MSG_USER_DOES_NOT_EXIST'] = \
        app.config['SECURITY_MSG_INVALID_PASSWORD'] = \
        (gettext("Incorrect username or password."), "error")
    app.config['SECURITY_PASSWORD_LENGTH_MIN'] = config.PASSWORD_LENGTH_MIN

    # Create database connection object and mailer
    db.init_app(app)
    Migrate(app, db)

    ##########################################################################
    # Upgrade the schema (if required)
    ##########################################################################
    from config import SQLITE_PATH
    from pgadmin.setup import db_upgrade

    def backup_db_file():
        """
        Create a backup of the current database file
        and create new database file with default settings.
        """
        backup_file_name = "{0}.{1}".format(
            SQLITE_PATH, datetime.now().strftime('%Y%m%d%H%M%S'))
        os.rename(SQLITE_PATH, backup_file_name)
        app.logger.error('Exception in database migration.')
        app.logger.info('Creating new database file.')
        try:
            db_upgrade(app)
            os.environ[
                'CORRUPTED_DB_BACKUP_FILE'] = backup_file_name
            app.logger.info('Database migration completed.')
        except Exception:
            app.logger.error('Database migration failed')
            app.logger.error(traceback.format_exc())
            raise RuntimeError('Migration failed')

    def upgrade_db():
        """
        Execute the migrations.
        """
        try:
            db_upgrade(app)
            os.environ['CORRUPTED_DB_BACKUP_FILE'] = ''
        except Exception:
            app.logger.error('Database migration failed')
            app.logger.error(traceback.format_exc())
            backup_db_file()

        # check all tables are present in the db.
        is_db_error, invalid_tb_names = check_db_tables()
        if is_db_error:
            app.logger.error(
                'Table(s) {0} are missing in the'
                ' database'.format(invalid_tb_names))
            backup_db_file()

    def run_migration_for_sqlite():
        # Run migration for the first time i.e. create database
        # If version not available, user must have aborted. Tables are not
        # created and so its an empty db
        if not os.path.exists(SQLITE_PATH) or get_version() == -1:
            # If running in cli mode then don't try to upgrade, just raise
            # the exception
            if not cli_mode:
                upgrade_db()
            else:
                if not os.path.exists(SQLITE_PATH):
                    raise FileNotFoundError(
                        'SQLite database file "' + SQLITE_PATH +
                        '" does not exists.')
                raise RuntimeError(
                    'The configuration database file is not valid.')
        else:
            schema_version = get_version()

            # Run migration if current schema version is greater than the
            # schema version stored in version table
            if CURRENT_SCHEMA_VERSION > schema_version:
                # Take a backup of the old database file.
                try:
                    prev_database_file_name = \
                        "{0}.prev.bak".format(SQLITE_PATH)
                    shutil.copyfile(SQLITE_PATH, prev_database_file_name)
                except Exception as e:
                    app.logger.error(e)

                upgrade_db()
            else:
                # check all tables are present in the db.
                is_db_error, invalid_tb_names = check_db_tables()
                if is_db_error:
                    app.logger.error(
                        'Table(s) {0} are missing in the'
                        ' database'.format(invalid_tb_names))
                    backup_db_file()

            # Update schema version to the latest
            if CURRENT_SCHEMA_VERSION > schema_version:
                set_version(CURRENT_SCHEMA_VERSION)
                db.session.commit()

        if os.name != 'nt':
            os.chmod(config.SQLITE_PATH, 0o600)

    def run_migration_for_others():
        # Run migration for the first time i.e. create database
        # If version not available, user must have aborted. Tables are not
        # created and so its an empty db
        if get_version() == -1:
            db_upgrade(app)
        else:
            schema_version = get_version()

            # Run migration if current schema version is greater than
            # the schema version stored in version table.
            if CURRENT_SCHEMA_VERSION > schema_version:
                db_upgrade(app)
                # Update schema version to the latest
                set_version(CURRENT_SCHEMA_VERSION)
                db.session.commit()

    from pgadmin.browser.server_groups.servers.utils import (
        delete_adhoc_servers)
    with app.app_context():
        # Run the migration as per specified by the user.
        if config.CONFIG_DATABASE_URI is not None and \
                len(config.CONFIG_DATABASE_URI) > 0:
            run_migration_for_others()
        else:
            run_migration_for_sqlite()

        # Delete all the adhoc(temporary) servers from the pgAdmin database.
        delete_adhoc_servers()

    Mail(app)

    # Don't bother paths when running in cli mode
    if not cli_mode:
        from pgadmin.utils import paths
        paths.init_app()

    # Setup Flask-Security
    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    security = Security(None, user_datastore)

    ##########################################################################
    # Setup security
    ##########################################################################
    with app.app_context():
        config.CSRF_SESSION_KEY = Keys.query.filter_by(
            name='CSRF_SESSION_KEY').first().value
        config.SECRET_KEY = Keys.query.filter_by(
            name='SECRET_KEY').first().value
        config.SECURITY_PASSWORD_SALT = Keys.query.filter_by(
            name='SECURITY_PASSWORD_SALT').first().value

    # Update the app.config with proper security keyes for signing CSRF data,
    # signing cookies, and the SALT for hashing the passwords.
    app.config.update(dict({
        'CSRF_SESSION_KEY': config.CSRF_SESSION_KEY,
        'SECRET_KEY': config.SECRET_KEY,
        'SECURITY_PASSWORD_SALT': config.SECURITY_PASSWORD_SALT,
        'SESSION_COOKIE_DOMAIN': config.SESSION_COOKIE_DOMAIN,
        # CSRF Token expiration till session expires
        'WTF_CSRF_TIME_LIMIT': getattr(config, 'CSRF_TIME_LIMIT', None),
        'WTF_CSRF_METHODS': ['GET', 'POST', 'PUT', 'DELETE'],
        # Disable deliverable check for email addresss
        'SECURITY_EMAIL_VALIDATOR_ARGS': config.SECURITY_EMAIL_VALIDATOR_ARGS,
        # Disable CSRF for unauthenticated endpoints
        'SECURITY_CSRF_IGNORE_UNAUTH_ENDPOINTS': True
    }))

    app.config.update(dict({
        'INTERNAL': INTERNAL,
        'LDAP': LDAP,
        'KERBEROS': KERBEROS,
        'OAUTH2': OAUTH2,
        'WEBSERVER': WEBSERVER
    }))

    security.init_app(app, user_datastore)

    # Flask-Security-Too > 5.4.* requires custom unauth handeler
    # to be registeres with it.
    security.unauthn_handler(pga_unauthorised)

    # Set the permanent session lifetime to the specified value in config file.
    app.permanent_session_lifetime = timedelta(
        days=config.SESSION_EXPIRATION_TIME)

    if not cli_mode:
        app.session_interface = create_session_interface(
            app, config.SESSION_SKIP_PATHS
        )

    # Make the Session more secure against XSS & CSRF when running in web mode
    if config.SERVER_MODE and config.ENHANCED_COOKIE_PROTECTION:
        paranoid = Paranoid(app)
        paranoid.redirect_view = _INDEX_PATH

    ##########################################################################
    # Load all available server drivers
    ##########################################################################
    driver.init_app(app)
    authenticate.init_app(app)
    heartbeat.init_app(app)

    ##########################################################################
    # Register language to the preferences after login
    ##########################################################################
    @user_logged_in.connect_via(app)
    def register_language(sender, user):
        # After logged in, set the language in the preferences if we get from
        # the login page
        data = request.form
        if 'language' in data:
            language = data['language']

            # Set the user language preference
            misc_preference = Preferences.module('misc')
            user_languages = misc_preference.preference(
                'user_language'
            )

            if user_languages and language:
                language = user_languages.set(language)

    ##########################################################################
    # Register any local servers we can discover
    ##########################################################################
    @user_logged_in.connect_via(app)
    def on_user_logged_in(sender, user):

        # If Auto Discover servers is turned off then return from the
        # function.
        if not config.AUTO_DISCOVER_SERVERS:
            return

        # Keep hold of the user ID
        user_id = user.id

        # Get the first server group for the user
        servergroup_id = 1
        servergroups = ServerGroup.query.filter_by(
            user_id=user_id
        ).order_by("id")

        if int(servergroups.count()) > 0:
            servergroup = servergroups.first()
            servergroup_id = servergroup.id

        '''Add a server to the config database'''

        def add_server(user_id, servergroup_id, name, superuser, port,
                       discovery_id, comment):
            # Create a server object if needed, and store it.
            servers = Server.query.filter_by(
                user_id=user_id,
                discovery_id=svr_discovery_id
            ).order_by("id")

            if int(servers.count()) > 0:
                return

            svr = Server(user_id=user_id,
                         servergroup_id=servergroup_id,
                         name=name,
                         host='localhost',
                         port=port,
                         maintenance_db='postgres',
                         username=superuser,
                         connection_params={'sslmode': 'prefer',
                                            'connect_timeout': 10},
                         comment=comment,
                         discovery_id=discovery_id)

            db.session.add(svr)
            db.session.commit()

        # Figure out what servers are present
        if winreg is not None:
            arch_keys = set()
            proc_arch = os.environ['PROCESSOR_ARCHITECTURE'].lower()

            try:
                proc_arch64 = os.environ['PROCESSOR_ARCHITEW6432'].lower()
            except Exception:
                proc_arch64 = None

            if proc_arch == 'x86' and not proc_arch64:
                arch_keys.add(0)
            elif proc_arch == 'x86' or proc_arch == 'amd64':
                arch_keys.add(winreg.KEY_WOW64_32KEY)
                arch_keys.add(winreg.KEY_WOW64_64KEY)

            for arch_key in arch_keys:
                for server_type in ('PostgreSQL', 'EnterpriseDB'):
                    try:
                        root_key = winreg.OpenKey(
                            winreg.HKEY_LOCAL_MACHINE,
                            "SOFTWARE\\" + server_type + "\\Services", 0,
                            winreg.KEY_READ | arch_key
                        )
                        for i in range(0, winreg.QueryInfoKey(root_key)[0]):
                            inst_id = winreg.EnumKey(root_key, i)
                            inst_key = winreg.OpenKey(root_key, inst_id)

                            svr_name = winreg.QueryValueEx(
                                inst_key, 'Display Name'
                            )[0]
                            svr_superuser = winreg.QueryValueEx(
                                inst_key, 'Database Superuser'
                            )[0]
                            svr_port = winreg.QueryValueEx(inst_key, 'Port')[0]
                            svr_discovery_id = inst_id
                            svr_comment = gettext(
                                "Auto-detected {0} installation with the data "
                                "directory at {1}").format(
                                    winreg.QueryValueEx(
                                        inst_key, 'Display Name'
                                    )[0],
                                    winreg.QueryValueEx(
                                        inst_key, 'Data Directory'
                                    )[0])

                            add_server(
                                user_id, servergroup_id, svr_name,
                                svr_superuser, svr_port,
                                svr_discovery_id, svr_comment
                            )

                            inst_key.Close()
                    except Exception:
                        pass
        else:
            # We use the postgres-winreg.ini file on non-Windows
            from configparser import ConfigParser

            registry = ConfigParser()

        try:
            registry.read('/etc/postgres-reg.ini')
            sections = registry.sections()

            # Loop the sections, and get the data from any that are PG or PPAS
            for section in sections:
                if (
                    section.startswith('PostgreSQL/') or
                    section.startswith('EnterpriseDB/')
                ):
                    svr_name = registry.get(section, 'Description')
                    svr_superuser = registry.get(section, 'Superuser')

                    # getint function throws exception if value is blank.
                    # Ex: Port=
                    # In such case we should handle the exception and continue
                    # to read the next section of the config file.
                    try:
                        svr_port = registry.getint(section, 'Port')
                    except ValueError:
                        continue

                    svr_discovery_id = section
                    description = registry.get(section, 'Description')
                    data_directory = registry.get(section, 'DataDirectory')
                    svr_comment = gettext("Auto-detected {0} installation "
                                          "with the data directory at {1}"
                                          ).format(description, data_directory)
                    add_server(user_id, servergroup_id, svr_name,
                               svr_superuser, svr_port, svr_discovery_id,
                               svr_comment)

        except Exception as e:
            print(str(e))
            db.session.rollback()

    @user_logged_in.connect_via(app)
    @user_logged_out.connect_via(app)
    def force_session_write(app, user):
        session.force_write = True

    @user_logged_in.connect_via(app)
    def store_crypt_key(app, user):
        # in desktop mode, master password is used to encrypt/decrypt
        # and is stored in the keyManager memory
        if config.SERVER_MODE and 'password' in request.form:
            current_app.keyManager.set(request.form['password'])

    @user_logged_out.connect_via(app)
    def current_user_cleanup(app, user):
        from config import PG_DEFAULT_DRIVER
        from pgadmin.utils.driver import get_driver
        from flask import current_app

        for mdl in current_app.logout_hooks:
            try:
                mdl.on_logout()
            except Exception as e:
                current_app.logger.exception(e)

        _driver = get_driver(PG_DEFAULT_DRIVER)
        _driver.gc_own()

        # remove key
        current_app.keyManager.reset()

    ##########################################################################
    # Load plugin modules
    ##########################################################################
    from .submodules import get_submodules
    for module in get_submodules():
        app.logger.info('Registering blueprint module: %s' % module)
        if app.blueprints.get(module.name) is None:
            app.register_blueprint(module)
            app.register_logout_hook(module)

    @app.before_request
    def limit_host_addr():
        """
        This function validate the hosts from ALLOWED_HOSTS before allowing
        HTTP request to avoid Host Header Injection attack
        :return: None/JSON response with 403 HTTP status code
        """
        client_host = str(request.host).split(':', maxsplit=1)[0]
        valid = True
        allowed_hosts = config.ALLOWED_HOSTS

        if len(allowed_hosts) != 0:
            regex = re.compile(
                r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:/\d{1,2}|)')
            # Create separate list for ip addresses and host names
            ip_set = list(filter(lambda ip: regex.match(ip), allowed_hosts))
            host_set = list(filter(lambda ip: not regex.match(ip),
                                   allowed_hosts))
            is_ip = regex.match(client_host)
            if is_ip:
                ip_address = []
                for ip in ip_set:
                    ip_address.extend(list(ipaddress.ip_network(ip)))
                valid = ip_address.__contains__(
                    ipaddress.ip_address(client_host)
                )
            else:
                valid = host_set.__contains__(client_host)

        if not valid:
            return make_json_response(
                status=403, success=0,
                errormsg=_("403 FORBIDDEN")
            )

    ##########################################################################
    # Handle the desktop login
    ##########################################################################

    @app.before_request
    def before_request():
        """Login the default user if running in desktop mode"""

        # Check the auth key is valid, if it's set, and we're not in server
        # mode, and it's not a help file request.

        if not config.SERVER_MODE and app.PGADMIN_INT_KEY != '' and ((
            'key' not in request.args or
            request.args['key'] != app.PGADMIN_INT_KEY) and
            request.cookies.get('PGADMIN_INT_KEY') != app.PGADMIN_INT_KEY and
            request.endpoint != 'help.static'
        ):
            abort(401)

        if not config.SERVER_MODE and not current_user.is_authenticated:
            user = user_datastore.find_user(email=config.DESKTOP_USER)
            # Throw an error if we failed to find the desktop user, to give
            # the sysadmin a hint. We'll continue to try to login anyway as
            # that'll through a nice 500 error for us.
            if user is None:
                app.logger.error(
                    'The desktop user %s was not found in the configuration '
                    'database.'
                    % config.DESKTOP_USER
                )
                abort(401)
            login_user(user)
        elif config.SERVER_MODE and not current_user.is_authenticated and \
                request.endpoint in ('redirects.index', 'security.login') and \
                app.PGADMIN_EXTERNAL_AUTH_SOURCE in [KERBEROS, WEBSERVER]:
            return authenticate.login()
        # if the server is restarted the in memory key will be lost
        # but the user session may still be active. Logout the user
        # to get the key again when login
        if config.SERVER_MODE and current_user.is_authenticated and \
            'auth_source_manager' in session and \
            session['auth_source_manager']['current_source'] not in \
            [KERBEROS, OAUTH2, WEBSERVER] and \
                current_app.keyManager.get() is None and \
                request.endpoint not in ('security.login', 'security.logout'):
            logout_user()

    @app.after_request
    def after_request(response):
        if 'key' in request.args:
            domain = dict()
            if config.COOKIE_DEFAULT_DOMAIN and \
                    config.COOKIE_DEFAULT_DOMAIN != 'localhost':
                domain['domain'] = config.COOKIE_DEFAULT_DOMAIN
            response.set_cookie('PGADMIN_INT_KEY', value=request.args['key'],
                                path=config.SESSION_COOKIE_PATH,
                                secure=config.SESSION_COOKIE_SECURE,
                                httponly=config.SESSION_COOKIE_HTTPONLY,
                                samesite=config.SESSION_COOKIE_SAMESITE,
                                **domain)

        SecurityHeaders.set_response_headers(response)
        return response

    ##########################################################################
    # Cache busting
    ##########################################################################

    # Version number to be added to all static file url requests
    # This is used by url_for function when generating urls
    # This will solve caching issues when application is upgrading
    # This is called - Cache Busting
    @app.url_defaults
    def add_internal_version(endpoint, values):
        extensions = config.APP_VERSION_EXTN

        # Add the internal version only if it is set
        if config.APP_VERSION_PARAM is not None and \
           config.APP_VERSION_PARAM != '':
            # If there is a filename, add the version
            if 'filename' in values \
               and values['filename'].endswith(extensions):
                values[config.APP_VERSION_PARAM] = config.APP_VERSION_INT
            else:
                # Sometimes there may be direct endpoint for some files
                # There will be only one rule for such endpoints
                urls = [url for url in app.url_map.iter_rules(endpoint)]
                if len(urls) == 1 and urls[0].rule.endswith(extensions):
                    values[config.APP_VERSION_PARAM] = \
                        config.APP_VERSION_INT

    # Strip away internal version param before sending further to app as it was
    # required for cache busting only
    @app.url_value_preprocessor
    def strip_version_number(endpoint, values):
        if values and config.APP_VERSION_PARAM in values:
            values.pop(config.APP_VERSION_PARAM)

    ##########################################################################
    # Minify output. Not required in desktop mode
    ##########################################################################
    if not config.DEBUG and config.SERVER_MODE:
        from flask_compress import Compress
        Compress(app)

    @app.context_processor
    def inject_blueprint():
        """
        Inject a reference to the current blueprint, if any.
        """

        return {
            'current_app': current_app,
            'current_blueprint': current_blueprint,
        }

    @app.errorhandler(Exception)
    def all_exception_handler(e):
        current_app.logger.error(e, exc_info=True)
        return internal_server_error(errormsg=str(e))

    # Exclude HTTPexception from above handler (all_exception_handler)
    # HTTPException are user defined exceptions and those should be returned
    # as is
    @app.errorhandler(HTTPException)
    def http_exception_handler(e):
        current_app.logger.error(e, exc_info=True)
        return e

    # Send unauthorized response if CSRF errors occurs.
    @app.errorhandler(CSRFError)
    def handle_csrf_error(error):
        err_msg = str(error.description) + \
            gettext(' You need to refresh the page.')
        return unauthorized(errormsg=err_msg)

    # Initialize the key manager
    app.keyManager = KeyManager()

    ##########################################################################
    # Protection against CSRF attacks
    ##########################################################################
    with app.app_context():
        pgCSRFProtect.init_app(app)

    ##########################################################################
    # All done!
    ##########################################################################
    socketio.init_app(app, cors_allowed_origins="*")
    return app
