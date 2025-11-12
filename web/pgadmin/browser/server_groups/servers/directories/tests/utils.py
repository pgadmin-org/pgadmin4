##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import traceback

from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.roles.tests import \
    utils as roles_utils


def create_directories(
    server,
    directory_name,
    directory_path,
):
    """
    This function create the directories into databases.
    """
    try:
        connection = utils.get_db_connection(server['db'],
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        sql = f"CREATE DIRECTORY {directory_name} AS '{directory_path}'"
        pg_cursor.execute(sql)
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        # Get oid of newly created directory.
        pg_cursor.execute("SELECT oid FROM pg_catalog.edb_dir WHERE "
                          " dirname='%s'" % directory_name)
        directory = pg_cursor.fetchone()
        directory_id = directory[0]
        connection.close()
        return directory_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_directory(server, directory_name):
    """
    This function verifies the directory exist in database or not.
    """
    try:
        connection = utils.get_db_connection(server['db'],
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * FROM pg_catalog.edb_dir WHERE "
                          " dirname='%s'" % directory_name)
        directory = pg_cursor.fetchone()
        connection.close()
        return directory
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_directories(connection, directory_name):
    """
    This function deletes the directory.
    """
    try:
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * FROM pg_catalog.edb_dir WHERE"
                          " dirname='%s'" % directory_name)
        directory_name_count = len(pg_cursor.fetchall())
        if directory_name_count:
            old_isolation_level = connection.isolation_level
            utils.set_isolation_level(connection, 0)
            pg_cursor.execute("DROP DIRECTORY IF EXISTS %s" % directory_name)
            utils.set_isolation_level(connection, old_isolation_level)
            connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_superuser_role(server, role_name):
    """
    This function create the role as superuser.
    """
    try:
        connection = utils.get_db_connection(server['db'],
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        sql = '''
            CREATE USER "%s" WITH
              SUPERUSER
            ''' % (role_name)
        pg_cursor.execute(sql)
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        # Get oid of newly created directory
        pg_cursor.execute("SELECT usename FROM pg_user WHERE "
                          " usename='%s'" % role_name)
        user_role = pg_cursor.fetchone()
        role_username = user_role[0]
        connection.close()
        return role_username
    except Exception:
        traceback.print_exc(file=sys.stderr)
