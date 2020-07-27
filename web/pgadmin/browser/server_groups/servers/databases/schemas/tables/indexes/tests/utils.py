##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import json
import sys
import traceback

from regression.python_test_utils import test_utils as utils

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/index_test_data.json") as data_file:
    test_cases = json.load(data_file)


def api_create_index(self):
    return self.tester.post(
        "{0}{1}/{2}/{3}/{4}/{5}/".format(self.url, utils.SERVER_GROUP,
                                         self.server_id, self.db_id,
                                         self.schema_id, self.table_id),
        data=json.dumps(self.data),
        content_type='html/json')


def api_get_index(self, index_id):
    return self.tester.get(
        "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                            self.server_id, self.db_id,
                                            self.schema_id, self.table_id,
                                            index_id))


def api_put_index(self):
    return self.tester.put(
        "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                            self.server_id, self.db_id,
                                            self.schema_id, self.table_id,
                                            self.index_id),
        data=json.dumps(self.data),
        follow_redirects=True)


def api_get_index_statistics(self, index_id):
    return self.tester.get(
        "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                            self.server_id, self.db_id,
                                            self.schema_id, self.table_id,
                                            str(index_id)))


def api_get_index_node(self, index_id):
    return self.tester.get(
        "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                            self.server_id, self.db_id,
                                            self.schema_id, self.table_id,
                                            str(index_id)))


def api_delete_index(self):
    return self.tester.delete(
        "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                            self.server_id, self.db_id,
                                            self.schema_id, self.table_id,
                                            self.index_id),
        follow_redirects=True
    )


def api_delete_indexes(self, index_id_lists):
    data = {'ids': index_id_lists}
    return self.tester.delete(
        "{0}{1}/{2}/{3}/{4}/{5}/".format(self.url, utils.SERVER_GROUP,
                                         self.server_id, self.db_id,
                                         self.schema_id, self.table_id),
        data=json.dumps(data),
        content_type='html/json',
        follow_redirects=True)


def api_get_index_sql(self):
    return self.tester.get(
        "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                            self.server_id, self.db_id,
                                            self.schema_id, self.table_id,
                                            self.index_id))


def api_create_index_get_collations(self):
    return self.tester.get(
        "{0}{1}/{2}/{3}/{4}/{5}/".format(self.url, utils.SERVER_GROUP,
                                         self.server_id, self.db_id,
                                         self.schema_id, self.table_id, ))


def api_create_index_get_access_methods(self):
    return self.tester.get(
        "{0}{1}/{2}/{3}/{4}/{5}/".format(self.url, utils.SERVER_GROUP,
                                         self.server_id, self.db_id,
                                         self.schema_id, self.table_id, ))


def api_create_index_get_op_class(self):
    return self.tester.get(
        "{0}{1}/{2}/{3}/{4}/{5}/".format(self.url, utils.SERVER_GROUP,
                                         self.server_id, self.db_id,
                                         self.schema_id, self.table_id, ))


def api_get_index_dependents(self, index_id):
    self.url = self.url + 'dependent/'
    return self.tester.get(
        "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                            self.server_id, self.db_id,
                                            self.schema_id, self.table_id,
                                            str(index_id)))


def api_get_index_dependency(self, index_id):
    self.url = self.url + 'dependency/'
    return self.tester.get(
        "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                            self.server_id, self.db_id,
                                            self.schema_id, self.table_id,
                                            str(index_id)))


def api_get_index_msql(self):
    return self.tester.get(
        "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                            self.server_id, self.db_id,
                                            self.schema_id, self.table_id,
                                            self.index_id),
        data=json.dumps(self.data),
        content_type='html/json',
        follow_redirects=True
    )


def assert_status_code(self, response):
    act_res = response.status_code
    exp_res = self.expected_data["status_code"]
    return self.assertEquals(act_res, exp_res)


def assert_error_message(self, response, error_msg=None):
    act_res = response.json["errormsg"]
    if error_msg is not None:
        exp_res = error_msg
    else:
        exp_res = self.expected_data["error_msg"]
    return self.assertEquals(act_res, exp_res)


def create_index(server, db_name, schema_name, table_name, index_name,
                 col_name):
    """
    This function will add the new index to existing column.
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
    :param col_name: column name
    :type col_name: str
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
        query = "CREATE INDEX %s ON %s.%s USING btree (%s ASC NULLS LAST) " \
                "TABLESPACE pg_default" % (index_name, schema_name,
                                           table_name, col_name)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get oid of newly added index
        pg_cursor.execute("select oid from pg_class where relname='%s'" %
                          index_name)
        index_record = pg_cursor.fetchone()
        index_oid = ''
        if index_record:
            index_oid = index_record[0]
        connection.close()
        return index_oid
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_index(server, db_name, index_name):
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
        pg_cursor.execute("select * from pg_class where relname='%s'" %
                          index_name)
        index_record = pg_cursor.fetchone()
        connection.close()
        return index_record
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
