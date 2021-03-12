##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import os
import sys
import uuid

from regression.python_test_utils import test_utils as utils

TABLE_SPACE_URL = '/browser/tablespace/obj/'
file_name = os.path.basename(__file__)


def get_tablespace_data(tablespace_path, db_owner):
    """This function returns the tablespace data"""
    data = {
        "name": "test_%s" % str(uuid.uuid4())[1:8],
        "seclabels": [],
        "spcacl": [
            {
                "grantee": db_owner,
                "grantor": db_owner,
                "privileges": [
                    {
                        "privilege_type": "C",
                        "privilege": True,
                        "with_grant": False
                    }
                ]
            }
        ],
        "spclocation": tablespace_path,
        "spcoptions": [],
        "spcuser": db_owner
    }
    return data


def create_tablespace(server, test_tablespace_name, test_tablespace_dir=None):
    try:
        connection = utils.get_db_connection(server['db'],
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        if test_tablespace_dir is None:
            test_tablespace_dir = server['tablespace_path']
        pg_cursor.execute("CREATE TABLESPACE %s LOCATION '%s'" %
                          (test_tablespace_name, test_tablespace_dir))
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

        # Get 'oid' from newly created tablespace
        pg_cursor.execute(
            "SELECT ts.oid from pg_catalog.pg_tablespace ts "
            "WHERE ts.spcname='%s'" % test_tablespace_name)
        oid = pg_cursor.fetchone()
        tspc_id = ''
        if oid:
            tspc_id = oid[0]
        connection.close()
        return tspc_id
    except Exception as exception:
        raise Exception("Error while creating tablespace. %s" % exception)


def verify_table_space(server, test_tablespace_name):
    """
    This function calls the GET API for role to verify
    :param server: server info
    :type server: dict
    :param test_tablespace_name: tablespace name
    :type test_tablespace_name: str
    :return tablespace_count: tablespace count
    :rtype: int
    """
    try:
        connection = utils.get_db_connection(server['db'],
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * FROM pg_catalog.pg_tablespace ts WHERE"
                          " ts.spcname='%s'" % test_tablespace_name)
        tablespace_count = len(pg_cursor.fetchall())
        connection.close()
        return tablespace_count
    except Exception as exception:
        exception = "%s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)


def delete_tablespace(connection, test_tablespace_name):
    try:
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * FROM pg_catalog.pg_tablespace ts WHERE"
                          " ts.spcname='%s'" % test_tablespace_name)
        tablespace_count = len(pg_cursor.fetchall())
        if tablespace_count:
            old_isolation_level = connection.isolation_level
            connection.set_isolation_level(0)
            pg_cursor.execute("DROP TABLESPACE %s" % test_tablespace_name)
            connection.set_isolation_level(old_isolation_level)
            connection.commit()
        connection.close()
    except Exception as exception:
        exception = "%s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)
        raise Exception(exception)
