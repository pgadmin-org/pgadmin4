##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import re


def normalize_database_uri(uri):
    """
    Rewrite a bare postgres(ql):// URI to use the psycopg3 driver scheme
    postgresql+psycopg://.  URIs that already carry a driver specifier
    (e.g. postgresql+psycopg://) are returned unchanged.
    """
    return re.sub(r"^postgres(?:ql)?://",
                  "postgresql+psycopg://", uri, count=1)
