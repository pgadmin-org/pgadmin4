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


def create_trigger_function(server, db_name, schema_name, func_name):
    """This function add the trigger function to schema"""
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        pg_cursor = connection.cursor()
        query = "CREATE FUNCTION "+schema_name+"."+func_name+"()" \
                " RETURNS event_trigger LANGUAGE 'plpgsql' STABLE LEAKPROOF" \
                " SECURITY DEFINER SET enable_sort=true AS $BODY$ BEGIN" \
                " NULL; END; $BODY$"
        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created function
        pg_cursor.execute("SELECT pro.oid, pro.proname FROM"
                          " pg_proc pro WHERE pro.proname='%s'" %
                          func_name)
        functions = pg_cursor.fetchone()
        connection.close()
        return functions
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_trigger_function_with_trigger(server, db_name, schema_name,
                                               func_name):
    """This function add the trigger function to schema"""
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        pg_cursor = connection.cursor()
        query = "CREATE FUNCTION "+schema_name+"."+func_name+"()" \
                " RETURNS trigger LANGUAGE 'plpgsql' STABLE LEAKPROOF" \
                " SECURITY DEFINER SET enable_sort=true AS $BODY$ BEGIN" \
                " NULL; END; $BODY$"
        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created function
        pg_cursor.execute("SELECT pro.oid, pro.proname FROM"
                          " pg_proc pro WHERE pro.proname='%s'" %
                          func_name)
        functions = pg_cursor.fetchone()
        connection.close()
        return functions
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_trigger_function(server, db_name, func_name):
    """This function verifies the trigger function in db"""
    connection = utils.get_db_connection(db_name,
                                         server['username'],
                                         server['db_password'],
                                         server['host'],
                                         server['port'])
    pg_cursor = connection.cursor()
    pg_cursor.execute("SELECT pro.oid, pro.proname FROM"
                      " pg_proc pro WHERE pro.proname='%s'" %
                      func_name)
    functions = pg_cursor.fetchone()
    connection.close()
    return functions
