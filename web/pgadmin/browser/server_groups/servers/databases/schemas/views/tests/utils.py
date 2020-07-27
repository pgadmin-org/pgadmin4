##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import traceback

from regression.python_test_utils import test_utils as utils


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
        pg_cursor.execute("select oid from pg_class where relname='%s'" %
                          view_name)
        view = pg_cursor.fetchone()
        view_id = view[0]
        connection.close()
        return view_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_view(server, db_name, view_name):
    """
    This function verifies view exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param view_name: view name
    :type view_name: str
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
        pg_cursor.execute("select oid from pg_class where relname='%s'" %
                          view_name)
        view = pg_cursor.fetchone()
        connection.close()
        return view
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def get_view_id(server, db_name, view_name):
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        # Get 'oid' from newly created view
        pg_cursor.execute("select oid from pg_class where relname='%s'" %
                          view_name)
        view = pg_cursor.fetchone()
        view_id = None
        if view:
            view_id = view[0]
        connection.close()
        return view_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
