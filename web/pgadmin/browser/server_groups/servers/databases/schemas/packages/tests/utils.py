##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import traceback

from regression.python_test_utils import test_utils as utils


def create_package(server, db_name, schema_name, pkg_name, proc_name):
    """
    This function create the package on given test schema.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param package_name: package_name
    :type package_name: str
    :return package_id: synonym_id
    :rtype: int
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        query = "CREATE OR REPLACE PACKAGE %s.%s IS PROCEDURE %s(); END %s; " \
                "CREATE OR REPLACE PACKAGE BODY %s.%s IS PROCEDURE %s() IS " \
                "BEGIN dbms_output.put_line('Test_pkg.Proc...'); END; " \
                "END %s;" % \
                (schema_name, pkg_name, proc_name, pkg_name, schema_name,
                 pkg_name, proc_name, pkg_name)

        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created package
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_namespace "
                          "WHERE nspname='%s'" % pkg_name)
        package_id = pg_cursor.fetchone()[0]
        connection.close()
        return package_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_package(server, db_name, pkg_name):
    """
    This function verify the added package on test schema.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param package_name: package name
    :type package_name: str
    :return package: package record from database
    :rtype: tuple
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_namespace "
                          "WHERE nspname='%s'" % pkg_name)
        package = pg_cursor.fetchone()
        connection.close()
        return package
    except Exception:
        traceback.print_exc(file=sys.stderr)
