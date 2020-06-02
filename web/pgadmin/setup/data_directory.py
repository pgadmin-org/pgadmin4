##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import getpass


def _create_directory_if_not_exists(_path):
    if _path and not os.path.exists(_path):
        os.mkdir(_path)


def create_app_data_directory(config):
    """
    Create the required directories (if not present).
    """
    # Create the directory containing the configuration file (if not present).
    try:
        _create_directory_if_not_exists(os.path.dirname(config.SQLITE_PATH))
    except PermissionError as e:
        print("ERROR  : Failed to create the directory {}:\n           {}".
              format(os.path.dirname(config.SQLITE_PATH), e))
        print(
            "HINT :   Create the directory {}, ensure it is writeable by\n"
            "         '{}', and try again, or, create a config_local.py file\n"
            "         and override the SQLITE_PATH setting per\n"
            "         https://www.pgadmin.org/docs/pgadmin4/{}/config_py.html".
            format(
                os.path.dirname(config.SQLITE_PATH),
                getpass.getuser(),
                config.APP_VERSION))
        exit(1)

    # Try to set the permissions on the directory, but don't complain
    # if we can't. This may be the case on a mounted directory, e.g. in
    # OpenShift. We'll still secure the config database anyway.
    if os.name != 'nt':
        try:
            os.chmod(os.path.dirname(config.SQLITE_PATH), 0o700)
        except Exception as e:
            # The flask app isn't setup yet, so we can't use the logger
            print('WARNING: Failed to set ACL on the directory containing the '
                  'configuration database:\n           {}'.format(e))
            print("HINT   : You may need to manually set the permissions on\n"
                  "         {} to allow {} to write to it.".
                  format(os.path.dirname(config.SQLITE_PATH),
                         getpass.getuser()))

    # Create the directory containing the log file (if not present).
    try:
        _create_directory_if_not_exists(os.path.dirname(config.LOG_FILE))
    except PermissionError as e:
        print("ERROR  : Failed to create the directory {}:\n           {}".
              format(os.path.dirname(config.LOG_FILE), e))
        print(
            "HINT   : Create the directory {}, ensure it is writeable by\n"
            "         '{}', and try again, or, create a config_local.py file\n"
            "         and override the LOG_FILE setting per\n"
            "         https://www.pgadmin.org/docs/pgadmin4/{}/config_py.html".
            format(
                os.path.dirname(config.LOG_FILE),
                getpass.getuser(),
                config.APP_VERSION))
        exit(1)

    # Create the session directory (if not present).
    try:
        _create_directory_if_not_exists(config.SESSION_DB_PATH)
    except PermissionError as e:
        print("ERROR  : Failed to create the directory {}:\n           {}".
              format(config.SESSION_DB_PATH, e))
        print(
            "HINT   : Create the directory {}, ensure it is writeable by\n"
            "         '{}', and try again, or, create a config_local.py file\n"
            "         and override the SESSION_DB_PATH setting per\n"
            "         https://www.pgadmin.org/docs/pgadmin4/{}/config_py.html".
            format(
                config.SESSION_DB_PATH,
                getpass.getuser(),
                config.APP_VERSION))
        exit(1)

    if os.name != 'nt':
        os.chmod(config.SESSION_DB_PATH, 0o700)

    # Create the storage directory (if not present).
    try:
        _create_directory_if_not_exists(config.STORAGE_DIR)
    except PermissionError as e:
        print("ERROR  : Failed to create the directory {}\n           {}:".
              format(config.STORAGE_DIR, e))
        print(
            "HINT   : Create the directory {}, ensure it is writable by\n"
            "         '{}', and try again, or, create a config_local.py file\n"
            "         and override the STORAGE_DIR setting per\n"
            "         https://www.pgadmin.org/docs/pgadmin4/{}/config_py.html".
            format(
                config.STORAGE_DIR,
                getpass.getuser(),
                config.APP_VERSION))
        exit(1)
