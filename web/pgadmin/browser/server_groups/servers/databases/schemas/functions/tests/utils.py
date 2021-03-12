##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import traceback

from regression.python_test_utils import test_utils as utils
from pgadmin.utils import server_utils as server_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils


def create_trigger_function(server, db_name, schema_name, func_name,
                            server_version=0):
    """This function add the trigger function to schema"""
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        r_type = "event_trigger"
        if server_version != 0:
            r_type = "trigger"
        query = "CREATE FUNCTION " + schema_name + "." + func_name + \
                "()" \
                " RETURNS {0} LANGUAGE 'plpgsql' STABLE LEAKPROOF" \
                " SECURITY DEFINER SET enable_sort=true AS $BODY$ BEGIN" \
                " NULL; END; $BODY$".format(
                    r_type)
        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created function
        pg_cursor.execute("SELECT pro.oid, pro.proname FROM"
                          " pg_catalog.pg_proc pro WHERE pro.proname='%s'" %
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
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        query = "CREATE FUNCTION " + schema_name + "." + func_name + \
                "()" \
                " RETURNS trigger LANGUAGE 'plpgsql' STABLE LEAKPROOF" \
                " SECURITY DEFINER SET enable_sort=true AS $BODY$ BEGIN" \
                " NULL; END; $BODY$"
        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created function
        pg_cursor.execute("SELECT pro.oid, pro.proname FROM"
                          " pg_catalog.pg_proc pro WHERE pro.proname='%s'" %
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
                                         server['port'],
                                         server['sslmode'])
    pg_cursor = connection.cursor()
    pg_cursor.execute("SELECT pro.oid, pro.proname FROM"
                      " pg_catalog.pg_proc pro WHERE pro.proname='%s'" %
                      func_name)
    functions = pg_cursor.fetchone()
    connection.close()
    return functions


def create_procedure(server, db_name, schema_name, func_name, s_type,
                     s_version, with_args=False, args=""):
    """This function add the procedure to schema"""
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        if s_type == 'pg':
            query = "CREATE PROCEDURE {0}.{1}" \
                    "({2})" \
                    " LANGUAGE 'sql'" \
                    " SECURITY DEFINER AS $$" \
                    " SELECT 1; $$;".format(schema_name, func_name, args)
        else:
            if s_version >= 90500:
                query = "CREATE PROCEDURE {0}.{1}" \
                        "({2})" \
                        " SECURITY DEFINER AS $BODY$ BEGIN" \
                        " NULL; END; $BODY$".format(schema_name, func_name,
                                                    args)
            else:
                query = "CREATE PROCEDURE {0}.{1}" \
                        "({2})" \
                        " AS $BODY$ BEGIN" \
                        " NULL; END; $BODY$".format(schema_name, func_name,
                                                    args)

        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created function
        pg_cursor.execute("SELECT pro.oid, pro.proname FROM"
                          " pg_catalog.pg_proc pro WHERE pro.proname='%s'" %
                          func_name)
        functions = pg_cursor.fetchone()
        connection.close()
        return functions
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_function(server, db_name, schema_name, func_name, args=None,
                    lang='sql'):
    """This function add the procedure to schema"""
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        if args:
            args = "{0}".format(args)
        else:
            args = ''
        query = "CREATE FUNCTION " + schema_name + "." + func_name + \
                "({0})" \
                " RETURNS integer LANGUAGE '{1}' STABLE" \
                " SECURITY DEFINER AS $$" \
                " SELECT 1; $$;".format(args, lang)
        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created function
        pg_cursor.execute("SELECT pro.oid, pro.proname FROM"
                          " pg_catalog.pg_proc pro WHERE pro.proname='%s'" %
                          func_name)
        functions = pg_cursor.fetchone()
        connection.close()
        return functions
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_support_internal_function(server, db_name, schema_name, func_name):
    """Add the function to schema which will be used as support function for
    another function."""
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        query = "CREATE FUNCTION " + schema_name + "." + func_name + \
                "(internal)" \
                " RETURNS internal LANGUAGE 'internal'" \
                " AS $BODY$cidr_abbrev$BODY$;"
        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created function
        pg_cursor.execute("SELECT pro.oid, pro.proname FROM"
                          " pg_catalog.pg_proc pro WHERE pro.proname='%s'" %
                          func_name)
        functions = pg_cursor.fetchone()
        connection.close()
        return functions
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_procedure(server, db_name, proc_name):
    """This function verifies the procedure in db"""
    connection = utils.get_db_connection(db_name,
                                         server['username'],
                                         server['db_password'],
                                         server['host'],
                                         server['port'],
                                         server['sslmode'])
    pg_cursor = connection.cursor()
    pg_cursor.execute("SELECT pro.oid, pro.proname FROM"
                      " pg_catalog.g_proc pro WHERE pro.proname='%s'" %
                      proc_name)
    procs = pg_cursor.fetchone()
    connection.close()
    return procs


def set_up(obj):
    """Common set up function"""
    from regression import parent_node_dict

    obj.db_name = parent_node_dict["database"][-1]["db_name"]
    schema_info = parent_node_dict["schema"][-1]
    obj.server_id = schema_info["server_id"]
    obj.db_id = schema_info["db_id"]
    obj.prorettypename = "event_trigger/trigger"
    server_con = server_utils.connect_server(obj, obj.server_id)

    if not server_con["info"] == "Server connected.":
        raise Exception("Could not connect to server.")
    if "version" in server_con["data"]:
        obj.server_version = server_con["data"]["version"]
        if server_con["data"]["version"] < 90300:
            obj.prorettypename = "trigger"
    if "type" in server_con["data"]:
        obj.server_type = server_con["data"]["type"]

    db_con = database_utils.connect_database(obj, utils.SERVER_GROUP,
                                             obj.server_id,
                                             obj.db_id)
    if not db_con['data']["connected"]:
        raise Exception("Could not connect to database.")
    obj.schema_id = schema_info["schema_id"]
    obj.schema_name = schema_info["schema_name"]
    schema_response = schema_utils.verify_schemas(obj.server,
                                                  obj.db_name,
                                                  obj.schema_name)
    if not schema_response:
        raise Exception("Could not find the schema.")

    return obj


def execute_procedure(server, db_name, proc_exec_sql):
    """This function verifies the procedure in db"""
    connection = utils.get_db_connection(db_name,
                                         server['username'],
                                         server['db_password'],
                                         server['host'],
                                         server['port'],
                                         server['sslmode'])
    pg_cursor = connection.cursor()
    pg_cursor.execute(proc_exec_sql)
    connection.close()
