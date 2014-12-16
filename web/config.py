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

# Application log level - one of:
#   CRITICAL	50
#   ERROR	40
#   WARNING	30
#   SQL		25
#   INFO	20
#   DEBUG       10
#   NOTSET	0
PGADMIN_LOG_LEVEL = DEBUG

# Log file name
PGADMIN_LOG_FILE = 'pgadmin4.log'

# Log format. See 
PGADMIN_LOG_FORMAT='%(asctime)s: %(levelname)s\t%(name)s:\t%(message)s'

# Load local config overrides
try:
    from config_local import *
except ImportError:
    pass
