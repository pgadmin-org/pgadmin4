##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Application wide constants."""
from flask_babel import gettext

# Mimetypes
MIMETYPE_APP_HTML = 'text/html'
MIMETYPE_APP_JS = 'application/javascript'
MIMETYPE_APP_JSON = 'application/json'

# Preference labels
PREF_LABEL_KEYBOARD_SHORTCUTS = gettext('Keyboard shortcuts')
PREF_LABEL_DISPLAY = gettext('Display')
PREF_LABEL_BREADCRUMBS = gettext('Object Breadcrumbs')
PREF_LABEL_OPTIONS = gettext('Options')
PREF_LABEL_EXPLAIN = gettext('Explain')
PREF_LABEL_EDITOR = gettext('Editor')
PREF_LABEL_CSV_TXT = gettext('CSV/TXT Output')
PREF_LABEL_RESULTS_GRID = gettext('Results grid')
PREF_LABEL_SQL_FORMATTING = gettext('SQL formatting')
PREF_LABEL_TABS_SETTINGS = gettext('Tab settings')
PREF_LABEL_REFRESH_RATES = gettext('Refresh rates')
PREF_LABEL_GRAPH_VISUALISER = gettext('Graph Visualiser')
PREF_LABEL_USER_INTERFACE = gettext('User Interface')

PGADMIN_STRING_SEPARATOR = '_$PGADMIN$_'
PGADMIN_NODE = 'pgadmin.node.%s'
UNAUTH_REQ = "Unauthorized request."
SERVER_CONNECTION_CLOSED = gettext(
    'Not connected to server or connection with the server has been closed.')

# Query tool placeholder
QT_DEFAULT_PLACEHOLDER = '%DATABASE%/%USERNAME%@%SERVER%'
VW_EDT_DEFAULT_PLACEHOLDER = '%SCHEMA%.%TABLE%/%DATABASE%/%USERNAME%@%SERVER%'

# Data Types
DATATYPE_TIME_WITH_TIMEZONE = 'time with time zone'
DATATYPE_TIME_WITHOUT_TIMEZONE = 'time without time zone'

DATATYPE_TIMESTAMP_WITH_TIMEZONE = 'timestamp with time zone'
DATATYPE_TIMESTAMP_WITHOUT_TIMEZONE = 'timestamp without time zone'

# Error Messages
ERROR_MSG_TRANS_ID_NOT_FOUND = gettext(
    'Transaction ID not found in the session.')

ERROR_MSG_FAIL_TO_PROMOTE_QT = gettext('FAIL TO PROMOTE VIEW/EDIT DATA '
                                       'TO QUERY TOOL')

# Role module constant
ERROR_FETCHING_ROLE_INFORMATION = gettext(
    'Error fetching role information from the database server.')

ERROR_FETCHING_DATA = gettext('Unable to fetch data.')

ERROR_SERVER_ID_NOT_SPECIFIED = gettext('Server ID not specified.')

# Authentication Sources
INTERNAL = 'internal'
LDAP = 'ldap'
KERBEROS = 'kerberos'
OAUTH2 = 'oauth2'
WEBSERVER = 'webserver'

SUPPORTED_AUTH_SOURCES = [INTERNAL,
                          LDAP,
                          KERBEROS,
                          OAUTH2,
                          WEBSERVER]

BINARY_PATHS = {
    "as_bin_paths": [
        {"version": "130000", "next_major_version": "140000",
         "serverType": gettext("EDB Advanced Server 13"), "binaryPath": None,
         "isDefault": False},
        {"version": "140000", "next_major_version": "150000",
         "serverType": gettext("EDB Advanced Server 14"), "binaryPath": None,
         "isDefault": False},
        {"version": "150000", "next_major_version": "160000",
         "serverType": gettext("EDB Advanced Server 15"), "binaryPath": None,
         "isDefault": False},
        {"version": "160000", "next_major_version": "170000",
         "serverType": gettext("EDB Advanced Server 16"), "binaryPath": None,
         "isDefault": False},
        {"version": "170000", "next_major_version": "180000",
         "serverType": gettext("EDB Advanced Server 17"), "binaryPath": None,
         "isDefault": False}
    ],
    "pg_bin_paths": [
        {"version": "130000", "next_major_version": "140000",
         "serverType": gettext("PostgreSQL 13"), "binaryPath": None,
         "isDefault": False},
        {"version": "140000", "next_major_version": "150000",
         "serverType": gettext("PostgreSQL 14"), "binaryPath": None,
         "isDefault": False},
        {"version": "150000", "next_major_version": "160000",
         "serverType": gettext("PostgreSQL 15"), "binaryPath": None,
         "isDefault": False},
        {"version": "160000", "next_major_version": "170000",
         "serverType": gettext("PostgreSQL 16"), "binaryPath": None,
         "isDefault": False},
        {"version": "170000", "next_major_version": "180000",
         "serverType": gettext("PostgreSQL 17"), "binaryPath": None,
         "isDefault": False}
    ]
}

UTILITIES_ARRAY = ['pg_dump', 'pg_dumpall', 'pg_restore', 'psql']

ENTER_EMAIL_ADDRESS = "Email address: "
USER_NOT_FOUND = gettext("The specified user ID (%s) could not be found.")
DATABASE_LAST_SYSTEM_OID = 16383

# Drivers
PSYCOPG3 = 'psycopg3'

# Shared storage
MY_STORAGE = 'my_storage'
ACCESS_DENIED_MESSAGE = gettext(
    "Access denied: You’re having limited access. You’re not allowed to "
    "Rename, Delete or Create any files/folders")

KEY_RING_SERVICE_NAME = 'pgAdmin4'
KEY_RING_USER_NAME = 'pgadmin4-master-password'
KEY_RING_USERNAME_FORMAT = KEY_RING_SERVICE_NAME + '-{0}-{1}'
KEY_RING_TUNNEL_FORMAT = KEY_RING_SERVICE_NAME + '-tunnel-{0}-{1}'
KEY_RING_DESKTOP_USER = KEY_RING_SERVICE_NAME + '-desktop-user-{0}'


class MessageType:
    SUCCESS = 'Success',
    ERROR = 'Error',
    INFO = 'Info',
    CLOSE = 'Close',
    WARNING = 'Warning'


DBMS_JOB_SCHEDULER_ID = 999999

# String Constants
IP_ADDRESS_STRING = '{}/{}'
TWO_PARAM_STRING = '{0}/{1}'
SERVER_NOT_FOUND = gettext("Could not find the specified server.")
SSL_MODES = ['prefer', 'require', 'verify-ca', 'verify-full']

DATA_TYPE_WITH_LENGTH = [1560, 'bit', 1561, 'bit[]',
                         1562, 'varbit', 'bit varying',
                         1563, 'varbit[]', 'bit varying[]',
                         1042, 'bpchar', 'character',
                         1043, 'varchar', 'character varying',
                         1014, 'bpchar[]', 'character[]',
                         1015, 'varchar[]', 'character varying[]',
                         'vector', 'vector[]', 'halfvec', 'halfvec[]',
                         'sparsevec', 'sparsevec[]']
