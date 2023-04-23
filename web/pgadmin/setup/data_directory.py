##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys
import getpass
from pgadmin.utils.constants import KERBEROS

FAILED_CREATE_DIR = \
    "ERROR  : Failed to create the directory {}:\n           {}"


def _create_directory_if_not_exists(_path):
    if _path and not os.path.exists(_path):
        os.mkdir(_path)
        return True

    return False


def create_app_data_directory(config):
    """
    Create the required directories (if not present).
    """
    # Create the directory containing the configuration file (if not present).
    is_directory_created = False
    try:
        is_directory_created = _create_directory_if_not_exists(
            os.path.dirname(config.SQLITE_PATH))
    except PermissionError as e:
        print(FAILED_CREATE_DIR.format(os.path.dirname(config.SQLITE_PATH), e))
        print(
            "HINT :   Create the directory {}, ensure it is writeable by\n"
            "         '{}', and try again, or, create a config_local.py file\n"
            "         and override the SQLITE_PATH setting per\n"
            "         https://www.pgadmin.org/docs/pgadmin4/{}/config_py.html".
            format(
                os.path.dirname(config.SQLITE_PATH),
                getpass.getuser(),
                config.APP_VERSION))
        sys.exit(1)

    # Try to set the permissions on the directory, but don't complain
    # if we can't. This may be the case on a mounted directory, e.g. in
    # OpenShift. We'll still secure the config database anyway.
    if os.name != 'nt' and is_directory_created:
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
        print(FAILED_CREATE_DIR.format(os.path.dirname(config.LOG_FILE), e))
        print(
            "HINT   : Create the directory {}, ensure it is writeable by\n"
            "         '{}', and try again, or, create a config_local.py file\n"
            "         and override the LOG_FILE setting per\n"
            "         https://www.pgadmin.org/docs/pgadmin4/{}/config_py.html".
            format(
                os.path.dirname(config.LOG_FILE),
                getpass.getuser(),
                config.APP_VERSION))
        sys.exit(1)

    # Create the session directory (if not present).
    try:
        is_directory_created = \
            _create_directory_if_not_exists(config.SESSION_DB_PATH)
    except PermissionError as e:
        print(FAILED_CREATE_DIR.format(config.SESSION_DB_PATH, e))
        print(
            "HINT   : Create the directory {}, ensure it is writeable by\n"
            "         '{}', and try again, or, create a config_local.py file\n"
            "         and override the SESSION_DB_PATH setting per\n"
            "         https://www.pgadmin.org/docs/pgadmin4/{}/config_py.html".
            format(
                config.SESSION_DB_PATH,
                getpass.getuser(),
                config.APP_VERSION))
        sys.exit(1)

    if os.name != 'nt' and is_directory_created:
        os.chmod(config.SESSION_DB_PATH, 0o700)

    # Create the storage directory (if not present).
    try:
        _create_directory_if_not_exists(config.STORAGE_DIR)
    except PermissionError as e:
        print(FAILED_CREATE_DIR.format(config.STORAGE_DIR, e))
        print(
            "HINT   : Create the directory {}, ensure it is writable by\n"
            "         '{}', and try again, or, create a config_local.py file\n"
            "         and override the STORAGE_DIR setting per\n"
            "         https://www.pgadmin.org/docs/pgadmin4/{}/config_py.html".
            format(
                config.STORAGE_DIR,
                getpass.getuser(),
                config.APP_VERSION))
        sys.exit(1)

    # Create Azure Credential Cache directory (if not present).
    try:
        _create_directory_if_not_exists(config.AZURE_CREDENTIAL_CACHE_DIR)
    except PermissionError as e:
        print(FAILED_CREATE_DIR.format(config.AZURE_CREDENTIAL_CACHE_DIR, e))
        print(
            "HINT   : Create the directory {}, ensure it is writable by\n"
            "'{}', and try again, or, create a config_local.py file\n"
            " and override the AZURE_CREDENTIAL_CACHE_DIR setting per\n"
            " https://www.pgadmin.org/docs/pgadmin4/{}/config_py.html".
            format(
                config.AZURE_CREDENTIAL_CACHE_DIR,
                getpass.getuser(),
                config.APP_VERSION))
        sys.exit(1)

    # Create Kerberos Credential Cache directory (if not present).
    if config.SERVER_MODE and KERBEROS in config.AUTHENTICATION_SOURCES:
        try:
            _create_directory_if_not_exists(config.KERBEROS_CCACHE_DIR)
        except PermissionError as e:
            print(FAILED_CREATE_DIR.format(config.KERBEROS_CCACHE_DIR, e))
            print(
                "HINT   : Create the directory {}, ensure it is writable by\n"
                "'{}', and try again, or, create a config_local.py file\n"
                " and override the KERBEROS_CCACHE_DIR setting per\n"
                " https://www.pgadmin.org/docs/pgadmin4/{}/config_py.html".
                format(
                    config.KERBEROS_CCACHE_DIR,
                    getpass.getuser(),
                    config.APP_VERSION))
            sys.exit(1)
