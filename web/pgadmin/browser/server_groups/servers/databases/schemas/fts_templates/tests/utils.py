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
with open(CURRENT_PATH + "/fts_templates_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_fts_template(server, db_name, schema_name, fts_temp_name):
    """This function will add the fts_template under test schema. """

    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'],
                                       server['sslmode'])
        pg_cursor = connection.cursor()

        query = "DROP TEXT SEARCH TEMPLATE IF EXISTS " + schema_name + "." + \
                fts_temp_name
        pg_cursor.execute(query)

        query = "CREATE TEXT SEARCH TEMPLATE " + schema_name + "." + \
                fts_temp_name + \
                "(INIT=dispell_init, LEXIZE=dispell_lexize)"
        pg_cursor.execute(query)
        connection.commit()

        # Get 'oid' from newly created template
        pg_cursor.execute("select oid from pg_catalog.pg_ts_template where "
                          "tmplname = '%s' order by oid ASC limit 1" %
                          fts_temp_name)

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
                                       server['port'],
                                       server['sslmode'])
        pg_cursor = connection.cursor()

        pg_cursor.execute(
            "select oid from pg_catalog.pg_ts_template where "
            "tmplname = '%s' order by oid ASC limit 1" % fts_temp_name)
        fts_template = pg_cursor.fetchone()
        connection.close()
        return fts_template
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_fts_template(server, db_name, schema_name, fts_template_name):
    """
    This function delete FTS parsers.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param fts_template_name: FTS template name to be added
    :type fts_template_name: str
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
    pg_cursor.execute("DROP TEXT SEARCH TEMPLATE %s.%s" % (
        schema_name, fts_template_name))
    connection.commit()
    connection.close()
