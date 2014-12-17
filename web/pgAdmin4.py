##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# pgAdmin4.py - Main application entry point
#
##########################################################################

import logging
import os, sys
from flask import Flask
from time import time, ctime

# We need to include the root directory in sys.path to ensure that we can
# find everything we need when running in the standalone runtime.
sys.path.append(os.path.dirname(__file__))

# Configuration settings
import config

# Setup the app object
app = Flask(__name__, static_url_path='')

#
# Setup logging and log the application startup
#

logging.addLevelName(25, 'SQL')
app.logger.setLevel(logging.DEBUG)

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

app.logger.info('################################################################################')
app.logger.info('Starting pgAdmin 4...')
app.logger.info('################################################################################')

# The main index page
@app.route("/")
def index():

    output = """
Today is <b>%s</b>
<br />
<i>This is Flask-generated HTML.</i>
<br /><br />
<a href="http://www.pgadmin.org/">pgAdmin 4</a>""" % ctime(time())

    return output

# A special URL used to "ping" the server
@app.route("/ping")
def ping():
    return "PING"

# Start the web server. The port number should have already been set by the
# runtime if we're running in desktop mode, otherwise we'll just use the 
# Flask default.
if 'PGADMIN_PORT' in globals():
    app.logger.debug('PGADMIN_PORT set in the runtime environment to %s', PGADMIN_PORT)
    server_port = PGADMIN_PORT
else:
    app.logger.debug('PGADMIN_PORT is not set in the runtime environment, using default of %s', config.DEFAULT_SERVER_PORT)
    server_port = config.DEFAULT_SERVER_PORT

if __name__ == '__main__':
    try:
        app.run(port=server_port)
    except IOError:
        app.logger.error("Error starting the web server: %s", sys.exc_info())

