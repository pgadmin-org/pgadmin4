##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from regression.python_test_utils.test_utils import *
import os
import json

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/cast_test_data.json") as data_file:
    test_cases = json.load(data_file)


def api_get_cast(self, cast_id):
    return self.tester.get(
        self.url + str(SERVER_GROUP) + '/' + str(
            self.server_id) + '/' +
        str(self.db_id) + '/' + str(cast_id),
        content_type='html/json')


def api_create_cast(self):
    return self.tester.post(
        self.url + str(SERVER_GROUP) + '/' +
        str(self.server_id) + '/' + str(
            self.db_id) + '/',
        data=json.dumps(self.data),
        content_type='html/json')


def api_get_cast_node(self, cast_id):
    return self.tester.get(
        self.url + str(SERVER_GROUP) + '/' + str(
            self.server_id) + '/' +
        str(self.db_id) + '/' + str(cast_id),
        content_type='html/json')


def api_create_cast_get_functions(self):
    return self.tester.post(
        self.url + 'get_functions/' + str(SERVER_GROUP) + '/' +
        str(self.server_id) + '/' + str(
            self.db_id) + '/',
        data=json.dumps(self.data),
        content_type='html/json')


def api_delete_cast(self, cast_id):
    return self.tester.delete(
        self.url + str(SERVER_GROUP) + '/' +
        str(self.server_id) + '/' + str(self.db_id) +
        '/' + str(cast_id),
        follow_redirects=True)


def api_delete_casts(self, list_of_cast_ids):
    return self.tester.delete(
        self.url + str(SERVER_GROUP) + '/' +
        str(self.server_id) + '/' + str(self.db_id) + '/',
        data=json.dumps({'ids': list_of_cast_ids}),
        content_type='html/json',
        follow_redirects=True)


def api_create_cast_get_type(self):
    return self.tester.get(
        self.url + 'get_type/' + str(SERVER_GROUP) + '/' +
        str(self.server_id) + '/' + str(
            self.db_id) + '/',
        content_type='html/json')


def api_get_cast_node_dependent(self):
    return self.tester.get(
        self.url + 'dependent/' + str(SERVER_GROUP) + '/' + str(
            self.server_id) + '/' +
        str(self.db_id) + '/' + str(self.cast_id),
        content_type='html/json')


def api_get_cast_node_dependencies(self):
    return self.tester.get(
        self.url + 'dependency/' + str(SERVER_GROUP) + '/' + str(
            self.server_id) + '/' +
        str(self.db_id) + '/' + str(self.cast_id),
        content_type='html/json')


def api_get_cast_sql(self):
    return self.tester.get(
        self.url + 'sql/' + str(SERVER_GROUP) + '/' + str(
            self.server_id) + '/' +
        str(self.db_id) + '/' + str(self.cast_id),
        content_type='html/json')


def api_update_cast(self):
    return self.tester.put(
        self.url + str(SERVER_GROUP) + '/' +
        str(self.server_id) + '/' + str(
            self.db_id) +
        '/' + str(self.cast_id),
        data=json.dumps(self.data),
        follow_redirects=True)


def get_database_connection(self):
    return get_db_connection(self.server_data['db_name'],
                             self.server['username'],
                             self.server['db_password'],
                             self.server['host'],
                             self.server['port'],
                             self.server['sslmode'])


def assert_status_code(self, response):
    act_res = response.status_code
    exp_res = self.expected_data["status_code"]
    return self.assertEqual(act_res, exp_res)


def assert_error_message(self, response):
    act_res = response.json["errormsg"]
    exp_res = self.expected_data["error_msg"]
    return self.assertEqual(act_res, exp_res)


def assert_cast_created(self):
    source_type = self.data["srctyp"]
    target_type = self.data["trgtyp"]
    con = get_database_connection(self)
    act_res = verify_cast(con, source_type, target_type)
    return self.assertTrue(act_res)


def create_cast(server, source_type, target_type):
    """
    This function add a cast into database
    :param server: server details
    :type server: dict
    :param source_type: source type for cast to be added
    :type source_type: str
    :param target_type: target type for cast to be added
    :type target_type: str
    :return cast id
    :rtype: int
    """
    try:
        connection = get_db_connection(server['db'],
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'],
                                       server['sslmode'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute("CREATE CAST (%s AS %s) WITHOUT"
                          " FUNCTION AS IMPLICIT" % (source_type, target_type))
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

        # Get 'oid' from newly created cast
        pg_cursor.execute(
            "SELECT ca.oid FROM pg_catalog.pg_cast ca WHERE ca.castsource = "
            "(SELECT t.oid FROM pg_catalog.pg_type t "
            "WHERE format_type(t.oid, NULL)='%s') "
            "AND ca.casttarget = (SELECT t.oid FROM pg_catalog.pg_type t "
            "WHERE pg_catalog.format_type(t.oid, NULL) = '%s')" %
            (source_type, target_type))
        oid = pg_cursor.fetchone()
        cast_id = ''
        if oid:
            cast_id = oid[0]
        connection.close()
        return cast_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_cast(connection, source_type, target_type):
    """ This function will verify current cast."""
    try:
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT * FROM pg_catalog.pg_cast ca WHERE ca.castsource = "
            "(SELECT t.oid FROM pg_catalog.pg_type t "
            "WHERE format_type(t.oid, NULL)='%s') "
            "AND ca.casttarget = (SELECT t.oid FROM pg_catalog.pg_type t "
            "WHERE pg_catalog.format_type(t.oid, NULL) = '%s')" %
            (source_type, target_type))
        casts = pg_cursor.fetchall()
        connection.close()
        if len(casts) > 0:
            return True
        else:
            return False
    except Exception:
        traceback.print_exc(file=sys.stderr)


def drop_cast(connection, source_type, target_type):
    """This function used to drop the cast"""

    try:
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT * FROM pg_catalog.pg_cast ca WHERE ca.castsource = "
            "(SELECT t.oid FROM pg_catalog.pg_type t "
            "WHERE format_type(t.oid, NULL)='%s') "
            "AND ca.casttarget = (SELECT t.oid FROM pg_catalog.pg_type t "
            "WHERE pg_catalog.format_type(t.oid, NULL) = '%s')" %
            (source_type, target_type))
        if pg_cursor.fetchall():
            pg_cursor.execute(
                "DROP CAST (%s AS %s) CASCADE" % (source_type, target_type))
            connection.commit()
            connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)
