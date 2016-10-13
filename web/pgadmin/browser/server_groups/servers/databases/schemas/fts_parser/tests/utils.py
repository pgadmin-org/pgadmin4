# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

from __future__ import print_function
import traceback
import os
import sys
from regression.test_utils import get_db_connection

file_name = os.path.basename(__file__)


def create_fts_parser(server, db_name, schema_name, fts_parser_name):
    """This function will add the fts_parser under test schema. """

    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
        pg_cursor = connection.cursor()

        query = "CREATE TEXT SEARCH PARSER " + schema_name + "." + fts_parser_name + \
                "(START=int4_accum, GETTOKEN=gist_box_penalty, " \
                "END=btfloat4sortsupport, LEXTYPES=dsynonym_init)"

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
                                       server['port'])
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
