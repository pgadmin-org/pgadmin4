##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""The main pgAdmin module. This handles the application initialisation tasks,
such as setup of logging, dynamic loading of modules etc."""
from collections import defaultdict
from flask import Flask, abort, request, current_app
from flask.ext.babel import Babel
from flask.ext.security import Security, SQLAlchemyUserDatastore
from flask_security.utils import login_user
from flask_mail import Mail
from htmlmin.minify import html_minify
from settings.settings_model import db, Role, User
from importlib import import_module
from werkzeug.local import LocalProxy
from pgadmin.utils import PgAdminModule
from werkzeug.utils import find_modules
import sys
import logging

# Configuration settings
import config


class PgAdmin(Flask):

    def find_submodules(self, basemodule):
        for module_name in find_modules(basemodule, True):
            if module_name in self.config['MODULE_BLACKLIST']:
                self.logger.info('Skipping blacklisted module: %s' %
                                module_name)
                continue
            self.logger.info('Examining potential module: %s' % module_name)
            module = import_module(module_name)
            for key, value in module.__dict__.items():
                if isinstance(value, PgAdminModule):
                    yield value

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
        return stylesheets

    @property
    def javascripts(self):
        stylesheets = []
        for module in self.submodules:
            stylesheets.extend(getattr(module, "javascripts", []))
        return stylesheets

    @property
    def panels(self):
        panels = []
        for module in self.submodules:
            panels.extend(module.get_panels())
        return panels

def _find_blueprint():
    if request.blueprint:
        return current_app.blueprints[request.blueprint]

current_blueprint = LocalProxy(_find_blueprint)


def create_app(app_name=config.APP_NAME):
    """Create the Flask application, startup logging and dynamically load
    additional modules (blueprints) that are found in this directory."""
    app = PgAdmin(__name__, static_url_path='/static')
    app.config.from_object(config)

    ##########################################################################
    # Setup logging and log the application startup
    ##########################################################################

    # Add SQL level logging, and set the base logging level
    logging.addLevelName(25, 'SQL')
    app.logger.setLevel(logging.DEBUG)
    app.logger.handlers = []

    # We also need to update the handler on the webserver in order to see request.
    # Setting the level prevents werkzeug from setting up it's own stream handler
    # thus ensuring all the logging goes through the pgAdmin logger.
    logger = logging.getLogger('werkzeug')
    logger.setLevel(logging.INFO)

    # File logging
    fh = logging.FileHandler(config.LOG_FILE)
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
    app.logger.info('################################################################################')
    app.logger.info('Starting %s v%s...', config.APP_NAME, config.APP_VERSION)
    app.logger.info('################################################################################')
    app.logger.debug("Python syspath: %s", sys.path)

    ##########################################################################
    # Setup i18n
    ##########################################################################

    # Initialise i18n
    babel = Babel(app)

    app.logger.debug('Available translations: %s' % babel.list_translations())

    @babel.localeselector
    def get_locale():
        """Get the best language for the user."""
        language = request.accept_languages.best_match(config.LANGUAGES.keys())
        return language

    ##########################################################################
    # Setup authentication
    ##########################################################################

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + config.SQLITE_PATH.replace('\\', '/')

    # Only enable password related functionality in server mode.
    if config.SERVER_MODE is True:
        # TODO: Figure out how to disable /logout and /login
        app.config['SECURITY_RECOVERABLE'] = True
        app.config['SECURITY_CHANGEABLE'] = True

    # Create database connection object and mailer
    db.init_app(app)
    Mail(app)

    # Setup Flask-Security
    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    Security(app, user_datastore)

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
        if config.SERVER_MODE is False:
            user = user_datastore.get_user(config.DESKTOP_USER)

            # Throw an error if we failed to find the desktop user, to give
            # the sysadmin a hint. We'll continue to try to login anyway as
            # that'll through a nice 500 error for us.
            if user is None:
                app.logger.error('The desktop user %s was not found in the configuration database.' % config.DESKTOP_USER)
                abort(401)

            login_user(user)

    ##########################################################################
    # Minify output
    ##########################################################################
    @app.after_request
    def response_minify(response):
        """Minify html response to decrease traffic"""
        if config.MINIFY_HTML and not config.DEBUG:
            if response.content_type == u'text/html; charset=utf-8':
                response.set_data(
                    html_minify(response.get_data(as_text=True))
                )

        return response

    @app.context_processor
    def inject_blueprint():
        """Inject a reference to the current blueprint, if any."""
        menu_items = defaultdict(list)
        for blueprint in app.submodules:
            menu_items.update(getattr(blueprint, "menu_items", {}))
        return {
            'current_app': current_app,
            'current_blueprint': current_blueprint,
            'menu_items': menu_items }

    ##########################################################################
    # All done!
    ##########################################################################

    app.logger.debug('URL map: %s' % app.url_map)
    return app
