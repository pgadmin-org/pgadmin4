##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""This is the main application entry point for pgAdmin 4. If running on
a webserver, this will provide the WSGI interface, otherwise, we're going
to start a web server."""

import os
import sys

# We need to include the root directory in sys.path to ensure that we can
# find everything we need when running in the standalone runtime.
root = os.path.dirname(os.path.realpath(__file__))
if sys.path[0] != root:
    sys.path.insert(0, root)

import config
from pgadmin import create_app

##########################################################################
# Sanity checks
##########################################################################

# Check for local settings if running in server mode
if config.SERVER_MODE is True:
    local_config = os.path.join(os.path.dirname(os.path.realpath(__file__)),
                                'config_local.py')
    if not os.path.isfile(local_config):
        print "The configuration file %s does not exist.\n" % local_config
        print "Before running this application, ensure that config_local.py has been created"
        print "and sets values for SECRET_KEY, SECURITY_PASSWORD_SALT and CSRF_SESSION_KEY"
        print "at bare minimum. See config.py for more information and a complete list of"
        print "settings. Exiting..."
        sys.exit(1)

# Check if the database exists. If it does not, tell the user and exit.
if not os.path.isfile(config.SQLITE_PATH):
    print "The configuration database %s does not exist.\n" % config.SQLITE_PATH
    print "Please run 'python %s' to create it.\nExiting..." % os.path.join(
        os.path.dirname(os.path.realpath(__file__)), 'setup.py')
    sys.exit(1)

##########################################################################
# Server starup
##########################################################################

# Create the app!
app = create_app()

if config.DEBUG:
    app.debug = True

# Start the web server. The port number should have already been set by the
# runtime if we're running in desktop mode, otherwise we'll just use the
# Flask default.
if 'PGADMIN_PORT' in globals():
    app.logger.debug('PGADMIN_PORT set in the runtime environment to %s',
                     globals()['PGADMIN_PORT'])
    server_port = int(globals()['PGADMIN_PORT'])
else:
    app.logger.debug(
        'PGADMIN_PORT is not set in the runtime environment, using default of %s',
        config.DEFAULT_SERVER_PORT)
    server_port = config.DEFAULT_SERVER_PORT

try:
    app.run(port=server_port)
except IOError:
    app.logger.error("Error starting the app server: %s", sys.exc_info())
