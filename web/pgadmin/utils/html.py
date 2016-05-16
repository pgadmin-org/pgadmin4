##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

"""Utilities for HTML"""

import cgi


def safe_str(x):
    return cgi.escape(x).encode(
        'ascii', 'xmlcharrefreplace'
    ).decode()
