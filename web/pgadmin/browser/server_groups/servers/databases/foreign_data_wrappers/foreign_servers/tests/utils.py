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
from regression.test_utils import get_db_connection

file_name = os.path.basename(__file__)


def create_fsrv(server, db_name, fsrv_name, fdw_name):
    """
    This function will create foreign data wrapper under the existing
    dummy database.

    :param server: test_server, test_db, fsrv_name, fdw_name
    :return: fsrv_id
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
        pg_cursor.execute("CREATE SERVER {0} FOREIGN DATA WRAPPER {1} OPTIONS "
                          "(host '{2}', dbname '{3}', port '{4}')".format
                          (fsrv_name, fdw_name, server['host'], db_name,
                           server['port']))

        connection.set_isolation_level(old_isolation_level)
        connection.commit()

        # Get 'oid' from newly created foreign server
        pg_cursor.execute(
            "SELECT oid FROM pg_foreign_server WHERE srvname = '%s'"
            % fsrv_name)
        oid = pg_cursor.fetchone()
        fsrv_id = ''
        if oid:
            fsrv_id = oid[0]
        connection.close()
        return fsrv_id
    except Exception as exception:
        exception = "Exception: %s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)


def verify_fsrv(server, db_name , fsrv_name):
    """ This function will verify current foreign server."""

    try:
        connection = get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        pg_cursor = connection.cursor()

        pg_cursor.execute(
            "SELECT oid FROM pg_foreign_server WHERE srvname = '%s'"
            % fsrv_name)
        fsrvs = pg_cursor.fetchall()
        connection.close()
        return fsrvs
    except Exception as exception:
        exception = "%s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)
