# -*- coding: utf-8 -*-

##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
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
APP_MAJOR = 1
APP_MINOR = 0
APP_REVISION = 0

# Application version suffix, e.g. 'beta1', 'dev'. Usually an empty string
# for GA releases.
APP_SUFFIX = 'dev'

# Copyright string for display in the app
APP_COPYRIGHT = 'Copyright 2014 - 2015, The pgAdmin Development Team'

# Path to the online help. 
HELP_PATH = '../../../docs/en_US/_build/html/'

# Languages we support in the UI
LANGUAGES = {
    'en': 'English',
    'fr': 'Français'
}

# DO NOT CHANGE!
# The application version string, constructed from the components
APP_VERSION = '%s.%s.%s-%s' % (APP_MAJOR, APP_MINOR, APP_REVISION, APP_SUFFIX)

# DO NOT CHANGE UNLESS YOU KNOW WHAT YOU ARE DOING!
# List of modules to skip when dynamically loading
MODULE_BLACKLIST = [ 'test' ]

# DO NOT CHANGE UNLESS YOU KNOW WHAT YOU ARE DOING!
# List of treeview browser nodes to skip when dynamically loading
NODE_BLACKLIST = [ ]

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

# The server mode determines whether or not we're running on a web server
# requiring user authentication, or desktop mode which uses an automatic
# default login.
#
# DO NOT DISABLE SERVER MODE IF RUNNING ON A WEBSERVER!!
SERVER_MODE = True

# User ID (email address) to use for the default user in desktop mode.
# The default should be fine here, as it's not exposed in the app.
DESKTOP_USER = 'pgadmin4@pgadmin.org'

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
MINIFY_HTML = True;

##########################################################################
# User account and settings storage
##########################################################################

# The schema version number for the configuration database
# DO NOT CHANGE UNLESS YOU ARE A PGADMIN DEVELOPER!!
SETTINGS_SCHEMA_VERSION = 3

# The default path to the SQLite database used to store user accounts and
# settings. This default places the file in the same directory as this
# config file, but generates an absolute path for use througout the app.
SQLITE_PATH = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'pgadmin4.db')

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
SECURITY_EMAIL_SUBJECT_PASSWORD_RESET = "Password reset instructions for %s" % APP_NAME
SECURITY_EMAIL_SUBJECT_PASSWORD_NOTICE = "Your %s password has been reset" % APP_NAME
SECURITY_EMAIL_SUBJECT_PASSWORD_CHANGE_NOTICE = "Your password for %s has been changed" % APP_NAME

##########################################################################
# Local config settings
##########################################################################

# Load local config overrides
try:
    from config_local import *
except ImportError:
    pass
