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


def get_cast_data():
    data = {
        "castcontext": "IMPLICIT",
        "encoding": "UTF8",
        "name": "money->bigint",
        "srctyp": "money",
        "trgtyp": "bigint",
    }
    return data


def create_cast(server, source_type, target_type):
    """
    This function add a cast into database
    :param server: server details
    :type server: dict
    :param source_type: source type for cast to be added
    :type source_type: str
    :param target_type: target type for cast to be added
    :type target_type: str
    :return cast id
    :rtype: int
    """
    try:
        connection = get_db_connection(server['db'],
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute("CREATE CAST (%s AS %s) WITHOUT"
                          " FUNCTION AS IMPLICIT" % (source_type, target_type))
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

        # Get 'oid' from newly created cast
        pg_cursor.execute(
            "SELECT ca.oid FROM pg_cast ca WHERE ca.castsource = "
            "(SELECT t.oid FROM pg_type t WHERE format_type(t.oid, NULL)='%s') "
            "AND ca.casttarget = (SELECT t.oid FROM pg_type t WHERE "
            "format_type(t.oid, NULL) = '%s')" % (source_type, target_type))
        oid = pg_cursor.fetchone()
        cast_id = ''
        if oid:
            cast_id = oid[0]
        connection.close()
        return cast_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_cast(connection, source_type, target_type):
    """ This function will verify current cast."""
    try:
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT * FROM pg_cast ca WHERE ca.castsource = "
            "(SELECT t.oid FROM pg_type t WHERE format_type(t.oid, NULL)='%s') "
            "AND ca.casttarget = (SELECT t.oid FROM pg_type t WHERE "
            "format_type(t.oid, NULL) = '%s')" % (source_type, target_type))
        casts = pg_cursor.fetchall()
        connection.close()
        return casts
    except Exception:
        traceback.print_exc(file=sys.stderr)


def drop_cast(connection, source_type, target_type):
    """This function used to drop the cast"""

    try:
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT * FROM pg_cast ca WHERE ca.castsource = "
            "(SELECT t.oid FROM pg_type t WHERE format_type(t.oid, NULL)='%s') "
            "AND ca.casttarget = (SELECT t.oid FROM pg_type t WHERE "
            "format_type(t.oid, NULL) = '%s')" % (source_type, target_type))
        if pg_cursor.fetchall():
            pg_cursor.execute(
                "DROP CAST (%s AS %s) CASCADE" % (source_type, target_type))
            connection.commit()
            connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)
