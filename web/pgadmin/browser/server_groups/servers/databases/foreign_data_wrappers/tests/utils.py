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
import uuid
import sys

from regression.test_utils import get_db_connection


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
        "fdwhan": "%s.%s" % (schema_name, "postgres_fdw_handler"),
        "fdwoptions": [],
        "fdwowner": db_user,
        "fdwvalue": "%s.%s" % (schema_name, "postgres_fdw_validator"),
        "name": "fdw_add_%s" % (str(uuid.uuid4())[1:6])
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
                                       server['port'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute('''CREATE FOREIGN DATA WRAPPER "%s"''' % fdw_name)
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
                                       server['port'])
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT oid FROM pg_foreign_data_wrapper WHERE fdwname = '%s'"
            % fdw_name)
        fdw = pg_cursor.fetchone()
        connection.close()
        return fdw
    except Exception:
        traceback.print_exc(file=sys.stderr)
