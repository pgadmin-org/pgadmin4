##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Application wide constants."""
from flask_babelex import gettext

# Mimetypes
MIMETYPE_APP_HTML = 'text/html'
MIMETYPE_APP_JS = 'application/javascript'


# Preference labels
PREF_LABEL_KEYBOARD_SHORTCUTS = gettext('Keyboard shortcuts')
PREF_LABEL_DISPLAY = gettext('Display')
PREF_LABEL_OPTIONS = gettext('Options')
PREF_LABEL_EXPLAIN = gettext('Explain')
PREF_LABEL_EDITOR = gettext('Editor')
PREF_LABEL_CSV_TXT = gettext('CSV/TXT Output')
PREF_LABEL_RESULTS_GRID = gettext('Results grid')
PREF_LABEL_SQL_FORMATTING = gettext('SQL formatting')
PREF_LABEL_TABS_SETTINGS = gettext('Tab settings')

PGADMIN_NODE = 'pgadmin.node.%s'
UNAUTH_REQ = "Unauthorized request."
SERVER_CONNECTION_CLOSED = gettext(
    'Not connected to server or connection with the server has been closed.')

# Data Types
DATATYPE_TIME_WITH_TIMEZONE = 'time with time zone'
DATATYPE_TIME_WITHOUT_TIMEZONE = 'time without time zone'

DATATYPE_TIMESTAMP_WITH_TIMEZONE = 'timestamp with time zone'
DATATYPE_TIMESTAMP_WITHOUT_TIMEZONE = 'timestamp without time zone'

# Error Messages
ERROR_MSG_TRANS_ID_NOT_FOUND = gettext(
    'Transaction ID not found in the session.')

# Role module constant
ERROR_FETCHING_ROLE_INFORMATION = gettext(
    'Error fetching role information from the database server.')

ERROR_FETCHING_DATA = gettext('Unable to fetch data.')

# Authentication Sources
INTERNAL = 'internal'
LDAP = 'ldap'
KERBEROS = 'kerberos'

SUPPORTED_AUTH_SOURCES = [INTERNAL,
                          LDAP,
                          KERBEROS]
