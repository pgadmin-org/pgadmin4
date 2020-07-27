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


def create_column(server, db_name, schema_name, table_name, col_name,
                  col_data_type='char'):
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
    :param col_name: column name
    :type col_name: str
    :param col_data_type: column data type
    :type col_data_type: str
    :return table_id: table id
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
        query = "ALTER TABLE %s.%s ADD COLUMN %s %s" % \
                (schema_name, table_name, col_name, col_data_type)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get column position of newly added column
        pg_cursor.execute("select attnum from pg_attribute where"
                          " attname='%s'" % col_name)
        col = pg_cursor.fetchone()
        col_pos = ''
        if col:
            col_pos = col[0]
        connection.close()
        return col_pos
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def create_identity_column(server, db_name, schema_name, table_name,
                           col_name, col_data_type='bigint'):
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
    :param col_name: column name
    :type col_name: str
    :param col_data_type: column data type
    :type col_data_type: str
    :return table_id: table id
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
        query = "ALTER TABLE %s.%s ADD COLUMN %s %s " \
                "GENERATED ALWAYS AS IDENTITY" % \
                (schema_name, table_name, col_name, col_data_type)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get column position of newly added column
        pg_cursor.execute("select attnum from pg_attribute where"
                          " attname='%s'" % col_name)
        col = pg_cursor.fetchone()
        col_pos = ''
        if col:
            col_pos = col[0]
        connection.close()
        return col_pos
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_column(server, db_name, col_name):
    """
    This function verifies table exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param col_name: column name
    :type col_name: str
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
        pg_cursor.execute("select * from pg_attribute where attname='%s'" %
                          col_name)
        col = pg_cursor.fetchone()
        connection.close()
        return col
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
