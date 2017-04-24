##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os


def _create_directory_if_not_exists(_path):
    if not os.path.exists(_path):
        os.mkdir(_path)


def create_app_data_directory(config):
    """
    Create the required directories (if not present).
    """
    # Create the directory containing the configuration file (if not present).
    _create_directory_if_not_exists(os.path.dirname(config.SQLITE_PATH))

    # Create the directory containing the log file (if not present).
    _create_directory_if_not_exists(os.path.dirname(config.LOG_FILE))

    # Create the session directory (if not present).
    _create_directory_if_not_exists(config.SESSION_DB_PATH)

    # Create the storage directory (if not present).
    _create_directory_if_not_exists(config.STORAGE_DIR)
