##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import os
import sys
import uuid
import json

from regression.python_test_utils.test_utils import get_db_connection

file_name = os.path.basename(__file__)
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/foreign_servers_test_data.json") as data_file:
    test_cases = json.load(data_file)


def get_fs_data(db_user, server, db_name):
    data = {
        "fsrvacl": [
            {
                "grantee": db_user,
                "grantor": db_user,
                "privileges":
                    [
                        {
                            "privilege_type": "U",
                            "privilege": "true",
                            "with_grant": "false"
                        }
                    ]
            }
        ],
        "fsrvoptions": [
            {
                "fsrvoption": "host",
                "fsrvvalue": server['host']
            },
            {
                "fsrvoption": "port",
                "fsrvvalue": str(server['port'])
            },
            {
                "fsrvoption": "dbname",
                "fsrvvalue": db_name
            }
        ],
        "fsrvowner": db_user,
        "name": "test_fsrv_add_%s" % (str(uuid.uuid4())[1:8])
    }
    return data


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
                                       server['port'],
                                       server['sslmode'])
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


def verify_fsrv(server, db_name, fsrv_name):
    """ This function will verify current foreign server."""

    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'],
                                       server['sslmode'])
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
