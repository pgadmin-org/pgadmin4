# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

from __future__ import print_function
import os
import sys
import traceback
from regression.test_utils import get_db_connection

file_name = os.path.basename(__file__)


def create_foreign_table(server, db_name, schema_name, fsrv_name,
                         foreign_table_name):
    """
    This function will create foreign table under the existing
    dummy schema.

    :param server: test_server, test_db, fsrv_name, foreign_table_name
    :return: ft_id
    """

    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()

        pg_cursor.execute(
            "CREATE FOREIGN TABLE " + schema_name + "." + foreign_table_name +
            "(emp_name text NULL) SERVER %s" % fsrv_name)

        connection.set_isolation_level(old_isolation_level)
        connection.commit()

        # Get 'oid' from newly created foreign table
        pg_cursor.execute(
            "SELECT ftrelid FROM pg_foreign_table WHERE ftserver = "
            "(SELECT oid FROM pg_foreign_server WHERE srvname = '%s') ORDER BY "
            "ftrelid ASC limit 1" % fsrv_name)

        oid = pg_cursor.fetchone()
        ft_id = ''
        if oid:
            ft_id = oid[0]
        connection.close()
        return ft_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_foreign_table(server, db_name, fsrv_name):
    """ This function will verify current foreign table."""

    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
        pg_cursor = connection.cursor()

        pg_cursor.execute(
            "SELECT ftrelid FROM pg_foreign_table WHERE ftserver = "
            "(SELECT oid FROM pg_foreign_server WHERE srvname = '%s') ORDER BY "
            "ftrelid ASC limit 1" % fsrv_name)
        fts = pg_cursor.fetchone()
        connection.close()
        return fts
    except Exception:
        traceback.print_exc(file=sys.stderr)
