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

import os, sys, inspect
from time import time, ctime
from flask import Flask
import logging

# We need to include the root directory in sys.path to ensure that we can
# find everything we need when running in the standalone runtime.
sys.path.append(os.path.dirname(__file__))

# Configuration settings
from config import *

# Setup the app object
app = Flask(__name__)

# Setup logging and log the application startup
logging.addLevelName(25, 'SQL')
logging.basicConfig(filename=PGADMIN_LOG_FILE, format=PGADMIN_LOG_FORMAT, level=logging.DEBUG)
app.logger.setLevel(PGADMIN_LOG_LEVEL)
app.logger.debug('Starting pgAdmin 4...')

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
    server_port = PGADMIN_PORT
else:
    server_port = 5000

if __name__ == '__main__':
    try:
        app.run(port=server_port)
    except IOError:
        print "Unexpected error: ", sys.exc_info()[0]

