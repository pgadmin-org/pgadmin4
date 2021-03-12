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

from regression.python_test_utils import test_utils as utils
from urllib.parse import urlencode

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/view_test_data.json") as data_file:
    test_cases = json.load(data_file)


# api call methods
def api_create(self):
    return self.tester.post("{0}{1}/{2}/{3}/{4}/".
                            format(self.url, utils.SERVER_GROUP,
                                   self.server_id, self.db_id,
                                   self.schema_id
                                   ),
                            data=json.dumps(self.data),
                            content_type='html/json')


def api_get(self, view_id=None):
    if view_id is None:
        view_id = self.view_id
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, view_id),
                           follow_redirects=True)


def api_get_msql(self, url_encode_data):
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}?{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.view_id,
                                  urlencode(url_encode_data)),
                           follow_redirects=True
                           )


def api_delete(self, view_id=None):
    if view_id is None:
        view_id = self.view_id
    return self.tester.delete("{0}{1}/{2}/{3}/{4}/{5}".
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id,
                                     self.schema_id, view_id),
                              data=json.dumps(self.data),
                              follow_redirects=True)


def api_put(self):
    return self.tester.put("{0}{1}/{2}/{3}/{4}/{5}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.view_id),
                           data=json.dumps(self.data),
                           follow_redirects=True)


def create_trigger_function_with_trigger(server, db_name, schema_name,
                                         func_name):
    """This function add the trigger function to schema"""
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        query = "CREATE FUNCTION " + schema_name + "." + func_name + \
                "()" \
                " RETURNS trigger LANGUAGE 'plpgsql' STABLE LEAKPROOF" \
                " SECURITY DEFINER SET enable_sort=true AS $BODY$ BEGIN" \
                " NULL; END; $BODY$"
        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created function
        pg_cursor.execute("SELECT pro.oid, pro.proname FROM"
                          " pg_catalog.pg_proc pro WHERE pro.proname='%s'" %
                          func_name)
        functions = pg_cursor.fetchone()
        connection.close()
        return functions
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_trigger(server, db_name, schema_name, table_name, trigger_name,
                   trigger_func_name, trigger_func_arg=None):
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
    :param trigger_name: trigger name
    :type trigger_name: str
    :param trigger_func_name: trigger function name
    :type trigger_func_name: str
    :return trigger_id: trigger id
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
        query = "CREATE TRIGGER %s INSTEAD OF DELETE ON %s.%s FOR EACH ROW " \
                "EXECUTE PROCEDURE %s.%s(%s)" % (trigger_name, schema_name,
                                                 table_name, schema_name,
                                                 trigger_func_name,
                                                 trigger_func_arg)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_trigger "
                          "where tgname='%s'" % trigger_name)
        trigger = pg_cursor.fetchone()
        trigger_id = ''
        if trigger:
            trigger_id = trigger[0]
        connection.close()
        return trigger_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def create_view(server, db_name, schema_name, view_name, sql_query=None,
                mview_index=None):
    """
    This function creates a table under provided schema.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param sql_query: sql query to create view
    :type sql_query: str
    :param view_name: view name
    :type view_name: str
    :return view_id: view id
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
        query = eval(sql_query)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get 'oid' from newly created view
        pg_cursor.execute("select oid from pg_catalog.pg_class "
                          "where relname='%s'" % view_name)
        view = pg_cursor.fetchone()
        view_id = view[0]
        connection.close()
        return view_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_view(server, db_name, view_name):
    """
    This function verifies view exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param view_name: view name
    :type view_name: str
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
        pg_cursor.execute("select oid from pg_catalog.pg_class "
                          "where relname='%s'" % view_name)
        view = pg_cursor.fetchone()
        connection.close()
        return view
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def get_view_id(server, db_name, view_name):
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        # Get 'oid' from newly created view
        pg_cursor.execute("select oid from pg_catalog.pg_class "
                          "where relname='%s'" % view_name)
        view = pg_cursor.fetchone()
        view_id = None
        if view:
            view_id = view[0]
        connection.close()
        return view_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
