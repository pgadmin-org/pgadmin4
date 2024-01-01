##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import traceback
import json
import os


from regression.python_test_utils import test_utils as utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/collations_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_collation(server, schema_name, coll_name, db_name):
    """This function add the collation to schemas"""
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute('CREATE COLLATION %s.%s FROM pg_catalog."C"' %
                          (schema_name, coll_name))
        connection.commit()

        # Get 'oid' from newly created database
        pg_cursor.execute("SELECT coll.oid, coll.collname FROM"
                          " pg_catalog.pg_collation coll WHERE "
                          "coll.collname='%s'" %
                          coll_name)
        collation = pg_cursor.fetchone()
        connection.close()
        return collation
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_collation(server, db_name, coll_name):
    """This function verifies the collation is exist or not"""
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        # Get 'oid' from newly created database
        pg_cursor.execute("SELECT coll.oid, coll.collname FROM"
                          " pg_catalog.pg_collation coll "
                          "WHERE coll.collname='%s'" %
                          coll_name)
        collation = pg_cursor.fetchone()
        connection.close()
        return collation
    except Exception:
        traceback.print_exc(file=sys.stderr)
