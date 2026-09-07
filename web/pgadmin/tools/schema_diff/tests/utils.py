##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
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
    :return: (status, schema oid, error message when it failed)
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
        # Replace hardcoded 'postgres' role with the actual test user
        # so the restore works on systems without a 'postgres' role.
        # Use qtIdent to properly quote usernames with special chars.
        import re
        from pgadmin.utils.driver.psycopg3 import Driver
        username = Driver.qtIdent(None, server['username'])
        sql = re.sub(r'\bOWNER [Tt][Oo] postgres\b',
                     'OWNER TO ' + username, sql)
        sql = re.sub(r'\bTO postgres\b', 'TO ' + username, sql)
        sql = re.sub(r'\bFROM postgres\b', 'FROM ' + username, sql)
        sql = re.sub(r'\bFOR postgres\b', 'FOR ' + username, sql)
        sql = sql.replace('Owner: postgres',
                          'Owner: ' + server['username'])
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
        return False, schema_id, str(e)

    return True, schema_id, None


def apply_sql_chunks(server, db_name, chunks):
    """
    Apply each object's SQL in turn against the given database, retrying
    whatever fails until a pass makes no further progress, and report what
    is left over.

    Retrying is what separates SQL that is simply wrong from SQL that only
    failed because Schema Diff wrote it before something it depends on
    (#10295): the former never applies however many passes it is given.

    :param server: server details
    :param db_name: database to apply the SQL to
    :param chunks: list of (label, sql) pairs, in the generated order
    :return: (labels applied, [(label, sql, error)] that never applied)
    """
    connection = utils.get_db_connection(db_name,
                                         server['username'],
                                         server['db_password'],
                                         server['host'],
                                         server['port'],
                                         server['sslmode']
                                         )
    utils.set_isolation_level(connection, 0)
    connection.autocommit = True

    applied = []
    pending = list(chunks)

    while pending:
        failed = []
        for label, sql in pending:
            pg_cursor = None
            try:
                pg_cursor = connection.cursor()
                pg_cursor.execute(sql)
                applied.append(label)
            except Exception as e:
                failed.append((label, sql, str(e)))
            finally:
                # A statement that failed is retried on the next pass, so
                # leaving its cursor open would accumulate one per attempt
                # for the length of the run.
                if pg_cursor is not None:
                    pg_cursor.close()

        if len(failed) == len(pending):
            connection.close()
            return applied, failed

        pending = [(label, sql) for label, sql, _ in failed]

    connection.close()
    return applied, []


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
