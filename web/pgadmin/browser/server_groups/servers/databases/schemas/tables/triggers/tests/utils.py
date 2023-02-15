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
import os
import json

from regression.python_test_utils import test_utils as utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/triggers_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_trigger(server, db_name, schema_name, table_name, trigger_name,
                   trigger_func_name):
    """
    This function creates a column under provided table.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :param trigger_name: trigger name
    :type trigger_name: str
    :param trigger_func_name: trigger function name
    :type trigger_func_name: str
    :return trigger_id: trigger id
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
        query = "CREATE TRIGGER %s BEFORE INSERT ON %s.%s FOR EACH ROW " \
                "EXECUTE PROCEDURE %s.%s()" % (trigger_name, schema_name,
                                               table_name, schema_name,
                                               trigger_func_name)
        pg_cursor.execute(query)
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_trigger "
                          "where tgname='%s'" % trigger_name)
        trigger = pg_cursor.fetchone()
        trigger_id = ''
        if trigger:
            trigger_id = trigger[0]
        connection.close()
        return trigger_id
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_trigger(server, db_name, trigger_name):
    """
    This function verifies table exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param trigger_name: column name
    :type trigger_name: str
    :return table: table record from database
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
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_trigger "
                          "where tgname='%s'" % trigger_name)
        trigger = pg_cursor.fetchone()
        connection.close()
        return trigger
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
