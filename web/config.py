##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# config.py - Core application configuration settings 
#
##########################################################################

from logging import *

##########################################################################
# Application settings
##########################################################################

# Name of the application to display in the UI
APP_NAME = 'pgAdmin 4'

# Application version number components
APP_MAJOR = 1
APP_MINOR = 0
APP_REVISION = 0

# Application version suffix, e.g. 'beta1', 'dev'. Usually an empty string
# for GA releases.
APP_SUFFIX = 'dev'

# DO NOT CHANGE!
# The application version string, constructed from the components
APP_VERSION = '%s.%s.%s-%s' % (APP_MAJOR, APP_MINOR, APP_REVISION, APP_SUFFIX)

# DO NOT CHANGE!
# List of modules to enable
MODULES = [ 'utils' ]

##########################################################################
# Log settings
##########################################################################

# Debug mode?
DEBUG = False

# Application log level - one of:
#   CRITICAL	50
#   ERROR	40
#   WARNING	30
#   SQL		25
#   INFO	20
#   DEBUG       10
#   NOTSET	0
CONSOLE_LOG_LEVEL = WARNING
FILE_LOG_LEVEL = INFO

# Log format. 
CONSOLE_LOG_FORMAT='%(asctime)s: %(levelname)s\t%(name)s:\t%(message)s'
FILE_LOG_FORMAT='%(asctime)s: %(levelname)s\t%(name)s:\t%(message)s'

# Log file name
LOG_FILE = 'pgadmin4.log'

##########################################################################
# Server settings
##########################################################################

# The default port on which the app server will listen if not set in the
# environment by the runtime
DEFAULT_SERVER_PORT = 5050

# Enable CSRF protection?
CSRF_ENABLED = True

# Secret key for signing CSRF data. Override this in config_local.py if 
# running on a web server
CSRF_SESSION_KEY = 'SuperSecret'

# Secret key for signing cookies. Override this in config_local.py if 
# running on a web server
SECRET_KEY = 'SuperSecret'

##########################################################################
# Local config settings
##########################################################################

# Load local config overrides
try:
    from config_local import *
except ImportError:
    pass
