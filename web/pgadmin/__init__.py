##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# pgadmin/__init__.py - Main application startup
#
##########################################################################

import logging
import os, sys
from flask import Flask
from time import time, ctime

# Configuration settings
import config

def create_app(app_name=config.APP_NAME):

    # Setup the app object
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
 
    # Register all the modules
    for m in config.MODULES:
        app.register_module(__import__('%s.views' % m).module)
    
    return app
