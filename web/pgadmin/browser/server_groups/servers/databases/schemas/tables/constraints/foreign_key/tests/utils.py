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
import json
import traceback
from urllib.parse import urlencode

from regression.python_test_utils import test_utils as utils

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/foreign_key_test_data.json") as data_file:
    test_cases = json.load(data_file)


# api call method
def api_create(self):
    return self.tester.post("{0}{1}/{2}/{3}/{4}/{5}/".
                            format(self.url, utils.SERVER_GROUP,
                                   self.server_id, self.db_id,
                                   self.schema_id, self.local_table_id),
                            data=json.dumps(self.data),
                            content_type='html/json'
                            )


def api_delete(self, foreign_key_id=None):
    if foreign_key_id is None:
        foreign_key_id = self.foreign_key_id
    return self.tester.delete("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id,
                                     self.schema_id,
                                     self.local_table_id,
                                     foreign_key_id),
                              data=json.dumps(self.data),
                              follow_redirects=True
                              )


def api_get(self, foreign_key_id=None):
    if foreign_key_id is None:
        foreign_key_id = self.foreign_key_id
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id,
                                  self.local_table_id,
                                  foreign_key_id),
                           data=json.dumps(self.data),
                           follow_redirects=True
                           )


def api_get_msql(self, url_encode_data):
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/{6}?{7}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.local_table_id,
                                  self.foreign_key_id,
                                  urlencode(url_encode_data)),
                           follow_redirects=True
                           )


def api_put(self):
    return self.tester.put("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id,
                                  self.local_table_id,
                                  self.foreign_key_id),
                           data=json.dumps(self.data),
                           follow_redirects=True
                           )


def api_get_converging_index(self, req_args):
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.local_table_id,
                                  req_args),
                           follow_redirects=True
                           )


def create_foreignkey(server, db_name, schema_name, local_table_name,
                      foreign_table_name, query_val=None):
    """
    This function creates a column under provided table.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param local_table_name: local table name
    :type local_table_name: str
    :param foreign_table_name: foreign table name
    :type foreign_table_name: str
    :return table_id: table id
    :rtype: int
    """
    if query_val is None:
        query = "ALTER TABLE %s.%s ADD FOREIGN KEY (id) REFERENCES %s.%s " \
                "(id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION" % \
                (schema_name, local_table_name, schema_name,
                 foreign_table_name)
    else:
        query = eval(query_val)
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
        # Get oid of newly added foreign key
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_constraint "
                          "where conname='%s_id_fkey'" % local_table_name)
        fk_record = pg_cursor.fetchone()
        connection.close()
        fk_id = fk_record[0]
        return fk_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_foreignkey(server, db_name, local_table_name, fk_name=None):
    """
    This function verifies foreign key constraint exist or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param local_table_name: local table name
    :type local_table_name: str
    :return table: table record from database
    :rtype: tuple
    """
    if fk_name is None:
        conname = local_table_name + '_id_fkey'
    else:
        conname = fk_name
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_constraint "
                          "where conname='%s'" % conname)
        fk_record = pg_cursor.fetchone()
        connection.close()
        return fk_record
    except Exception:
        traceback.print_exc(file=sys.stderr)
