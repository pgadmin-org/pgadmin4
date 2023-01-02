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
from urllib.parse import urlencode

from regression.python_test_utils import test_utils as utils
import os
import json

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/index_constraint_test_data.json") as data_file:
    test_cases = json.load(data_file)


# api method call
def api_create(self):
    return self.tester.post("{0}{1}/{2}/{3}/{4}/{5}/".
                            format(self.url, utils.SERVER_GROUP,
                                   self.server_id, self.db_id,
                                   self.schema_id, self.table_id),
                            data=json.dumps(self.data),
                            content_type='html/json'
                            )


def api_delete(self, index_constraint_id=None):
    if index_constraint_id is None:
        index_constraint_id = self.index_constraint_id
    return self.tester.delete("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id,
                                     self.schema_id,
                                     self.table_id,
                                     index_constraint_id),
                              data=json.dumps(self.data),
                              follow_redirects=True
                              )


def api_get(self, index_constraint_id=None):
    if index_constraint_id is None:
        index_constraint_id = self.index_constraint_id
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id,
                                  self.table_id,
                                  index_constraint_id),
                           data=json.dumps(self.data),
                           follow_redirects=True
                           )


def api_get_msql(self, url_encode_data):
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/{6}?{7}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id,
                                  self.table_id,
                                  self.index_constraint_id,
                                  urlencode(url_encode_data)),
                           data=json.dumps(self.data),
                           follow_redirects=True
                           )


def api_put(self):
    return self.tester.put("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.table_id,
                                  self.index_constraint_id
                                  ), data=json.dumps(self.data),
                           follow_redirects=True
                           )


def create_index_constraint(server, db_name, schema_name, table_name,
                            key_name, key_type):
    """
    This function creates a index constraint(PK or UK) under provided table.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :param key_name: test name for primary or unique key
    :type key_name: str
    :param key_type: key type i.e. primary or unique key
    :type key_type: str
    :return oid: key constraint id
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
        query = "ALTER TABLE %s.%s ADD CONSTRAINT %s %s (id)" % \
                (schema_name, table_name, key_name, key_type)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get oid of newly added index constraint
        pg_cursor.execute("SELECT conindid FROM pg_catalog.pg_constraint "
                          "where conname='%s'" % key_name)
        index_constraint = pg_cursor.fetchone()
        connection.close()
        oid = index_constraint[0]
        return oid
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_index_constraint(server, db_name, constraint_name):
    """
    This function verifies that index constraint(PK or UK) is exists or not.
    :param constraint_name:
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :return index_constraint: index constraint record from database
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
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_constraint "
                          "where conname='%s'" % constraint_name)
        index_constraint = pg_cursor.fetchone()
        connection.close()
        return index_constraint
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_unique_index(server, db_name, schema_name, table_name,
                        index_name, column_name):
    """
    This function creates a unique index for provided table.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :param index_name: index name
    :type index_name: str
    :param column_name: column on which index to be created
    :type column_name: str
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
        query = "CREATE UNIQUE INDEX CONCURRENTLY %s ON %s.%s (%s)" % \
                (index_name, schema_name, table_name, column_name)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)
