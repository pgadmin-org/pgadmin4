##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import traceback
import os
import json

from regression.python_test_utils import test_utils as utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/compound_trigger_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_compound_trigger(server, db_name, schema_name, table_name,
                            trigger_name):
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
    code = "var varchar2(20) := 'Global_var';\n\n BEFORE STATEMENT IS" \
           "\nBEGIN\n DBMS_OUTPUT.PUT_LINE('Before Statement: ' || var);" \
           "\n var := 'BEFORE STATEMENT';\nEND;\n\nBEFORE EACH ROW IS" \
           "\nBEGIN\n DBMS_OUTPUT.PUT_LINE('Before each row: ' || var);\n" \
           " var := 'BEFORE EACH ROW';\nEND;"

    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        query = "CREATE OR REPLACE TRIGGER %s FOR INSERT OR UPDATE ON %s.%s " \
                "COMPOUND TRIGGER %s END;" % (trigger_name, schema_name,
                                              table_name, code)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_trigger "
                          "where tgname='%s'" % trigger_name)
        trigger = pg_cursor.fetchone()
        trigger_id = ''
        if trigger:
            trigger_id = trigger[0]
        connection.close()
        return trigger_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def create_view(server, db_name, schema_name, sql_query, view_name):
    """
    This function creates a table under provided schema.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param sql_query: sql query to create view
    :type sql_query: str
    :param view_name: view name
    :type view_name: str
    :return view_id: view id
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
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        query = sql_query % (schema_name, view_name, schema_name, view_name,
                             server['username'])
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get 'oid' from newly created view
        pg_cursor.execute("select oid from pg_catalog.pg_class where "
                          "relname='%s'" % view_name)
        view = pg_cursor.fetchone()
        view_id = view[0]
        connection.close()
        return view_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_compound_trigger(server, db_name, trigger_name):
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


def enable_disable_compound_trigger(server, db_name, schema_name, table_name,
                                    trigger_name, is_enable):
    """
    This function is used to enable/disable trigger.
    :param server:
    :param db_name:
    :param schema_name:
    :param table_name:
    :param trigger_name:
    :param is_enable:
    :return:
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("BEGIN")
        if is_enable:
            query = "ALTER TABLE %s.%s ENABLE TRIGGER %s;" % (schema_name,
                                                              table_name,
                                                              trigger_name)
        else:
            query = "ALTER TABLE %s.%s DISABLE TRIGGER %s;" % (schema_name,
                                                               table_name,
                                                               trigger_name)

        pg_cursor.execute(query)
        pg_cursor.execute("COMMIT")
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
