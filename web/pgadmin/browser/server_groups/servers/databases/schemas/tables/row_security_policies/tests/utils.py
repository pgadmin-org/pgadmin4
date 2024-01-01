##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import os
import json
import traceback

from regression.python_test_utils import test_utils as utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/rls_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_policy(server, db_name, schema_name, table_name, policy_name):
    """
    This function creates a policy under provided table.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :param policy_name: policy name
    :type policy_name: str
    :return policy_id: policy id
    :rtype: int
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        query = "CREATE policy %s on %s.%s To public" % \
                (policy_name, schema_name, table_name)
        pg_cursor.execute(query)
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        # Get role oid of newly added policy
        pg_cursor.execute("select oid from pg_catalog.pg_policy where "
                          "polname='%s'" % policy_name)
        policy = pg_cursor.fetchone()
        policy_id = ''
        if policy:
            policy_id = policy[0]
        connection.close()
        return policy_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_policy(server, db_name, policy_name):
    """
    This function verifies policy exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param policy_name: policy name
    :type policy_name: str
    :return policy: policy record from database
    :rtype: tuple
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("select * from pg_catalog.pg_policy where "
                          "polname='%s'" % policy_name)
        policy = pg_cursor.fetchone()
        connection.close()
        return policy
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def delete_policy(server, db_name, policy_name, schema_name, table_name):
    """
    This function use to delete the existing roles in the servers

    :param db_name:  db_name
    :type db_name: db_name object
    :param server: server
    :type server: server object
    :param policy_name: policy name
    :type policy_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :return: None
    """

    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()

        pg_cursor.execute("select * from pg_catalog.pg_policy "
                          "where polname='%s'" % policy_name)
        policy_count = pg_cursor.fetchone()
        if policy_count:
            old_isolation_level = connection.isolation_level
            utils.set_isolation_level(connection, 0)
            pg_cursor = connection.cursor()
            query = "DROP policy %s on %s.%s" % \
                    (policy_name, schema_name, table_name)
            pg_cursor.execute(query)
            utils.set_isolation_level(connection, old_isolation_level)
            connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
