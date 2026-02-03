##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Utility functions for Statistics tests"""

import sys
import traceback
import os
import json

from regression.python_test_utils import test_utils
from urllib.parse import urlencode

# Load test data from JSON file
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/statistics_test_data.json") as data_file:
    test_cases = json.load(data_file)


# API call methods
def api_create(self):
    """Create a new statistics object via API"""
    return self.tester.post("{0}{1}/{2}/{3}/{4}/".
                            format(self.url, test_utils.SERVER_GROUP,
                                   self.server_id, self.db_id,
                                   self.schema_id),
                            data=json.dumps(self.data),
                            content_type='html/json')


def api_get(self, stid=None):
    """Get statistics object details via API"""
    if stid is None:
        stid = self.statistics_id
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}".
                           format(self.url, test_utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, stid),
                           follow_redirects=True)


def api_delete(self, stid=None):
    """Delete a statistics object via API"""
    if stid is None:
        stid = self.statistics_id
    return self.tester.delete("{0}{1}/{2}/{3}/{4}/{5}".
                              format(self.url, test_utils.SERVER_GROUP,
                                     self.server_id, self.db_id,
                                     self.schema_id, stid),
                              data=json.dumps(self.data),
                              follow_redirects=True)


def api_put(self):
    """Update a statistics object via API"""
    return self.tester.put("{0}{1}/{2}/{3}/{4}/{5}".
                           format(self.url, test_utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.statistics_id),
                           data=json.dumps(self.data),
                           follow_redirects=True)


def api_get_msql(self, url_encode_data):
    """Get modified SQL via API"""
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}?{6}".
                           format(self.url, test_utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.statistics_id,
                                  urlencode(url_encode_data)),
                           follow_redirects=True)


def create_table_for_statistics(server, db_name, schema_name, table_name):
    """
    This function creates a table with multiple columns for statistics testing.

    Args:
        server: server details
        db_name: database name
        schema_name: schema name
        table_name: table name

    Returns:
        table OID
    """
    try:
        connection = test_utils.get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        test_utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()

        # Create a table with multiple columns for statistics testing
        query = f"CREATE TABLE {schema_name}.{table_name} " \
            f"(col1 INTEGER, col2 INTEGER, col3 TEXT)"
        pg_cursor.execute(query)

        # Insert some test data
        insert_query = f"INSERT INTO {schema_name}.{table_name} VALUES " \
            f"(1, 10, 'test1'), (2, 20, 'test2'), (3, 30, 'test3')"
        pg_cursor.execute(insert_query)

        test_utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()

        # Get OID
        pg_cursor.execute(
            f"SELECT oid FROM pg_catalog.pg_class "
            f"WHERE relname = '{table_name}' "
            f"AND relnamespace = (SELECT oid FROM pg_catalog.pg_namespace "
            f"WHERE nspname = '{schema_name}')"
        )
        table = pg_cursor.fetchone()
        table_oid = table[0] if table else None
        connection.close()

        return table_oid
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def create_statistics(server, db_name, schema_name, table_name,
                      statistics_name, columns, stat_types):
    """
    This function creates a statistics object in the database.

    Args:
        server: server details
        db_name: database name
        schema_name: schema name
        table_name: table name
        statistics_name: statistics object name
        columns: list of column names
        stat_types: list of statistics types (ndistinct, dependencies, mcv)

    Returns:
        statistics OID
    """
    try:
        connection = test_utils.get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        test_utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()

        # Create statistics
        stat_types_str = ', '.join(stat_types)
        columns_str = ', '.join(columns)
        query = f"CREATE STATISTICS {schema_name}.{statistics_name} " \
            f"({stat_types_str}) ON {columns_str} " \
            f"FROM {schema_name}.{table_name}"
        pg_cursor.execute(query)

        # Get OID
        pg_cursor.execute(
            f"SELECT s.oid FROM pg_catalog.pg_statistic_ext s "
            f"JOIN pg_catalog.pg_namespace n ON s.stxnamespace = n.oid "
            f"WHERE s.stxname = '{statistics_name}' "
            f"AND n.nspname = '{schema_name}'"
        )
        statistics = pg_cursor.fetchone()
        statistics_oid = statistics[0]
        test_utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        connection.close()

        return statistics_oid
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_statistics(server, db_name, statistics_name):
    """
    This function verifies that a statistics object exists in the database.

    Args:
        server: server details
        db_name: database name
        statistics_name: statistics object name

    Returns:
        statistics details (oid, name)
    """
    try:
        connection = test_utils.get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            f"SELECT s.oid, s.stxname FROM pg_catalog.pg_statistic_ext s "
            f"WHERE s.stxname = '{statistics_name}'"
        )
        statistics = pg_cursor.fetchone()
        connection.close()
        return statistics
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def get_statistics_id(server, db_name, statistics_name):
    """
    This function retrieves the OID of a statistics object.

    Args:
        server: server details
        db_name: database name
        statistics_name: statistics object name

    Returns:
        statistics OID or None
    """
    try:
        connection = test_utils.get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            f"SELECT s.oid FROM pg_catalog.pg_statistic_ext s "
            f"WHERE s.stxname = '{statistics_name}'"
        )
        statistics = pg_cursor.fetchone()
        statistics_id = statistics[0] if statistics else None
        connection.close()
        return statistics_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def delete_statistics(server, db_name, schema_name, statistics_name):
    """
    This function deletes a statistics object from the database.

    Args:
        server: server details
        db_name: database name
        schema_name: schema name
        statistics_name: statistics object name

    Returns:
        None
    """
    try:
        connection = test_utils.get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        test_utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()

        query = f"DROP STATISTICS IF EXISTS {schema_name}.{statistics_name}"
        pg_cursor.execute(query)

        test_utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def get_statistics_columns(server, db_name, statistics_oid):
    """
    This function retrieves the columns for a statistics object.

    Args:
        server: server details
        db_name: database name
        statistics_oid: statistics object OID

    Returns:
        list of column names
    """
    try:
        connection = test_utils.get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            f"SELECT array_agg(a.attname) FROM pg_catalog.pg_attribute a "
            f"JOIN pg_catalog.pg_statistic_ext s ON a.attrelid = s.stxrelid "
            f"WHERE s.oid = {statistics_oid} "
            f"AND a.attnum = ANY(s.stxkeys)"
        )
        columns = pg_cursor.fetchone()
        connection.close()
        return columns[0] if columns else []
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
