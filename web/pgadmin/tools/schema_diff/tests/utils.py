##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import traceback

from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils


def restore_schema(server, db_name, schema_name, sql_path):
    """
    This function is used to restore the schema.
    :param server:
    :param db_name:
    :param schema_name:
    :param sql_path:
    :return:
    """
    schema_id = None
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode']
                                             )

        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()

        with open(sql_path, 'r') as content_file:
            sql = content_file.read()
        pg_cursor.execute(sql)
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()

        SQL = """SELECT
        nsp.oid
    FROM
        pg_catalog.pg_namespace nsp
        WHERE nsp.nspname = '{0}'""".format(schema_name)

        pg_cursor.execute(SQL)
        schema = pg_cursor.fetchone()
        if schema:
            schema_id = schema[0]
        connection.close()
    except Exception as e:
        print(str(e))
        return False, schema_id

    return True, schema_id


def create_schema(server, db_name, schema_name):
    connection = utils.get_db_connection(db_name,
                                         server['username'],
                                         server['db_password'],
                                         server['host'],
                                         server['port'],
                                         server['sslmode']
                                         )
    return schema_utils.create_schema(connection, schema_name)


def create_table(server, db_name, schema_id, table_name, query):
    """
    This function creates a table under provided schema.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_id: schema oid
    :type schema_name: int
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
                                             server['port'],
                                             server['sslmode'])
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(query)
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        # Get 'oid' from newly created table
        pg_cursor.execute("SELECT oid "
                          "FROM pg_catalog.pg_class WHERE relname='{0}'"
                          " AND relnamespace = {1}".format(table_name,
                                                           schema_id))
        table = pg_cursor.fetchone()
        table_id = ''
        if table:
            table_id = table[0]
        connection.close()
        return table_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
