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


def create_index(server, db_name, schema_name, table_name, index_name,
                 col_name):
    """
    This function will add the new index to existing column.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :param index_name: index name
    :type index_name: str
    :param col_name: column name
    :type col_name: str
    :return table_id: table id
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
        query = "CREATE INDEX %s ON %s.%s USING btree (%s ASC NULLS LAST) " \
                "TABLESPACE pg_default" % (index_name, schema_name,
                                           table_name, col_name)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get oid of newly added index
        pg_cursor.execute("select oid from pg_class where relname='%s'" %
                          index_name)
        index_record = pg_cursor.fetchone()
        index_oid = ''
        if index_record:
            index_oid = index_record[0]
        connection.close()
        return index_oid
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_index(server, db_name, index_name):
    """
    This function verifies index exist or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param index_name: index name
    :type index_name: str
    :return table: table record from database
    :rtype: tuple
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("select * from pg_class where relname='%s'" %
                          index_name)
        index_record = pg_cursor.fetchone()
        connection.close()
        return index_record
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
