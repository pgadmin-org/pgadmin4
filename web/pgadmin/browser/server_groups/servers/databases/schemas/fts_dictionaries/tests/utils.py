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


def create_fts_dictionary(server, db_name, schema_name, fts_dict_name):
    """This function will add the fts_dictionary under test schema. """

    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
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
                                       server['port'])
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
