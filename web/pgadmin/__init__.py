##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""The main pgAdmin module. This handles the application initialisation tasks,
such as setup of logging, dynamic loading of modules etc."""
import logging
import os, sys
from collections import defaultdict
from importlib import import_module

from flask import Flask, abort, request, current_app, session
from flask_babel import Babel, gettext
from flask_htmlmin import HTMLMIN
from flask_login import user_logged_in
from flask_security import Security, SQLAlchemyUserDatastore
from flask_mail import Mail
from flask_security.utils import login_user
from werkzeug.datastructures import ImmutableDict

from pgadmin.utils import PgAdminModule, driver
from pgadmin.utils.versioned_template_loader import VersionedTemplateLoader
from pgadmin.utils.session import create_session_interface
from werkzeug.local import LocalProxy
from werkzeug.utils import find_modules

from pgadmin.utils.preferences import Preferences

from pgadmin.model import db, Role, Server, ServerGroup, User, Keys

# If script is running under python3, it will not have the xrange function
# defined
winreg = None
if sys.version_info[0] >= 3:
    xrange = range
    if os.name == 'nt':
        import winreg
elif os.name == 'nt':
    import _winreg as winreg


class PgAdmin(Flask):
    def __init__(self, *args, **kwargs):
        # Set the template loader to a postgres-version-aware loader
        self.jinja_options = ImmutableDict(
            extensions=['jinja2.ext.autoescape', 'jinja2.ext.with_'],
            loader=VersionedTemplateLoader(self)
        )
        super(PgAdmin, self).__init__(*args, **kwargs)

    def find_submodules(self, basemodule):
        for module_name in find_modules(basemodule, True):
            if module_name in self.config['MODULE_BLACKLIST']:
                self.logger.info(
                    'Skipping blacklisted module: %s' % module_name
                )
                continue
            self.logger.info('Examining potential module: %s' % module_name)
            module = import_module(module_name)
            for key in list(module.__dict__.keys()):
                if isinstance(module.__dict__[key], PgAdminModule):
                    yield module.__dict__[key]

    @property
    def submodules(self):
        for blueprint in self.blueprints.values():
            if isinstance(blueprint, PgAdminModule):
                yield blueprint

    @property
    def stylesheets(self):
        stylesheets = []
        for module in self.submodules:
            stylesheets.extend(getattr(module, "stylesheets", []))
        return set(stylesheets)

    @property
    def messages(self):
        messages = dict()
        for module in self.submodules:
            messages.update(getattr(module, "messages", dict()))
        return messages

    @property
    def exposed_endpoint_url_map(self):
        for rule in current_app.url_map.iter_rules('static'):
            yield rule.endpoint, rule.rule

        for module in self.submodules:
            for endpoint in module.exposed_endpoints:
                for rule in current_app.url_map.iter_rules(endpoint):
                    yield rule.endpoint, rule.rule

    @property
    def javascripts(self):
        scripts = []
        scripts_names = []

        # Remove duplicate javascripts from the list
        for module in self.submodules:
            module_scripts = getattr(module, "javascripts", [])
            for s in module_scripts:
                if s['name'] not in scripts_names:
                    scripts.append(s)
                    scripts_names.append(s['name'])

        return scripts

    @property
    def panels(self):
        panels = []
        for module in self.submodules:
            panels.extend(module.get_panels())
        return panels

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


def _find_blueprint():
    if request.blueprint:
        return current_app.blueprints[request.blueprint]


current_blueprint = LocalProxy(_find_blueprint)


def create_app(app_name=None):

    # Configuration settings
    import config
    if not app_name:
        app_name = config.APP_NAME

    """Create the Flask application, startup logging and dynamically load
    additional modules (blueprints) that are found in this directory."""
    app = PgAdmin(__name__, static_url_path='/static')
    # Removes unwanted whitespace from render_template function
    app.jinja_env.trim_blocks = True
    app.config.from_object(config)
    app.config.update(dict(PROPAGATE_EXCEPTIONS=True))

    ##########################################################################
    # Setup logging and log the application startup
    ##########################################################################

    # Add SQL level logging, and set the base logging level
    logging.addLevelName(25, 'SQL')
    app.logger.setLevel(logging.DEBUG)
    app.logger.handlers = []

    # We also need to update the handler on the webserver in order to see
    # request. Setting the level prevents werkzeug from setting up it's own
    # stream handler thus ensuring all the logging goes through the pgAdmin
    # logger.
    logger = logging.getLogger('werkzeug')
    logger.setLevel(logging.INFO)

    # Set SQLITE_PATH to TEST_SQLITE_PATH while running test cases
    if "PGADMIN_TESTING_MODE" in os. environ and \
                    os.environ["PGADMIN_TESTING_MODE"] == "1":
        config.SQLITE_PATH = config.TEST_SQLITE_PATH

    # Ensure the various working directories exist
    from pgadmin.setup import create_app_data_directory, db_upgrade
    create_app_data_directory(config)

    # File logging
    fh = logging.FileHandler(config.LOG_FILE, encoding='utf-8')
    fh.setLevel(config.FILE_LOG_LEVEL)
    fh.setFormatter(logging.Formatter(config.FILE_LOG_FORMAT))
    app.logger.addHandler(fh)
    logger.addHandler(fh)

    # Console logging
    ch = logging.StreamHandler()
    ch.setLevel(config.CONSOLE_LOG_LEVEL)
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

    app.logger.debug('Available translations: %s' % babel.list_translations())

    @babel.localeselector
    def get_locale():
        """Get the language for the user."""
        language = 'en'
        if config.SERVER_MODE is False:
            # Get the user language preference from the miscellaneous module
            misc_preference = Preferences.module('miscellaneous', False)
            if misc_preference:
                user_languages = misc_preference.preference(
                    'user_language'
                )
                if user_languages:
                    language = user_languages.get() or language
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
                language = getattr(request.cookies, 'PGADMIN_LANGUAGE', language)

        return language

    ##########################################################################
    # Setup authentication
    ##########################################################################

    app.config['SQLALCHEMY_DATABASE_URI'] = u'sqlite:///{0}?timeout={1}'.format(
        config.SQLITE_PATH.replace(u'\\', u'/'),
        getattr(config, 'SQLITE_TIMEOUT', 500)
    )

    # Only enable password related functionality in server mode.
    if config.SERVER_MODE is True:
        # TODO: Figure out how to disable /logout and /login
        app.config['SECURITY_RECOVERABLE'] = True
        app.config['SECURITY_CHANGEABLE'] = True

    # Create database connection object and mailer
    db.init_app(app)

    ##########################################################################
    # Upgrade the schema (if required)
    ##########################################################################
    db_upgrade(app)

    Mail(app)

    import pgadmin.utils.paths as paths
    paths.init_app(app)

    # Setup Flask-Security
    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    security = Security(None, user_datastore)

    ##########################################################################
    # Setup security
    ##########################################################################
    with app.app_context():
        config.CSRF_SESSION_KEY = Keys.query.filter_by(name = 'CSRF_SESSION_KEY').first().value
        config.SECRET_KEY = Keys.query.filter_by(name = 'SECRET_KEY').first().value
        config.SECURITY_PASSWORD_SALT = Keys.query.filter_by(name = 'SECURITY_PASSWORD_SALT').first().value

    # Update the app.config with proper security keyes for signing CSRF data,
    # signing cookies, and the SALT for hashing the passwords.
    app.config.update(dict(CSRF_SESSION_KEY=config.CSRF_SESSION_KEY))
    app.config.update(dict(SECRET_KEY=config.SECRET_KEY))
    app.config.update(dict(SECURITY_PASSWORD_SALT=config.SECURITY_PASSWORD_SALT))

    security.init_app(app)

    app.session_interface = create_session_interface(app)

    ##########################################################################
    # Load all available server drivers
    ##########################################################################
    driver.init_app(app)

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
            misc_preference = Preferences.module('miscellaneous')
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

        # Keep hold of the user ID
        user_id = user.id

        # Get the first server group for the user
        servergroup_id = 1
        servergroups = ServerGroup.query.filter_by(
            user_id=user_id
        ).order_by("id")

        if servergroups.count() > 0:
            servergroup = servergroups.first()
            servergroup_id = servergroup.id

        '''Add a server to the config database'''
        def add_server(user_id, servergroup_id, name, superuser, port, discovery_id, comment):
        # Create a server object if needed, and store it.
            servers = Server.query.filter_by(
                user_id=user_id,
                discovery_id=svr_discovery_id
            ).order_by("id")

            if servers.count() > 0:
                return;

            svr = Server(user_id=user_id,
                            servergroup_id=servergroup_id,
                            name=name,
                            host='localhost',
                            port=port,
                            maintenance_db='postgres',
                            username=superuser,
                            ssl_mode='prefer',
                            comment=svr_comment,
                            discovery_id=discovery_id)

            db.session.add(svr)
            db.session.commit()

        # Figure out what servers are present
        if winreg is not None:
            arch_keys = set()
            proc_arch = os.environ['PROCESSOR_ARCHITECTURE'].lower()

            try:
                proc_arch64 = os.environ['PROCESSOR_ARCHITEW6432'].lower()
            except:
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
                            "SOFTWARE\\" + server_type + "\Services", 0,
                            winreg.KEY_READ | arch_key
                        )
                        for i in xrange(0, winreg.QueryInfoKey(root_key)[0]):
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
                                "Auto-detected %s installation with the data directory at %s" % (
                                    winreg.QueryValueEx(
                                        inst_key, 'Display Name'
                                    )[0],
                                    winreg.QueryValueEx(
                                        inst_key, 'Data Directory'
                                    )[0]
                                )
                            )

                            add_server(
                                user_id, servergroup_id, svr_name,
                                svr_superuser, svr_port,
                                svr_discovery_id, svr_comment
                            )

                            inst_key.Close()
                    except:
                        pass
        else:
            # We use the postgres-winreg.ini file on non-Windows
            try:
                from configparser import ConfigParser
            except ImportError:
                from ConfigParser import ConfigParser  # Python 2

            registry = ConfigParser()

        try:
            registry.read('/etc/postgres-reg.ini')
            sections = registry.sections()

            # Loop the sections, and get the data from any that are PG or PPAS
            for section in sections:
                if section.startswith('PostgreSQL/') or section.startswith('EnterpriseDB/'):
                    svr_name = registry.get(section, 'Description')
                    svr_superuser = registry.get(section, 'Superuser')
                    svr_port = registry.getint(section, 'Port')
                    svr_discovery_id = section
                    description = registry.get(section, 'Description')
                    data_directory = registry.get(section, 'DataDirectory')
                    if hasattr(str, 'decode'):
                        description = description.decode('utf-8')
                        data_directory = data_directory.decode('utf-8')
                    svr_comment = gettext(u"Auto-detected %s installation with the data directory at %s" % (
                        description,
                        data_directory
                    ))
                    add_server(user_id, servergroup_id, svr_name, svr_superuser, svr_port, svr_discovery_id, svr_comment)

        except:
            pass


    ##########################################################################
    # Load plugin modules
    ##########################################################################
    for module in app.find_submodules('pgadmin'):
        app.logger.info('Registering blueprint module: %s' % module)
        app.register_blueprint(module)

    ##########################################################################
    # Handle the desktop login
    ##########################################################################

    @app.before_request
    def before_request():
        """Login the default user if running in desktop mode"""

        # Check the auth key is valid, if it's set, and we're not in server
        # mode, and it's not a help file request.
        if not config.SERVER_MODE and app.PGADMIN_KEY != '':
            if (
                (not 'key' in request.args or request.args['key'] != app.PGADMIN_KEY) and
                request.cookies.get('PGADMIN_KEY') != app.PGADMIN_KEY and
                request.endpoint != 'help.static'
            ):
                abort(401)

        if not config.SERVER_MODE:
            user = user_datastore.get_user(config.DESKTOP_USER)

            # Throw an error if we failed to find the desktop user, to give
            # the sysadmin a hint. We'll continue to try to login anyway as
            # that'll through a nice 500 error for us.
            if user is None:
                app.logger.error(
                    'The desktop user %s was not found in the configuration database.'
                    % config.DESKTOP_USER
                )
                abort(401)

            login_user(user)

    @app.after_request
    def after_request(response):
        if 'key' in request.args:
            response.set_cookie('PGADMIN_KEY', value=request.args['key'])

        return response

    ##########################################################################
    # Minify output
    ##########################################################################
    # HTMLMIN doesn't work with Python 2.6.
    if not config.DEBUG and sys.version_info >= (2,7):
        HTMLMIN(app)

    @app.context_processor
    def inject_blueprint():
        """Inject a reference to the current blueprint, if any."""
        return {
            'current_app': current_app,
            'current_blueprint': current_blueprint
        }

    ##########################################################################
    # All done!
    ##########################################################################
    app.logger.debug('URL map: %s' % app.url_map)

    return app
