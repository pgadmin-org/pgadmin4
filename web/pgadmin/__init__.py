##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""The main pgAdmin module. This handles the application initialisation tasks,
such as setup of logging, dynamic loading of modules etc."""

from flask import Flask, abort
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.security import Security, SQLAlchemyUserDatastore, login_required
from flask_security.utils import login_user
from flask_mail import Mail
from settings_model import db, Role, User

import inspect, imp, logging, os

# Configuration settings
import config

# Global module list
modules = [ ]

def create_app(app_name=config.APP_NAME):
    """Create the Flask application, startup logging and dynamically load
    additional modules (blueprints) that are found in this directory."""
    app = Flask(__name__, static_url_path='')
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

    ##########################################################################
    # Setup authentication
    ##########################################################################
   
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + config.SQLITE_PATH.replace('\\', '/')

    # Only enable password related functionality in server mode.
    if config.SERVER_MODE == True:
        # TODO: Figure out how to disable /logout and /login
        app.config['SECURITY_RECOVERABLE'] = True
        app.config['SECURITY_CHANGEABLE'] = True

    # Create database connection object and mailer
    db.init_app(app)
    mail = Mail(app)

    # Setup Flask-Security
    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    security = Security(app, user_datastore)

    ##########################################################################
    # Load plugin modules
    ##########################################################################

    path = os.path.dirname(os.path.realpath(__file__))
    files = os.listdir(path)

    for f in files:
        d = os.path.join(path, f)
        if os.path.isdir(d) and os.path.isfile(os.path.join(d, '__init__.py')):

            if f in config.MODULE_BLACKLIST:
                app.logger.info('Skipping blacklisted module: %s' % f)
                continue

            # Looks like a module, so import it, and register the blueprint if present
            # We rely on the ordering of syspath to ensure we actually get the right
            # module here. Note that we also try to load the 'browser' module for
            # the browser integration hooks.
            app.logger.info('Examining potential module: %s' % d)
            module = __import__(f, globals(), locals(), ['browser', 'views'], -1)

            # Add the module to the global module list
            modules.append(module)
            
            # Register the blueprint if present
            if 'views' in dir(module) and 'blueprint' in dir(module.views):
                app.logger.info('Registering blueprint module: %s' % f)
                app.register_blueprint(module.views.blueprint)

    ##########################################################################
    # Handle the desktop login
    ##########################################################################

    @app.before_request
    def before_request():
        """Login the default user if running in desktop mode"""
        if config.SERVER_MODE == False:
            user = user_datastore.get_user(config.DESKTOP_USER)

            # Throw an error if we failed to find the desktop user, to give
            # the sysadmin a hint. We'll continue to try to login anyway as
            # that'll through a nice 500 error for us.
            if user is None:
                app.logger.error('The desktop user %s was not found in the configuration database.' % config.DESKTOP_USER)
                abort(401)

            login_user(user)

    ##########################################################################
    # All done!
    ##########################################################################

    app.logger.debug('URL map: %s' % app.url_map)
    return app

