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


def create_fts_configuration(server, db_name, schema_name, fts_conf_name):
    """This function will add the fts_configuration under test schema using
    default parser. """

    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
        pg_cursor = connection.cursor()

        query = "CREATE TEXT SEARCH CONFIGURATION " + schema_name + "." + fts_conf_name + \
                "(PARSER=default)"

        pg_cursor.execute(query)
        connection.commit()

        # Get 'oid' from newly created configuration
        pg_cursor.execute("select oid from pg_catalog.pg_ts_config where "
                          "cfgname = '%s' order by oid ASC limit 1"
                          % fts_conf_name)

        oid = pg_cursor.fetchone()
        fts_conf_id = ''
        if oid:
            fts_conf_id = oid[0]
        connection.close()
        return fts_conf_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_fts_configuration(server, db_name, fts_conf_name):
    """
    This function will verify current FTS configuration.

    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param fts_conf_name: FTS configuration name to be added
    :type fts_conf_name: str
    :return fts_conf: FTS configuration detail
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
            "select oid from pg_catalog.pg_ts_config where "
            "cfgname = '%s' order by oid ASC limit 1"
            % fts_conf_name)
        fts_conf = pg_cursor.fetchone()
        connection.close()
        return fts_conf
    except Exception:
        traceback.print_exc(file=sys.stderr)
