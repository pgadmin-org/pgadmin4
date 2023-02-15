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
from urllib.parse import urlencode
from regression.python_test_utils import test_utils as utils

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/column_test_data.json") as data_file:
    test_cases = json.load(data_file)


# api method calls
def api_create(self):
    return self.tester.post("{0}{1}/{2}/{3}/{4}/{5}/".
                            format(self.url, utils.SERVER_GROUP,
                                   self.server_id, self.db_id,
                                   self.schema_id, self.table_id),
                            data=json.dumps(self.data),
                            content_type='html/json'
                            )


def api_delete(self, column_id=None):
    if column_id is None:
        column_id = self.column_id
    return self.tester.delete("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id,
                                     self.schema_id, self.table_id, column_id),
                              data=json.dumps(self.data),
                              follow_redirects=True
                              )


def api_get(self, column_id=None):
    if column_id is None:
        column_id = self.column_id
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id, self.schema_id,
                                  self.table_id, column_id),
                           data=json.dumps(self.data),
                           follow_redirects=True
                           )


def api_get_msql(self, url_encode_data):
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/{6}?{7}".
                           format(self.url, utils.SERVER_GROUP, self.server_id,
                                  self.db_id,
                                  self.schema_id, self.table_id,
                                  self.column_id,
                                  urlencode(url_encode_data)),
                           follow_redirects=True
                           )


def api_put(self):
    return self.tester.put("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                           format(self.url, utils.SERVER_GROUP, self.server_id,
                                  self.db_id, self.schema_id, self.table_id,
                                  self.column_id),
                           data=json.dumps(self.data),
                           follow_redirects=True)


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
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        query = "ALTER TABLE %s.%s ADD COLUMN %s %s" % \
                (schema_name, table_name, col_name, col_data_type)
        pg_cursor.execute(query)
        utils.set_isolation_level(connection, old_isolation_level)
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
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        query = "ALTER TABLE %s.%s ADD COLUMN %s %s " \
                "GENERATED ALWAYS AS IDENTITY" % \
                (schema_name, table_name, col_name, col_data_type)
        pg_cursor.execute(query)
        utils.set_isolation_level(connection, old_isolation_level)
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
