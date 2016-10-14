# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################
from __future__ import print_function
import traceback
import sys

from regression import test_utils as utils


def create_table(server, db_name, schema_name, table_name):
    """
    This function creates a table under provided schema.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :return table_id: table id
    :rtype: int
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        query = "CREATE TABLE %s.%s(id serial UNIQUE NOT NULL, name text," \
                " location text)" %\
                (schema_name, table_name)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get 'oid' from newly created table
        pg_cursor.execute("select oid from pg_class where relname='%s'" %
                          table_name)
        table = pg_cursor.fetchone()
        table_id = ''
        if table:
            table_id = table[0]
        connection.close()
        return table_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_table(server, db_name, table_id):
    """
    This function verifies table exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param table_id: schema name
    :type table_id: int
    :return table: table record from database
    :rtype: tuple
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * FROM pg_class tb WHERE tb.oid=%s" %
                          table_id)
        table = pg_cursor.fetchone()
        connection.close()
        return table
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
