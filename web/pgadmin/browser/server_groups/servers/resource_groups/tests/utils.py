##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import traceback

from regression.python_test_utils import test_utils as utils


def create_resource_groups(server, resource_group_name):
    """
    This function create the resource groups into databases.
    :param server: server details
    :type server: dict
    :param resource_group_name: resource group name
    :type resource_group_name: str
    :return resource_group_id: resource group id
    :rtype: int
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
        pg_cursor.execute("CREATE RESOURCE GROUP %s" % resource_group_name)
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        # Get oid of newly created resource group
        pg_cursor.execute("SELECT oid FROM edb_resource_group WHERE "
                          "rgrpname='%s'" % resource_group_name)
        resource_group = pg_cursor.fetchone()
        resource_group_id = resource_group[0]
        connection.close()
        return resource_group_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_resource_group(server, resource_group_name):
    """
    This function verifies the resource group exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param resource_group_name: resource group name
    :type resource_group_name: str
    :return:
    """
    try:
        connection = utils.get_db_connection(server['db'],
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * FROM edb_resource_group WHERE "
                          "rgrpname='%s'" % resource_group_name)
        resource_group = pg_cursor.fetchone()
        connection.close()
        return resource_group
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_resource_group(connection, resource_group_name):
    try:
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * FROM edb_resource_group WHERE"
                          " rgrpname='%s'" % resource_group_name)
        resource_group_name_count = len(pg_cursor.fetchall())
        if resource_group_name_count:
            old_isolation_level = connection.isolation_level
            utils.set_isolation_level(connection, 0)
            pg_cursor.execute("DELETE FROM edb_resource_group where "
                              "rgrpname='%s'" %
                              resource_group_name)
            utils.set_isolation_level(connection, old_isolation_level)
            connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)
