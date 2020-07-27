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

from regression.python_test_utils import test_utils as utils


def create_foreignkey(server, db_name, schema_name, local_table_name,
                      foreign_table_name):
    """
    This function creates a column under provided table.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param local_table_name: local table name
    :type local_table_name: str
    :param foreign_table_name: foreign table name
    :type foreign_table_name: str
    :return table_id: table id
    :rtype: int
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        query = "ALTER TABLE %s.%s ADD FOREIGN KEY (id) REFERENCES %s.%s " \
                "(id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION" % \
                (
                    schema_name, local_table_name, schema_name,
                    foreign_table_name)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get oid of newly added foreign key
        pg_cursor.execute(
            "SELECT oid FROM pg_constraint where conname='%s_id_fkey'" %
            local_table_name)
        fk_record = pg_cursor.fetchone()
        connection.close()
        fk_id = fk_record[0]
        return fk_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_foreignkey(server, db_name, local_table_name):
    """
    This function verifies foreign key constraint exist or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param local_table_name: local table name
    :type local_table_name: str
    :return table: table record from database
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
        pg_cursor.execute(
            "SELECT oid FROM pg_constraint where conname='%s_id_fkey'" %
            local_table_name)
        fk_record = pg_cursor.fetchone()
        connection.close()
        return fk_record
    except Exception:
        traceback.print_exc(file=sys.stderr)
