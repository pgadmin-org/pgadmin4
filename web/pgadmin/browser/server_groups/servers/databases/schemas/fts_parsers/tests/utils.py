##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
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
with open(CURRENT_PATH + "/fts_parsers_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_fts_parser(server, db_name, schema_name, fts_parser_name):
    """This function will add the fts_parser under test schema. """

    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'],
                                       server['sslmode'])
        pg_cursor = connection.cursor()

        query = "DROP TEXT SEARCH PARSER IF EXISTS " + schema_name + "." + \
                fts_parser_name
        pg_cursor.execute(query)

        query = "CREATE TEXT SEARCH PARSER " + schema_name + "." + \
                fts_parser_name + \
                "(START=prsd_start, GETTOKEN=prsd_nexttoken, " \
                "END=prsd_end, LEXTYPES=dispell_init)"

        pg_cursor.execute(query)
        connection.commit()

        # Get 'oid' from newly created parser
        pg_cursor.execute("select oid from pg_catalog.pg_ts_parser where "
                          "prsname = '%s' order by oid ASC limit 1"
                          % fts_parser_name)

        oid = pg_cursor.fetchone()
        fts_parser_id = ''
        if oid:
            fts_parser_id = oid[0]
        connection.close()
        return fts_parser_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_fts_parser(server, db_name, fts_parser_name):
    """
    This function will verify current FTS parser.

    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param fts_parser_name: FTS parser name to be added
    :type fts_parser_name: str
    :return fts_temp: FTS parser detail
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
            "select oid from pg_catalog.pg_ts_parser where "
            "prsname = '%s' order by oid ASC limit 1"
            % fts_parser_name)
        fts_parser = pg_cursor.fetchone()
        connection.close()
        return fts_parser
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_fts_parser(server, db_name, schema_name, fts_parser_name):
    """
    This function delete FTS parsers.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param fts_parser_name: FTS parser name to be added
    :type fts_parser_name: str
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
    pg_cursor.execute("DROP TEXT SEARCH PARSER %s.%s" % (
        schema_name, fts_parser_name))
    connection.commit()
    connection.close()
