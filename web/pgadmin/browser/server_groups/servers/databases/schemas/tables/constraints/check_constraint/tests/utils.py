# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################
from __future__ import print_function
import traceback
import sys

from regression import test_utils as utils


def create_check_constraint(server, db_name, schema_name, table_name,
                            check_constraint_name):
    """
    This function creates a check constraint under provided table.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :param check_constraint_name: constraint name
    :type check_constraint_name: str
    :return chk_constraint_id: check constraint id
    :rtype: int
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        query = "ALTER TABLE %s.%s ADD CONSTRAINT %s CHECK ( (id > 0)) " \
                "NOT VALID; COMMENT ON CONSTRAINT %s ON %s.%s IS " \
                "'this is test comment'" % (schema_name, table_name,
                                            check_constraint_name,
                                            check_constraint_name,
                                            schema_name, table_name)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get oid of newly added check constraint
        pg_cursor.execute(
            "SELECT oid FROM pg_constraint where conname='%s'" %
            check_constraint_name)
        chk_constraint_record = pg_cursor.fetchone()
        connection.close()
        chk_constraint_id = chk_constraint_record[0]
        return chk_constraint_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_check_constraint(server, db_name, check_constraint_name):
    """
    This function verifies check constraint constraint exist or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param check_constraint_name: constraint name
    :type check_constraint_name: str
    :return chk_constraint_record: check constraint record from database
    :rtype: tuple
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT oid FROM pg_constraint where conname='%s'" %
            check_constraint_name)
        chk_constraint_record = pg_cursor.fetchone()
        connection.close()
        return chk_constraint_record
    except Exception:
        traceback.print_exc(file=sys.stderr)
