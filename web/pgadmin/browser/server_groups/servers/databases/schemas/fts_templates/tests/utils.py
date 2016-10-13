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


def create_fts_template(server, db_name, schema_name, fts_temp_name):
    """This function will add the fts_template under test schema. """

    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
        pg_cursor = connection.cursor()

        query = "CREATE TEXT SEARCH TEMPLATE " + schema_name + "." + fts_temp_name + \
                "(INIT=dispell_init, LEXIZE=dispell_lexize)"
        pg_cursor.execute(query)
        connection.commit()

        # Get 'oid' from newly created template
        pg_cursor.execute("select oid from pg_catalog.pg_ts_template where "
                          "tmplname = '%s' order by oid ASC limit 1" % fts_temp_name)

        oid = pg_cursor.fetchone()
        fts_temp_id = ''
        if oid:
            fts_temp_id = oid[0]
        connection.close()
        return fts_temp_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_fts_template(server, db_name, fts_temp_name):
    """
    This function will verify current FTS template.

    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param fts_temp_name: FTS template name to be added
    :type fts_temp_name: str
    :return fts_temp: FTS template detail
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
            "select oid from pg_catalog.pg_ts_template where "
            "tmplname = '%s' order by oid ASC limit 1" % fts_temp_name)
        fts_template = pg_cursor.fetchone()
        connection.close()
        return fts_template
    except Exception:
        traceback.print_exc(file=sys.stderr)
