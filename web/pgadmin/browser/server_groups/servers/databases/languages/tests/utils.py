# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
from __future__ import print_function
import sys
import traceback

from regression.test_utils import get_db_connection


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
                                       server['port'])

        pg_cursor = connection.cursor()
        query = ("CREATE TRUSTED PROCEDURAL LANGUAGE %s "
                 "HANDLER plpgsql_call_handler" % lang_name)
        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created language
        pg_cursor.execute("SELECT oid from pg_language where lanname='%s'" %
                          lang_name)
        language = pg_cursor.fetchone()
        language_id = language[0]
        connection.close()
        return language_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_language(server, db_name, lang_name):
    """
    This function verifies the language exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param lang_name: language name
    :type lang_name: str
    :return language: language record
    :rtype: tuple
    """
    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT oid from pg_language where lanname='%s'" %
                          lang_name)
        language = pg_cursor.fetchall()
        connection.close()
        return language
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
                                       server['port'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * from pg_language where lanname='%s'" %
                          lang_name)
        languages = pg_cursor.fetchall()
        language_count = len(languages)
        if language_count:
            pg_cursor.execute(
                "DELETE FROM pg_language where lanname='%s'" %
                lang_name)
            connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)
