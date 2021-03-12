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
from regression.python_test_utils.test_utils import get_db_connection
from regression.python_test_utils import test_utils as utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/language_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_language(server, db_name, lang_name):
    """
    This function add a language into database
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param lang_name: language name
    :type lang_name: str
    :return cast id
    :rtype: int
    """
    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'],
                                       server['sslmode'])

        pg_cursor = connection.cursor()
        query = ("CREATE TRUSTED PROCEDURAL LANGUAGE %s "
                 "HANDLER plpgsql_call_handler" % lang_name)
        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created language
        pg_cursor.execute("SELECT oid from pg_catalog.pg_language where "
                          "lanname='%s'" % lang_name)
        language = pg_cursor.fetchone()
        language_id = language[0]
        connection.close()
        return language_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_language(self):
    """
    This function verifies the language exist in database or not.
    """
    try:
        connection = get_db_connection(self.db_name,
                                       self.server['username'],
                                       self.server['db_password'],
                                       self.server['host'],
                                       self.server['port'],
                                       self.server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * from pg_catalog.pg_language where "
                          "lanname='%s'" % self.data["name"])
        pg_cursor.execute("select pl.lanname, "
                          "(select rolname from pg_authid where oid "
                          "= pl.lanowner) as lanowner, "
                          "pl.lanpltrusted, "
                          "( select prosrc from pg_catalog.pg_proc where "
                          "oid = pl.lanplcallfoid) as lanplcallfoid, "
                          "( select prosrc from pg_catalog.pg_proc "
                          "where oid = pl.laninline) as laninline, "
                          "( select prosrc from pg_catalog.pg_proc "
                          "where oid = pl.lanvalidator) as lanvalidator "
                          "from pg_catalog.pg_language pl where lanname='%s'" %
                          self.data["name"])
        language = pg_cursor.fetchall()
        expected_output = utils.create_expected_output(
            self.parameters_to_compare,
            list(language[0]))

        connection.close()

        return expected_output
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_language(server, db_name, lang_name):
    """
    This function delete the language exist in database.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param lang_name: language name
    :type lang_name: str
    :return None
    """
    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'],
                                       server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * from pg_catalog.pg_language where "
                          "lanname='%s'" % lang_name)
        languages = pg_cursor.fetchall()
        language_count = len(languages)
        if language_count:
            pg_cursor.execute(
                "DELETE FROM pg_catalog.pg_language where lanname='%s'" %
                lang_name)
            connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def make_dict(paramaters, actual_data):
    expected_output = {}

    for key in paramaters:
        for value in actual_data:
            expected_output[key] = value
            actual_data.remove(value)
            break
    return expected_output
