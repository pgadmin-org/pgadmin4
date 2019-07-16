##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
from flask import current_app


def _create_directory_if_not_exists(_path):
    if not os.path.exists(_path):
        os.mkdir(_path)


def create_app_data_directory(config):
    """
    Create the required directories (if not present).
    """
    # Create the directory containing the configuration file (if not present).
    _create_directory_if_not_exists(os.path.dirname(config.SQLITE_PATH))
    # Try to set the permissions on the directory, but don't complain
    # if we can't. This may be the case on a mounted directory, e.g. in
    # OpenShift. We'll still secure the config database anyway.
    if os.name != 'nt':
        try:
            os.chmod(os.path.dirname(config.SQLITE_PATH), 0o700)
        except Exception as e:
            # The flask app isn't setup yet, so we can't use the logger
            print('WARNING: Failed to set ACL on the directory containing the '
                  'configuration database: {}'.format(e))

    # Create the directory containing the log file (if not present).
    _create_directory_if_not_exists(os.path.dirname(config.LOG_FILE))

    # Create the session directory (if not present).
    _create_directory_if_not_exists(config.SESSION_DB_PATH)
    if os.name != 'nt':
        os.chmod(config.SESSION_DB_PATH, 0o700)

    # Create the storage directory (if not present).
    _create_directory_if_not_exists(config.STORAGE_DIR)
