##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Definition of constants for SQLEditor."""
from flask_babel import gettext

# Async Constants
ASYNC_OK = 1
ASYNC_READ_TIMEOUT = 2
ASYNC_WRITE_TIMEOUT = 3
ASYNC_NOT_CONNECTED = 4
ASYNC_EXECUTION_ABORTED = 5

# Transaction status constants
TX_STATUS_IDLE = 0
TX_STATUS__ACTIVE = 1
TX_STATUS_INTRANS = 2
TX_STATUS_INERROR = 3

# Connection status codes mapping
CONNECTION_STATUS_MESSAGE_MAPPING = dict({
    0: gettext('The session is idle and there is no current transaction.'),
    1: gettext('A command is currently in progress.'),
    2: gettext('The session is idle in a valid transaction block.'),
    3: gettext('The session is idle in a failed transaction block.'),
    4: gettext('The connection with the server is bad.')
})
