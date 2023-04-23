##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import os
import sys
import traceback
import json

from regression.python_test_utils.test_utils import get_db_connection

file_name = os.path.basename(__file__)
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/fts_dictionaries_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_fts_dictionary(server, db_name, schema_name, fts_dict_name):
    """This function will add the fts_dictionary under test schema. """

    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'],
                                       server['sslmode'])
        pg_cursor = connection.cursor()

        query = "CREATE TEXT SEARCH DICTIONARY %s.%s (TEMPLATE = simple)" % (
            schema_name, fts_dict_name)

        pg_cursor.execute(query)
        connection.commit()

        # Get 'oid' from newly created dictionary
        pg_cursor.execute("select oid from pg_catalog.pg_ts_dict where "
                          "dictname = '%s' order by oid ASC limit 1"
                          % fts_dict_name)

        oid = pg_cursor.fetchone()
        fts_dict_id = ''
        if oid:
            fts_dict_id = oid[0]
        connection.close()
        return fts_dict_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_fts_dict(server, db_name, fts_dict_name):
    """
    This function will verify current FTS dictionary.

    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param fts_dict_name: FTS dictionary name to be added
    :type fts_dict_name: str
    :return fts_dict: FTS dictionary detail
    :rtype: tuple
    """
    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'],
                                       server['sslmode'])
        pg_cursor = connection.cursor()

        pg_cursor.execute(
            "select oid from pg_catalog.pg_ts_dict where "
            "dictname = '%s' order by oid ASC limit 1"
            % fts_dict_name)
        fts_dict = pg_cursor.fetchone()
        connection.close()
        return fts_dict
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_fts_dictionaries(server, db_name, schema_name, fts_dict_name):
    """
    This function delete FTS dictionaries.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param fts_dict_name: FTS dict name to be added
    :type fts_dict_name: str
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
    pg_cursor.execute("DROP TEXT SEARCH DICTIONARY %s.%s" % (schema_name,
                                                             fts_dict_name))
    connection.commit()
    connection.close()
