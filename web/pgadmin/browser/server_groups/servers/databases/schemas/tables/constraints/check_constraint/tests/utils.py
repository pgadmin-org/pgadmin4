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
from urllib.parse import urlencode

from regression.python_test_utils import test_utils as utils

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/check_constraint_test_data.json") as data_file:
    test_cases = json.load(data_file)


# api call methods
def api_create(self):
    return self.tester.post("{0}{1}/{2}/{3}/{4}/{5}/".
                            format(self.url, utils.SERVER_GROUP,
                                   self.server_id, self.db_id,
                                   self.schema_id,
                                   self.table_id),
                            data=json.dumps(self.data),
                            content_type='html/json'
                            )


def api_delete(self, check_constraint_id=None):
    if check_constraint_id is None:
        check_constraint_id = self.check_constraint_id
    return self.tester.delete("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id,
                                     self.schema_id,
                                     self.table_id,
                                     check_constraint_id),
                              data=json.dumps(self.data),
                              follow_redirects=True
                              )


def api_get(self, check_constraint_id=None):
    if check_constraint_id is None:
        check_constraint_id = self.check_constraint_id
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.table_id,
                                  check_constraint_id),
                           follow_redirects=True
                           )


def api_put(self):
    return self.tester.put("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.table_id,
                                  self.check_constraint_id),
                           data=json.dumps(self.data),
                           follow_redirects=True
                           )


def api_get_msql(self, url_encode_data):
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/{6}?{7}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.table_id,
                                  self.check_constraint_id,
                                  urlencode(url_encode_data)),
                           follow_redirects=True
                           )


def create_check_constraint(server, db_name, schema_name, table_name,
                            check_constraint_name, query_val=None):
    """
    This function creates a check constraint under provided table.
    :param query_val: if you want to have different query
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :param check_constraint_name: constraint name
    :type check_constraint_name: str
    :return chk_constraint_id: check constraint id
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
        if query_val is None:
            query = "ALTER TABLE %s.%s ADD CONSTRAINT %s CHECK ( (id > 0)) " \
                    "NOT VALID; COMMENT ON CONSTRAINT %s ON %s.%s IS " \
                    "'this is test comment'" % (schema_name, table_name,
                                                check_constraint_name,
                                                check_constraint_name,
                                                schema_name, table_name)
        else:
            query = eval(query_val)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get oid of newly added check constraint
        pg_cursor.execute(
            "SELECT oid FROM pg_catalog.pg_constraint where conname='%s'" %
            check_constraint_name)
        chk_constraint_record = pg_cursor.fetchone()
        connection.close()
        chk_constraint_id = chk_constraint_record[0]
        return chk_constraint_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_check_constraint(server, db_name, check_constraint_name):
    """
    This function verifies check constraint constraint exist or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param check_constraint_name: constraint name
    :type check_constraint_name: str
    :return chk_constraint_record: check constraint record from database
    :rtype: tuple
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT oid FROM pg_catalog.pg_constraint where conname='%s'" %
            check_constraint_name)
        chk_constraint_record = pg_cursor.fetchone()
        connection.close()
        return chk_constraint_record
    except Exception:
        traceback.print_exc(file=sys.stderr)
