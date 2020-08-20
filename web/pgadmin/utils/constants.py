##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
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

PGADMIN_NODE = 'pgadmin.node.%s'
UNAUTH_REQ = "Unauthorized request."
