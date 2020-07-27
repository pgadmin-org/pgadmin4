##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import traceback
import uuid
import json
import os

from regression.python_test_utils.test_utils import get_db_connection

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/fdw_test_data.json") as data_file:
    test_cases = json.load(data_file)


def get_fdw_data(schema_name, db_user):
    data = {
        "fdwacl":
            [
                {
                    "grantee": db_user,
                    "grantor": db_user,
                    "privileges":
                        [
                            {
                                "privilege_type": "U",
                                "privilege": "true",
                                "with_grant": "true"
                            }
                        ]
                }
            ],
        "fdwoptions": [],
        "fdwowner": db_user,
        "name": "fdw_add_%s" % (str(uuid.uuid4())[1:8])
    }
    return data


def create_fdw(server, db_name, fdw_name):
    """
    This function will create foreign data wrapper under the existing
    dummy database.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param fdw_name: FDW name
    :type fdw_name: str
    :return fdw_id: fdw id
    :rtype: int
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
        pg_cursor.execute('''CREATE FOREIGN DATA WRAPPER "%s"
        OPTIONS (op1 '5')''' % fdw_name)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get 'oid' from newly created foreign data wrapper
        pg_cursor.execute(
            "SELECT oid FROM pg_foreign_data_wrapper WHERE fdwname = '%s'"
            % fdw_name)
        oid = pg_cursor.fetchone()
        fdw_id = ''
        if oid:
            fdw_id = oid[0]
        connection.close()
        return fdw_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_fdw(server, db_name, fdw_name):
    """
    This function will verify current foreign data wrapper.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param fdw_name: FDW name
    :type fdw_name: str
    :return fdw: fdw details
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
            "SELECT oid FROM pg_foreign_data_wrapper WHERE fdwname = '%s'"
            % fdw_name)
        fdw = pg_cursor.fetchone()
        connection.close()
        return fdw
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_fdw(server, db_name, fdw_name):
    """
    This function delete FDW.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param fdw_name: fdw name to be deleted
    :type fdw_name: str
    :return: None
    """
    connection = get_db_connection(db_name,
                                   server['username'],
                                   server['db_password'],
                                   server['host'],
                                   server['port'],
                                   server['sslmode'])
    pg_cursor = connection.cursor()
    pg_cursor.execute("DROP FOREIGN DATA WRAPPER %s CASCADE" % fdw_name)
    connection.commit()
    connection.close()
