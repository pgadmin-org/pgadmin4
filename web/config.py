# -*- coding: utf-8 -*-

##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# config.py - Core application configuration settings
#
##########################################################################

from logging import *
import os

##########################################################################
# Application settings
##########################################################################

# Name of the application to display in the UI
APP_NAME = 'pgAdmin 4'
APP_ICON = 'icon-postgres-alt'

# Application version number components
APP_RELEASE = 1
APP_REVISION = 0

# Application version suffix, e.g. 'beta1', 'dev'. Usually an empty string
# for GA releases.
APP_SUFFIX = 'beta1'

# Copyright string for display in the app
APP_COPYRIGHT = 'Copyright 2013 - 2016, The pgAdmin Development Team'

# Path to the online help.
HELP_PATH = '../../../docs/en_US/_build/html/'

# Languages we support in the UI
LANGUAGES = {
    'en': 'English',
    'fr': 'Français'
}

# DO NOT CHANGE!
# The application version string, constructed from the components
APP_VERSION = '%s.%s-%s' % (APP_RELEASE, APP_REVISION, APP_SUFFIX)

# DO NOT CHANGE UNLESS YOU KNOW WHAT YOU ARE DOING!
# List of modules to skip when dynamically loading
MODULE_BLACKLIST = ['test']

# DO NOT CHANGE UNLESS YOU KNOW WHAT YOU ARE DOING!
# List of treeview browser nodes to skip when dynamically loading
NODE_BLACKLIST = []

##########################################################################
# Log settings
##########################################################################

# Debug mode?
DEBUG = False

# Application log level - one of:
#   CRITICAL 50
#   ERROR    40
#   WARNING  30
#   SQL      25
#   INFO     20
#   DEBUG    10
#   NOTSET    0
CONSOLE_LOG_LEVEL = WARNING
FILE_LOG_LEVEL = INFO

# Log format.
CONSOLE_LOG_FORMAT = '%(asctime)s: %(levelname)s\t%(name)s:\t%(message)s'
FILE_LOG_FORMAT = '%(asctime)s: %(levelname)s\t%(name)s:\t%(message)s'

# Log file name
LOG_FILE = os.path.join(
    os.path.realpath(os.path.expanduser('~/.pgadmin/')),
    'pgadmin4.log'
    )

##########################################################################
# Server settings
##########################################################################

# The server mode determines whether or not we're running on a web server
# requiring user authentication, or desktop mode which uses an automatic
# default login.
#
# DO NOT DISABLE SERVER MODE IF RUNNING ON A WEBSERVER!!
SERVER_MODE = True

# User ID (email address) to use for the default user in desktop mode.
# The default should be fine here, as it's not exposed in the app.
DESKTOP_USER = 'pgadmin4@pgadmin.org'

# This configuration otion allows the user to host the application on a LAN
# Default hosting is on localhost (DEFAULT_SERVER='localhost').
# To host pgAdmin4 over LAN set DEFAULT_SERVER='0.0.0.0' (or a specific
# adaptor address.
#
# NOTE: This is NOT recommended for production use, only for debugging
# or testing. Production installations should be run as a WSGI application
# behind Apache HTTPD.
DEFAULT_SERVER = 'localhost'

# The default port on which the app server will listen if not set in the
# environment by the runtime
DEFAULT_SERVER_PORT = 5050

# Enable CSRF protection?
CSRF_ENABLED = True

# Secret key for signing CSRF data. Override this in config_local.py if
# running on a web server
CSRF_SESSION_KEY = 'SuperSecret1'

# Secret key for signing cookies. Override this in config_local.py if
# running on a web server
SECRET_KEY = 'SuperSecret2'

# Salt used when hashing passwords. Override this in config_local.py if
# running on a web server
SECURITY_PASSWORD_SALT = 'SuperSecret3'

# Hashing algorithm used for password storage
SECURITY_PASSWORD_HASH = 'pbkdf2_sha512'

