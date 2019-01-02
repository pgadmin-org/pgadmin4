##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys

root = os.path.dirname(os.path.realpath(__file__))
if sys.path[0] != root:
    sys.path.insert(0, root)

if sys.version_info[0] >= 3:
    import builtins
else:
    import __builtin__ as builtins

# Ensure the global server mode is set.
builtins.SERVER_MODE = True

import config

# When running it as a WSGI application, directory for the configuration file
# must present.
if not os.path.exists(os.path.dirname(config.SQLITE_PATH)):
    raise Exception(
        """
Required configuration file is not present!
Please run setup.py first!"""
    )

from pgAdmin4 import app as application
