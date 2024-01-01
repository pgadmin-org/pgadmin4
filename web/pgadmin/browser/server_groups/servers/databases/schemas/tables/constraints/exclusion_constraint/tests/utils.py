##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import os
import traceback
import json

from regression.python_test_utils import test_utils as utils

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/exclusion_constraint_test_data.json") as data_file:
    test_cases = json.load(data_file)


# api call methods
def api_create(self):
    return self.tester.post("{0}{1}/{2}/{3}/{4}/{5}/".
                            format(self.url, utils.SERVER_GROUP,
                                   self.server_id, self.db_id,
                                   self.schema_id, self.table_id),
                            data=json.dumps(self.data),
                            content_type='html/json'
                            )


def api_delete(self, exclusion_constraint_id=None):
    if exclusion_constraint_id is None:
        exclusion_constraint_id = self.exclusion_constraint_id
    return self.tester.delete("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id,
                                     self.schema_id, self.table_id,
                                     exclusion_constraint_id),
                              data=json.dumps(self.data),
                              follow_redirects=True
                              )


def api_get(self, exclusion_constraint_id=None):
    if exclusion_constraint_id is None:
        exclusion_constraint_id = self.exclusion_constraint_id
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.table_id,
                                  exclusion_constraint_id),
                           follow_redirects=True
                           )


def api_get_msql(self, req_args):
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/{6}{7}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.table_id,
                                  self.exclusion_constraint_id,
                                  req_args),
                           follow_redirects=True
                           )


def api_put(self):
    return self.tester.put("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.table_id,
                                  self.exclusion_constraint_id),
                           data=json.dumps(self.data),
                           follow_redirects=True)


def create_exclusion_constraint(server, db_name, schema_name, table_name,
                                key_name):
    """
    This function creates a exclusion constraint under provided table.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :param key_name: test name for key
    :type key_name: str
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
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        query = "ALTER TABLE %s.%s ADD CONSTRAINT %s EXCLUDE USING btree(" \
                "id ASC NULLS FIRST WITH =)" % \
                (schema_name, table_name, key_name)
        pg_cursor.execute(query)
        utils.set_isolation_level(connection, old_isolation_level)
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


def verify_exclusion_constraint(server, db_name, index_name):
    """
    This function verifies index exist or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param index_name: index name
    :type index_name: str
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
        pg_cursor.execute("select * from pg_catalog.pg_class "
                          "where relname='%s'" % index_name)
        index_record = pg_cursor.fetchone()
        connection.close()
        return index_record
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