# Should HTML be minified on the fly when not in debug mode?
MINIFY_HTML = True


##########################################################################
# Server Connection Driver Settings
##########################################################################

# The default driver used for making connection with PostgreSQL
PG_DEFAULT_DRIVER = 'psycopg2'

# Maximum allowed idle time in minutes before which releasing the connection
# for the particular session. (in minutes)
MAX_SESSION_IDLE_TIME = 60

##########################################################################
# User account and settings storage
##########################################################################

# The schema version number for the configuration database
# DO NOT CHANGE UNLESS YOU ARE A PGADMIN DEVELOPER!!
SETTINGS_SCHEMA_VERSION = 11

# The default path to the SQLite database used to store user accounts and
# settings. This default places the file in the same directory as this
# config file, but generates an absolute path for use througout the app.
SQLITE_PATH = os.path.join(
    os.path.realpath(os.path.expanduser('~/.pgadmin/')),
    'pgadmin4.db'
    )
# SQLITE_TIMEOUT will define how long to wait before throwing the error -
# OperationError due to database lock.
# (Default: 500 milliseconds)
SQLITE_TIMEOUT = 500

##########################################################################
# Server-side session storage path
#
# SESSION_DB_PATH (Default: $HOME/.pgadmin4/sessions)
##########################################################################
#
# We use SQLite for server-side session storage. There will be one
# SQLite database object per session created.
#
# Specify the path used to store your session objects.
#
# If the specified directory does not exist, the setup script will create
# it with permission mode 700 to keep the session database secure.
#
# On certain systems, you can use shared memory (tmpfs) for maximum
# scalability, for example, on Ubuntu:
#
# SESSION_DB_PATH = '/run/shm/pgAdmin4_session'
#
##########################################################################
SESSION_DB_PATH = os.path.join(
    os.path.realpath(os.path.expanduser('~/.pgadmin/')),
    'sessions'
    )

SESSION_COOKIE_NAME = 'pga4_session'

##########################################################################
# Mail server settings
##########################################################################

# These settings are used when running in web server mode for confirming
# and resetting passwords etc.
MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 465
MAIL_USE_SSL = True
MAIL_USERNAME = 'username'
MAIL_PASSWORD = 'SuperSecret'

##########################################################################
# Mail content settings
##########################################################################

# These settings define the content of password reset emails
SECURITY_EMAIL_SUBJECT_PASSWORD_RESET = "Password reset instructions for %s" \
        % APP_NAME
SECURITY_EMAIL_SUBJECT_PASSWORD_NOTICE = "Your %s password has been reset" \
        % APP_NAME
SECURITY_EMAIL_SUBJECT_PASSWORD_CHANGE_NOTICE = \
        "Your password for %s has been changed" % APP_NAME

##########################################################################
# Upgrade checks
##########################################################################

# Check for new versions of the application?
UPGRADE_CHECK_ENABLED = True

# Where should we get the data from?
UPGRADE_CHECK_URL = 'https://www.pgadmin.org/versions.json'

##########################################################################
# Storage Manager storage url config settings
# If user sets STORAGE_DIR to empty it will show all volumes if platform
# is Windows, '/' if it is Linux, Mac or any other unix type system.

# For example:
# 1. STORAGE_DIR = get_drive("C") or get_drive() # return C:/ by default
# where C can be any drive character such as "D", "E", "G" etc
# 2. Set path manually like
# STORAGE_DIR = "/path/to/directory/"
##########################################################################
STORAGE_DIR = os.path.join(
    os.path.realpath(os.path.expanduser('~/.pgadmin/')),
    'storage'
    )

##########################################################################
# Allows flask application to response to the each request asynchronously
##########################################################################
THREADED_MODE = True

##########################################################################
# Local config settings
##########################################################################

# Load local config overrides
try:
    from config_local import *
except ImportError:
    pass
