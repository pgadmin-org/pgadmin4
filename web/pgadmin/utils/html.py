##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

"""Utilities for HTML"""

import cgi
from pgadmin.utils import IS_PY2


def safe_str(x):
    try:
        x = x.encode('ascii', 'xmlcharrefreplace') if hasattr(x, 'encode') else x
        if not IS_PY2:
            x = x.decode('utf-8')
    except:
        pass
    return cgi.escape(x)
