##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import json
import os
import sys
import traceback
from urllib.parse import urlencode

from regression.python_test_utils.test_utils import get_db_connection
from regression.python_test_utils import test_utils as utils

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/foreign_tables_test_data.json") as data_file:
    test_cases = json.load(data_file)

file_name = os.path.basename(__file__)


def api_create(self):
    return self.tester.post("{0}{1}/{2}/{3}/{4}/".
                            format(self.url, utils.SERVER_GROUP,
                                   self.server_id, self.db_id, self.schema_id),
                            data=json.dumps(self.data),
                            content_type='html/json')


def api_get(self, ft_table_id=None):
    if ft_table_id is None:
        ft_table_id = self.ft_id
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}".
                           format(self.url, utils.SERVER_GROUP, self.server_id,
                                  self.db_id, self.schema_id, ft_table_id),
                           content_type='html/json')


def api_delete(self, ft_tbl_id=''):
    return self.tester.delete("{0}{1}/{2}/{3}/{4}/{5}".
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id,
                                     self.schema_id, ft_tbl_id),
                              data=json.dumps(self.data),
                              follow_redirects=True)


def api_put(self):
    return self.tester.put("{0}{1}/{2}/{3}/{4}/{5}".
                           format(self.url, utils.SERVER_GROUP, self.server_id,
                                  self.db_id, self.schema_id, self.ft_id),
                           data=json.dumps(self.data),
                           follow_redirects=True)


def api_get_msql(self, url_encode_data):
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}?{6}".
                           format(self.url, utils.SERVER_GROUP, self.server_id,
                                  self.db_id, self.schema_id, self.ft_id,
                                  urlencode(url_encode_data)),
                           follow_redirects=True)


def create_foreign_table(server, db_name, schema_name, fsrv_name,
                         foreign_table_name, sql_query=None):
    """
    This function will create foreign table under the existing
    dummy schema.

    :param server: test_server, test_db, fsrv_name, foreign_table_name
    :return: ft_id
    """

    try:
        query = "CREATE FOREIGN TABLE " + schema_name + "." + \
                foreign_table_name + "(emp_name text NULL) SERVER %s" % \
                fsrv_name

        if sql_query is not None:
            query = eval(sql_query)
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

        # Get 'oid' from newly created foreign table
        pg_cursor.execute(
            "SELECT ftrelid FROM pg_catalog.pg_foreign_table WHERE ftserver = "
            "(SELECT oid FROM pg_catalog.pg_foreign_server "
            "WHERE srvname = '%s') "
            "ORDER BY ftrelid ASC limit 1" % fsrv_name)

        oid = pg_cursor.fetchone()
        ft_id = ''
        if oid:
            ft_id = oid[0]
        connection.close()
        return ft_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_foreign_table(server, db_name, fsrv_name):
    """ This function will verify current foreign table."""

    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
        pg_cursor = connection.cursor()

        pg_cursor.execute(
            "SELECT ftrelid FROM pg_catalog.pg_foreign_table WHERE ftserver = "
            "(SELECT oid FROM pg_catalog.pg_foreign_server "
            "WHERE srvname = '%s') "
            "ORDER BY ftrelid ASC limit 1" % fsrv_name)
        fts = pg_cursor.fetchone()
        connection.close()
        return fts
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_foregin_table(server, db_name, schema_name, ft_name):
    """
    This function delete Foreign table object.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param ft_name: Foreign table object
    :type ft_name: str
    :param schema_name: schema name
    :type schema_name: str
    :return: None
        """
    connection = get_db_connection(db_name,
                                   server['username'],
                                   server['db_password'],
                                   server['host'],
                                   server['port'],
                                   server['sslmode'])
    pg_cursor = connection.cursor()
    pg_cursor.execute("DROP FOREIGN TABLE %s.%s" % (schema_name, ft_name))
    connection.commit()
    connection.close()
