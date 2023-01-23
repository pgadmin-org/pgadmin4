##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import traceback
import os
import sys
import uuid
import psycopg2
import sqlite3
import shutil
from functools import partial
import secrets
import importlib

from selenium.webdriver.support.wait import WebDriverWait
from testtools.testcase import clone_test_with_new_id
import re
import time
from selenium.common.exceptions import WebDriverException
from urllib.request import urlopen
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support import expected_conditions as ec
import selenium.common.exceptions

import config
import regression
from regression import test_setup

from pgadmin.utils.preferences import Preferences
from pgadmin.utils.constants import BINARY_PATHS
from pgadmin.utils import set_binary_path

from functools import wraps

CURRENT_PATH = os.path.abspath(os.path.join(os.path.dirname(
    os.path.realpath(__file__)), "../"))

SERVER_GROUP = test_setup.config_data['server_group']
COVERAGE_CONFIG_FILE = os.path.join(CURRENT_PATH, ".coveragerc")
file_name = os.path.realpath(__file__)


def get_db_connection(db, username, password, host, port, sslmode="prefer"):
    """This function returns the connection object of psycopg"""
    connection = psycopg2.connect(
        database=db,
        user=username,
        password=password,
        host=host,
        port=port,
        sslmode=sslmode
    )
    return connection


def login_tester_account(tester):
    """
    This function login the test client using env variables email and password
    :param tester: test client
    :type tester: flask test client object
    :return: None
    """
    if os.environ['PGADMIN_SETUP_EMAIL'] and \
            os.environ['PGADMIN_SETUP_PASSWORD']:
        email = os.environ['PGADMIN_SETUP_EMAIL']
        password = os.environ['PGADMIN_SETUP_PASSWORD']
        tester.login(email, password)
    else:
        from regression.runtests import app_starter
        print("Unable to login test client, email and password not found.",
              file=sys.stderr)
        _cleanup(tester, app_starter)
        sys.exit(1)


def get_config_data():
    """This function reads the server data from config_data"""
    server_data = []
    for srv in test_setup.config_data['server_credentials']:
        if 'enabled' not in srv or srv['enabled']:
            data = {
                "name": srv['name'],
                "comment": srv['comment'],
                "host": srv['host'],
                "port": srv['db_port'],
                "db": srv['maintenance_db'],
                "username": srv['db_username'],
                "db_password": srv['db_password'],
                "role": "",
                "sslmode": srv['sslmode'],
                "tablespace_path": srv.get('tablespace_path', None),
                "default_binary_paths": srv.get('default_binary_paths', None)
            }
            if 'db_type' in srv:
                data['db_type'] = srv['db_type']
            server_data.append(data)
    return server_data


def write_node_info(key, node_info=None):
    """
    This function append the node details to
    :param key: dict key name to store node info
    :type key: str
    :param node_info: node details
    :type node_info: dict
    :return: node_info_dict
    :rtype: dict
    """
    node_info_dict = regression.node_info_dict
    if node_info not in node_info_dict[key]:
        node_info_dict[key].append(node_info)


def clear_node_info_dict():
    """This function used to clears the node_info_dict variable"""
    node_info_dict = regression.node_info_dict
    for node in node_info_dict:
        del node_info_dict[node][:]


def create_database(server, db_name, encoding=None):
    """This function used to create database and returns the database id"""
    db_id = ''
    try:
        connection = get_db_connection(
            server['db'],
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        if encoding is None:
            pg_cursor.execute(
                '''CREATE DATABASE "%s" TEMPLATE template0''' % db_name)
        else:
            pg_cursor.execute(
                '''CREATE DATABASE "%s" TEMPLATE template0
                ENCODING='%s' LC_COLLATE='%s' LC_CTYPE='%s' ''' %
                (db_name, encoding[0], encoding[1], encoding[1]))
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

        # Get 'oid' from newly created database
        pg_cursor.execute("SELECT db.oid from pg_catalog.pg_database db WHERE"
                          " db.datname='%s'" % db_name)
        oid = pg_cursor.fetchone()
        if oid:
            db_id = oid[0]
        connection.close()

        # In PostgreSQL 15 the default public schema that every database has
        # will have a different set of permissions. In fact, before PostgreSQL
        # 15, every user could manipulate the public schema of a database he is
        # not owner. Since the upcoming new version, only the database owner
        # will be granted full access to the public schema, while other users
        # will need to get an explicit GRANT
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        pg_cursor = connection.cursor()
        pg_cursor.execute('''GRANT ALL ON SCHEMA public TO PUBLIC''')
        connection.commit()
        connection.close()

        return db_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        return db_id


def create_table(server, db_name, table_name, extra_columns=[]):
    """
    This function create the table in given database name
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param table_name: table name
    :type table_name: str
    :return: None
    """
    try:
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)

        extra_columns_sql = ", " + ", ".join(extra_columns) \
            if len(extra_columns) > 0 else ''

        pg_cursor = connection.cursor()
        pg_cursor.execute(
            '''CREATE TABLE "%s" (some_column VARCHAR, value NUMERIC,
            details VARCHAR%s)''' % (table_name, extra_columns_sql))
        pg_cursor.execute(
            '''INSERT INTO "%s"(some_column, value, details)
            VALUES ('Some-Name', 6, 'some info')'''
            % table_name)
        pg_cursor.execute(
            '''INSERT INTO "%s"(some_column, value, details)
            VALUES ('Some-Other-Name', 22,
            'some other info')''' % table_name)
        pg_cursor.execute(
            '''INSERT INTO "%s"(some_column, value, details)
            VALUES ('Yet-Another-Name', 14,
            'cool info')''' % table_name)

        connection.set_isolation_level(old_isolation_level)
        connection.commit()

    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_table(server, db_name, table_name):
    """
    This function delete the table in given database
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param table_name: table name
    :type table_name: str
    :return: None
    """
    try:
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            '''DROP TABLE IF EXISTS "%s"''' % table_name)
        connection.commit()

    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_table_with_query(server, db_name, query):
    """
    This function create the table in given database name
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param query: create table query
    :type query: str
    :return: None
    """
    try:
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_constraint(server,
                      db_name,
                      table_name,
                      constraint_type="unique",
                      constraint_name="test_unique"):
    try:
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute('''
            ALTER TABLE "%s"
              ADD CONSTRAINT "%s" %s (some_column)
            ''' % (table_name, constraint_name, constraint_type.upper()))

        connection.set_isolation_level(old_isolation_level)
        connection.commit()

    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_type(server, db_name, type_name, type_fields=[]):
    """
    This function create the type in given database name
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param type_name: type name
    :type type_name: str
    :param type_fields: type fields
    :type type_fields: list
    :return: None
    """
    try:
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)

        type_fields_sql = ", ".join(type_fields)

        pg_cursor = connection.cursor()
        pg_cursor.execute(
            '''CREATE TYPE %s AS (%s)''' % (type_name, type_fields_sql))

        connection.set_isolation_level(old_isolation_level)
        connection.commit()

    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_debug_function(server, db_name, function_name="test_func"):
    try:
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        try:
            pg_cursor.execute('''CREATE EXTENSION pldbgapi;''')
        except Exception:
            pass
        pg_cursor.execute('''
            CREATE OR REPLACE FUNCTION public."%s"()
              RETURNS text
                LANGUAGE 'plpgsql'
                COST 100.0
                VOLATILE
            AS $function$
              BEGIN
                RAISE INFO 'This is a test function';
                RAISE NOTICE '<img src="x" onerror="console.log(1)">';
                RAISE NOTICE '<h1 onmouseover="console.log(1);">';
                RETURN 'Hello, pgAdmin4';
              END;
            $function$;
            ''' % function_name)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

    except Exception:
        traceback.print_exc(file=sys.stderr)


def drop_debug_function(server, db_name, function_name="test_func"):
    try:
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute('''
            DROP FUNCTION public."%s"();
            ''' % function_name)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

    except Exception:
        traceback.print_exc(file=sys.stderr)


def does_function_exist(server, db_name, fun_name):
    query = "select exists(select * " \
            "from pg_catalog.pg_proc where proname = '%s');" % fun_name

    connection = get_db_connection(
        db_name,
        server['username'],
        server['db_password'],
        server['host'],
        server['port'],
        server['sslmode']
    )

    cursor = connection.cursor()

    cursor.execute(query)
    result = cursor.fetchall()
    return str(result[0][0])


def grant_role(server, db_name, role_name="test_role",
               grant_role="<h1>test</h1>"):
    try:
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        sql_query = '''GRANT "%s" TO %s;''' % (grant_role, role_name)

        pg_cursor.execute(
            sql_query
        )
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_role(server, db_name, role_name="test_role"):
    try:
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        sql_query = '''
            CREATE USER "%s" WITH
              LOGIN
              NOSUPERUSER
              INHERIT
              CREATEDB
              NOCREATEROLE
            ''' % (role_name)
        if connection.server_version > 90100:
            sql_query += '\nNOREPLICATION'

        pg_cursor.execute(
            sql_query
        )
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

    except Exception:
        traceback.print_exc(file=sys.stderr)


def drop_role(server, db_name, role_name="test_role"):
    try:
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute('''
            DROP USER "%s"
            ''' % role_name)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

    except Exception:
        traceback.print_exc(file=sys.stderr)


def drop_database(connection, database_name):
    """This function used to drop the database"""
    if database_name not in ["postgres", "template1", "template0"]:
        pg_cursor = connection.cursor()
        if connection.server_version >= 90100:
            pg_cursor.execute(
                "SELECT pg_terminate_backend(pg_stat_activity.pid) "
                "FROM pg_stat_activity "
                "WHERE pg_stat_activity.datname ='%s' AND "
                "pid <> pg_backend_pid();" % database_name
            )
        else:
            pg_cursor.execute(
                "SELECT pg_terminate_backend(procpid) "
                "FROM pg_stat_activity "
                "WHERE pg_stat_activity.datname ='%s' "
                "AND current_query='<IDLE>';" % database_name
            )
        pg_cursor.execute("SELECT * FROM pg_catalog.pg_database db WHERE"
                          " db.datname='%s'" % database_name)
        if pg_cursor.fetchall():
            old_isolation_level = connection.isolation_level
            connection.set_isolation_level(0)
            pg_cursor.execute('''DROP DATABASE "%s"''' % database_name)
            connection.set_isolation_level(old_isolation_level)
            connection.commit()
            connection.close()


def drop_database_multiple(connection, database_names):
    """This function used to drop the database"""
    for database_name in database_names:
        if database_name not in ["postgres", "template1", "template0"]:
            pg_cursor = connection.cursor()
            if connection.server_version >= 90100:
                pg_cursor.execute(
                    "SELECT pg_terminate_backend(pg_stat_activity.pid) "
                    "FROM pg_stat_activity "
                    "WHERE pg_stat_activity.datname ='%s' AND "
                    "pid <> pg_backend_pid();" % database_name
                )
            else:
                pg_cursor.execute(
                    "SELECT pg_terminate_backend(procpid) "
                    "FROM pg_stat_activity "
                    "WHERE pg_stat_activity.datname ='%s' "
                    "AND current_query='<IDLE>';" % database_name
                )
            pg_cursor.execute("SELECT * FROM pg_catalog.pg_database db WHERE"
                              " db.datname='%s'" % database_name)
            if pg_cursor.fetchall():
                old_isolation_level = connection.isolation_level
                connection.set_isolation_level(0)
                pg_cursor.execute('''DROP DATABASE "%s"''' % database_name)
                connection.set_isolation_level(old_isolation_level)
                connection.commit()
    connection.close()


def drop_tablespace(connection):
    """This function used to drop the tablespace"""
    pg_cursor = connection.cursor()
    pg_cursor.execute("SELECT * FROM pg_catalog.pg_tablespace")
    table_spaces = pg_cursor.fetchall()
    if table_spaces:
        for table_space in table_spaces:
            if table_space[0] not in ["pg_default", "pg_global"]:
                old_isolation_level = connection.isolation_level
                connection.set_isolation_level(0)
                pg_cursor.execute("DROP TABLESPACE %s" % table_space[0])
                connection.set_isolation_level(old_isolation_level)
                connection.commit()
    connection.close()


def create_server(server):
    """This function is used to create server"""
    conn = sqlite3.connect(config.TEST_SQLITE_PATH)
    # Create the server
    cur = conn.cursor()
    server_details = (1, SERVER_GROUP, server['name'], server['host'],
                      server['port'], server['db'], server['username'],
                      server['role'], server['comment'])
    cur.execute('INSERT INTO server (user_id, servergroup_id, name, host, '
                'port, maintenance_db, username, role,'
                ' comment) VALUES (?,?,?,?,?,?,?,?,?)', server_details)
    server_id = cur.lastrowid
    conn.commit()
    conn.close()

    server['type'] = get_server_type(server)
    # Add server info to parent_node_dict
    regression.parent_node_dict["server"].append(
        {
            "server_id": server_id,
            "server": server
        }
    )

    return server_id


def delete_server_with_api(tester, sid):
    """This function used to delete server from SQLite"""
    try:
        url = '/browser/server/obj/' + str(SERVER_GROUP) + "/"
        # Call API to delete the server
        tester.delete(url + str(sid))

        cnt = 0
        for s in regression.parent_node_dict["server"]:
            if s['server_id'] == int(sid):
                del regression.parent_node_dict["server"][cnt]
            cnt += 1

    except Exception:
        traceback.print_exc(file=sys.stderr)


def add_db_to_parent_node_dict(srv_id, db_id, test_db_name):
    """ This function stores the database details into parent dict """
    regression.parent_node_dict["database"].append({
        "server_id": srv_id,
        "db_id": db_id,
        "db_name": test_db_name
    })


def add_schema_to_parent_node_dict(srv_id, db_name, db_id, schema_id,
                                   schema_name):
    """ This function stores the schema details into parent dict """
    server_information = {"server_id": srv_id, "db_id": db_id,
                          "test_db_name": db_name,
                          "schema_id": schema_id,
                          "schema_name": schema_name}
    regression.parent_node_dict["schema"].append(server_information)
    return server_information


def create_parent_server_node(server_info):
    """
    This function create the test server which will act as parent server,
    the other node will add under this server
    :param server_info: server details
    :type server_info: dict
    :return: None
    """
    srv_id = create_server(server_info)
    # Create database
    test_db_name = "test_db_%s" % str(uuid.uuid4())[1:6]
    encodings = ['UTF-8', 'C', 'C']
    db_id = create_database(server_info, test_db_name, encodings)
    add_db_to_parent_node_dict(srv_id, db_id, test_db_name)
    # Create schema
    schema_name = "test_schema_%s" % str(uuid.uuid4())[1:6]
    connection = get_db_connection(
        test_db_name,
        server_info['username'],
        server_info['db_password'],
        server_info['host'],
        server_info['port'],
        server_info['sslmode']
    )

    schema = regression.schema_utils.create_schema(connection, schema_name)
    return add_schema_to_parent_node_dict(
        srv_id, test_db_name, db_id, schema[0], schema[1]
    )


def delete_test_server(tester):
    """ This function use to delete test server """
    try:
        parent_node_dict = regression.parent_node_dict
        test_servers = parent_node_dict["server"]
        test_databases = parent_node_dict["database"]
        test_roles = regression.node_info_dict["lrid"]
        test_table_spaces = regression.node_info_dict["tsid"]
        for test_server in test_servers:
            srv_id = test_server["server_id"]
            servers_dict = test_server["server"]
            for database in test_databases:
                connection = get_db_connection(
                    servers_dict['db'],
                    servers_dict['username'],
                    servers_dict['db_password'],
                    servers_dict['host'],
                    servers_dict['port'],
                    servers_dict['sslmode']
                )
                database_name = database["db_name"]
                # Drop database
                drop_database(connection, database_name)
            for role in test_roles:
                connection = get_db_connection(
                    servers_dict['db'],
                    servers_dict['username'],
                    servers_dict['db_password'],
                    servers_dict['host'],
                    servers_dict['port'],
                    servers_dict['sslmode']
                )
                # Delete role
                regression.roles_utils.delete_role(
                    connection, role["role_name"]
                )
            for tablespace in test_table_spaces:
                connection = get_db_connection(
                    servers_dict['db'],
                    servers_dict['username'],
                    servers_dict['db_password'],
                    servers_dict['host'],
                    servers_dict['port'],
                    servers_dict['sslmode']
                )
                # Delete tablespace
                regression.tablespace_utils.delete_tablespace(
                    connection, tablespace["tablespace_name"]
                )
            # Delete server
            delete_server_with_api(tester, srv_id)
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def get_db_password(config_servers, name, host, db_port):
    """ This function return the password of particular server """
    db_password = ''
    for srv in config_servers:
        if (srv['name'], srv['host'], srv['db_port']) == (name, host, db_port):
            db_password = srv['db_password']
    return db_password


def get_db_server(sid):
    """
    This function returns the SQLite database connection
    :param sid: server id
    :type sid: int
    :return: db connection
    """
    connection = ''
    conn = sqlite3.connect(config.TEST_SQLITE_PATH)
    cur = conn.cursor()
    server = cur.execute(
        'SELECT name, host, port, maintenance_db,'
        ' username FROM server where id=%s' % sid
    )
    server = server.fetchone()
    if server:
        name = server[0]
        host = server[1]
        db_port = server[2]
        db_name = server[3]
        username = server[4]
        config_servers = test_setup.config_data['server_credentials']
        # Get the db password from config file for appropriate server
        db_password = get_db_password(config_servers, name, host, db_port)
        if db_password:
            # Drop database
            connection = get_db_connection(
                db_name, username, db_password, host, db_port
            )
    conn.close()
    return connection


def configure_preferences(default_binary_path=None):
    conn = sqlite3.connect(config.TEST_SQLITE_PATH)
    cur = conn.cursor()
    insert_preferences_query = \
        'INSERT INTO user_preferences(pid, uid, value) VALUES (?,?,?)'
    select_preference_query = \
        'SELECT pid, uid FROM user_preferences where pid=?'
    update_preference_query = 'UPDATE user_preferences' \
                              ' SET VALUE = ? WHERE PID = ?'

    if default_binary_path is not None:
        paths_pref = Preferences.module('paths')
        server_types = default_binary_path.keys()
        for server in server_types:
            if server != 'ppas' and server != 'pg':
                continue

            # get the default binary paths array
            bin_paths = BINARY_PATHS
            # set the default binary paths based on server version
            if server in default_binary_path and \
                    default_binary_path[server] != "":
                set_binary_path(
                    default_binary_path[server], bin_paths, server)

            bin_paths_server_based = json.dumps(bin_paths['pg_bin_paths'])
            if server == 'ppas':
                bin_paths_server_based = json.dumps(bin_paths['as_bin_paths'])

            pref_bin_path = paths_pref.preference('{0}_bin_dir'.format(server))
            user_pref = cur.execute(
                'SELECT pid, uid FROM user_preferences '
                'where pid=%s' % pref_bin_path.pid
            )

            user_pref_data = user_pref.fetchone()
            if user_pref_data:
                cur.execute(
                    'UPDATE user_preferences SET value = ? WHERE pid = ?',
                    (bin_paths_server_based, pref_bin_path.pid)
                )
            else:
                params = (pref_bin_path.pid, 1, bin_paths_server_based)
                cur.execute(
                    insert_preferences_query, params
                )

    browser_pref = Preferences.module('browser')

    # Disable tree state save for tests
    pref_tree_state_save_interval = \
        browser_pref.preference('browser_tree_state_save_interval')

    user_pref = cur.execute(
        select_preference_query, (pref_tree_state_save_interval.pid,)
    )

    if len(user_pref.fetchall()) == 0:
        cur.execute(insert_preferences_query,
                    (pref_tree_state_save_interval.pid, 1, -1)
                    )
    else:
        cur.execute(
            update_preference_query, (-1, pref_tree_state_save_interval.pid)
        )

    # Disable auto expand sole children tree state for tests
    pref_auto_expand_sol_children = \
        browser_pref.preference('auto_expand_sole_children')

    user_pref = cur.execute(
        select_preference_query, (pref_auto_expand_sol_children.pid,)
    )

    if len(user_pref.fetchall()) == 0:
        cur.execute(
            insert_preferences_query,
            (pref_auto_expand_sol_children.pid, 1, 'False')
        )
    else:
        cur.execute(
            update_preference_query,
            ('False', pref_auto_expand_sol_children.pid)
        )

    # Disable reload warning on browser
    pref_confirm_on_refresh_close = \
        browser_pref.preference('confirm_on_refresh_close')

    user_pref = cur.execute(
        select_preference_query, (pref_confirm_on_refresh_close.pid,)
    )

    if len(user_pref.fetchall()) == 0:
        cur.execute(
            insert_preferences_query,
            (pref_confirm_on_refresh_close.pid, 1, 'False')
        )
    else:
        cur.execute(
            update_preference_query,
            ('False', pref_confirm_on_refresh_close.pid)
        )

    conn.commit()
    conn.close()


def reset_layout_db(user_id=None):
    retry = 3
    while retry > 0:
        try:
            conn = sqlite3.connect(config.TEST_SQLITE_PATH)
            cur = conn.cursor()

            if user_id is None:
                cur.execute(
                    'DELETE FROM SETTING WHERE SETTING in '
                    '("Browser/Layout", "SQLEditor/Layout", "Debugger/Layout")'
                )
            else:
                cur.execute(
                    'DELETE FROM SETTING WHERE SETTING in '
                    '("Browser/Layout", "SQLEditor/Layout", "Debugger/Layout")'
                    ' AND USER_ID=?', user_id
                )
            cur.execute('DELETE FROM process')
            conn.commit()
            conn.close()
            break
        except Exception:
            retry -= 1


def remove_db_file():
    """This function use to remove SQLite DB file"""
    if os.path.isfile(config.TEST_SQLITE_PATH):
        os.remove(config.TEST_SQLITE_PATH)


def _cleanup(tester, app_starter):
    """This function use to cleanup the created the objects(servers, databases,
     schemas etc) during the test suite run"""
    try:
        test_servers = \
            regression.parent_node_dict["server"] + \
            regression.node_info_dict["sid"]
        test_databases = \
            regression.parent_node_dict["database"] + \
            regression.node_info_dict["did"]
        test_table_spaces = \
            regression.parent_node_dict["tablespace"] + \
            regression.node_info_dict["tsid"]
        test_roles = \
            regression.parent_node_dict["role"] + \
            regression.node_info_dict["lrid"]
        # Drop databases
        for database in test_databases:
            connection = get_db_server(database["server_id"])
            if connection:
                drop_database(connection, database["db_name"])
        # Delete table spaces
        for tablespace in test_table_spaces:
            connection = get_db_server(tablespace["server_id"])
            if connection:
                regression.tablespace_utils.delete_tablespace(
                    connection, tablespace["tablespace_name"])
        # Delete roles
        for role in test_roles:
            connection = get_db_server(role["server_id"])
            if connection:
                regression.roles_utils.delete_role(connection,
                                                   role["role_name"])
        # Delete servers
        for server in test_servers:
            delete_server_with_api(tester, server["server_id"])
    except Exception:
        traceback.print_exc(file=sys.stderr)
    finally:
        # Logout the test client
        tester.logout()

        # Remove SQLite db file
        remove_db_file()
        if app_starter:
            app_starter.stop_app()


def get_cleanup_handler(tester, app_starter):
    """This function use to bind variable to drop_objects function"""
    return partial(_cleanup, tester, app_starter)


def apply_scenario(scenario, test):
    """Apply scenario to test.
    :param scenario: A tuple (name, parameters) to apply to the test. The test
        is cloned, its id adjusted to have (name) after it, and the parameters
        dict is used to update the new test.
    :param test: The test to apply the scenario to. This test is unaltered.
    :return: A new test cloned from test, with the scenario applied.
    """
    name, parameters = scenario
    parameters["scenario_name"] = name
    scenario_suffix = '(' + name + ')'
    newtest = clone_test_with_new_id(test,
                                     test.id() + scenario_suffix)
    # Replace test description with test scenario name
    test_desc = name
    if test_desc is not None:
        newtest_desc = test_desc
        newtest.shortDescription = (lambda: newtest_desc)
    for key, value in parameters.items():
        setattr(newtest, key, value)
    return newtest


# This method is overridden to catch passed test cases
def add_success(self, test):
    """
    This function add the passed test cases in list i.e. TextTestResult.passed
    :param self:TextTestResult class
    :type self: TextTestResult object
    :param test: test case
    :type test: test case object
    :return: None
    """
    if self.showAll:
        self.passed.append((test, "Passed"))
        self.stream.writeln("ok")
    elif self.dots:
        self.stream.write('.')
        self.stream.flush()


def get_scenario_name(cases):
    """
    This function filters the test cases from list of test cases and returns
    the test cases list
    :param cases: test cases
    :type cases: dict
    :return: test cases in dict
    :rtype: dict
    """
    test_cases_dict = {}
    test_cases_dict_json = {}
    for class_name, test_case_list in cases.items():
        result = {class_name: []}
        for case_name_dict in test_case_list:
            key, value = list(case_name_dict.items())[0]
            class_names_dict = dict(
                (c_name, "") for scenario in result[class_name] for
                c_name in scenario.keys())
            if key not in class_names_dict:
                result[class_name].append(case_name_dict)
        test_cases_dict_json.update(result)
        test_cases_list = list(dict((case, "") for test_case in test_case_list
                                    for case in test_case))
        test_cases_dict.update({class_name: test_cases_list})
    return test_cases_dict, test_cases_dict_json


class Database:
    """
    Temporarily create and connect to a database, tear it down at exit

    example:

    with Database(server, 'some_test_db') as (connection, database_name):
        connection.cursor().execute(...)

    """

    def __init__(self, server):
        self.name = None
        self.server = server
        self.maintenance_connection = None
        self.connection = None

    def __enter__(self):
        self.name = "test_db_{0}".format(str(uuid.uuid4())[0:7])
        self.maintenance_connection = get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        create_database(self.server, self.name)
        self.connection = get_db_connection(
            self.name,
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        return self.connection, self.name

    def __exit__(self, type, value, traceback):
        self.connection.close()
        drop_database(self.maintenance_connection, self.name)


def get_timezone_without_dst(connection):
    """
    Returns timezone when daylight savings is not observed.
    DST starts at mid of March and ends on first week of November.
    So when getting timezone without dst use date (2017-01-01) which do not
    fall in dst range.
    """

    timezone_no_dst_sql = """SELECT EXTRACT(
        TIMEZONE FROM '2017-01-01 00:00:00'::TIMESTAMP WITH TIME ZONE);"""

    pg_cursor = connection.cursor()

    pg_cursor.execute(timezone_no_dst_sql)

    return pg_cursor.fetchone()[0]


def create_schema(server, db_name, schema_name):
    """
    This function create the schema in given database name
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :return: None
    """
    try:
        connection = get_db_connection(
            db_name,
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            '''CREATE SCHEMA "%s"''' % schema_name)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

    except Exception:
        traceback.print_exc(file=sys.stderr)


def get_server_type(server):
    """
    This function will return the type of the server (PPAS or PG)
    :param server:
    :return:
    """
    try:
        connection = get_db_connection(
            server['db'],
            server['username'],
            server['db_password'],
            server['host'],
            server['port'],
            server['sslmode']
        )

        pg_cursor = connection.cursor()
        # Get 'version' string
        pg_cursor.execute("SELECT version()")
        version_string = pg_cursor.fetchone()
        connection.close()
        if isinstance(version_string, tuple):
            version_string = version_string[0]

        if "EnterpriseDB" in version_string:
            return 'ppas'

        return 'pg'
    except Exception:
        traceback.print_exc(file=sys.stderr)


def check_binary_path_or_skip_test(cls, utility_name):
    if 'default_binary_paths' not in cls.server or \
        cls.server['default_binary_paths'] is None or \
        cls.server['type'] not in cls.server['default_binary_paths'] or \
            cls.server['default_binary_paths'][cls.server['type']] == '':
        cls.skipTest(
            "default_binary_paths is not set for the server {0}".format(
                cls.server['name']
            )
        )

        from pgadmin.utils import does_utility_exist
        binary_path = os.path.join(
            cls.server['default_binary_paths'][cls.server['type']],
            utility_name
        )
        ret_val = does_utility_exist(binary_path)
        if ret_val is not None:
            cls.skipTest(ret_val)


def get_driver_version():
    version = getattr(psycopg2, '__version__', None)
    return version


def is_coverage_enabled(args):
    """
    This function checks for coverage args exists in command line args
    :return: boolean
    """
    if "coverage" in args and args["coverage"]:
        return True
    return False


def print_and_store_coverage_report(cov):
    """
    This function print the coverage report on console and store it in html
    files
    :return: None
    """
    print("\nCoverage Summary:\n", file=sys.stderr)
    cov.report()
    cov_dir = os.path.join(CURRENT_PATH, "covhtml")
    if os.path.exists(cov_dir):
        shutil.rmtree(cov_dir)
    cov.html_report(directory=cov_dir)


def generate_scenarios(key, test_cases):
    """
    This function generates the test case scenarios according to key given
    to it, e.g. key=ADD, key=update etc.
    :param key: for which operation generate the test scenario
    :type key: str
    :param test_cases
    :type test_cases: list
    :return: scenarios
    :rtype: list
    """
    scenarios = []
    for scenario in test_cases[key]:
        test_name = scenario["name"]
        scenario.pop("name")
        tup = (test_name, dict(scenario))
        scenarios.append(tup)
    return scenarios


def assert_status_code(self, response):
    act_res = response.status_code
    exp_res = self.expected_data["status_code"]
    return self.assertEqual(act_res, exp_res)


def assert_error_message(self, response, error_msg=None):
    act_res = response.json["errormsg"]
    if error_msg is not None:
        exp_res = error_msg
    else:
        exp_res = self.expected_data["error_msg"]
    return self.assertEqual(act_res, exp_res)


def create_expected_output(parameters, actual_data):
    """
    This function creates the dict using given parameter and actual data
    :param parameters:
    :param actual_data:
    :return: expected data
    :type: dict
    """
    expected_output = {}

    for key in parameters:
        for value in actual_data:
            expected_output[key] = value
            actual_data.remove(value)
            break
    return expected_output


def is_parallel_ui_tests(args):
    """
    This function checks for coverage args exists in command line args
    :return: boolean
    """
    if "parallel" in args and args["parallel"]:
        return True
    return False


def get_selenium_grid_status_and_browser_list(selenoid_url, arguments):
    """
    This function checks selenoid status for given url
    :param selrnoid_url:
    :return: status of selenoid & list of browsers available with selenoid if
    status is up
    """
    selenoid_status = False
    browser_list = []
    try:
        selenoid_status = get_selenium_grid_status_json(selenoid_url)
        if selenoid_status:
            # Get available browsers from selenoid
            available_browsers = selenoid_status["browsers"]
            list_of_browsers = get_selenoid_browsers_list(arguments)
            for browser in list_of_browsers:
                if browser["name"].lower() in available_browsers.keys():
                    versions = available_browsers[(browser["name"].lower())]
                    if browser["version"] is None:
                        print("Specified version of browser is None. Hence "
                              "latest version of {0} available with selenoid "
                              "server will be used.\n".format(browser["name"]),
                              file=sys.stderr)
                        browser_list.append(browser)
                    elif browser["version"] in versions.keys():
                        browser_list.append(browser)
                    else:
                        print(
                            "Available {0} versions {1}".format(
                                browser["name"], versions.keys()))
                        print("Specified Version = {0}".format(
                            browser["version"]))
                else:
                    print("{0} is NOT available".format(browser["name"]),
                          file=sys.stderr)
    except Exception as e:
        (str(e))
        print("Unable to find Selenoid Status", file=sys.stderr)

    return selenoid_status, browser_list


def is_feature_test_included(arguments):
    """
    :param arguments: his is command line arguments for module name to
    which test suite will run
    :return: boolean value whether to execute feature tests or NOT &
    browser name if feature_test_tobe_included = True
    """
    exclude_pkgs = []
    if arguments['exclude'] is not None:
        exclude_pkgs += arguments['exclude'].split(',')

    feature_test_tobe_included = 'feature_tests' not in exclude_pkgs and \
                                 (arguments['pkg'] is None or arguments[
                                     'pkg'] == "all" or
                                  arguments['pkg'] == "feature_tests")
    return feature_test_tobe_included


def launch_url_in_browser(driver_instance, url, title='pgAdmin 4', timeout=50):
    """
    Function launches urls in specified driver instance
    :param driver_instance:browser instance
    :param url:url to be launched
    :param title:web-page tile on successful launch default is 'pgAdmin 4'
    :param timeout:in seconds for getting specified title default is 20sec
    :return:
    """
    count = timeout / 5
    while count > 0:
        try:
            driver_instance.get(url)
            wait = WebDriverWait(driver_instance, 10)
            wait.until(ec.title_is(title))
            break
        except WebDriverException as e:
            time.sleep(6)
            count -= 1
            if count == 0:
                print(str(e))
                exception_msg = 'Web-page title did not match to {0}. ' \
                                'Waited for {1} seconds Please check url {2}' \
                                ' accessible on internet.'.\
                    format(title, timeout, url)
                raise WebDriverException(exception_msg)


def get_remote_webdriver(hub_url, browser, browser_ver, test_name, url_client):
    """
    This functions returns remote web-driver instance created in selenoid
    machine.
    :param hub_url
    :param browser: browser name
    :param browser_ver: version for browser
    :param test_name: test name
    :return: remote web-driver instance for specified browser
    """
    test_name = time.strftime("%m_%d_%y_%H_%M_%S_", time.localtime()) + \
        test_name.replace(' ', '_') + '_' + browser + browser_ver
    driver_local = None
    desired_capabilities = {
        "version": browser_ver,
        "enableVNC": True,
        "enableVideo": True,
        "enableLog": True,
        "videoName": test_name + ".mp4",
        "logName": test_name + ".log",
        "name": test_name,
        "timeZone": "Asia/Kolkata",
        "sessionTimeout": "180s"
    }

    if browser == 'firefox':
        profile = webdriver.FirefoxProfile()
        profile.set_preference("dom.disable_beforeunload", True)
        desired_capabilities["browserName"] = "firefox"
        desired_capabilities["requireWindowFocus"] = True
        desired_capabilities["enablePersistentHover"] = False
        driver_local = webdriver.Remote(
            command_executor=hub_url,
            desired_capabilities=desired_capabilities, browser_profile=profile)
    elif browser == 'chrome':
        options = Options()
        options.add_argument("--window-size=1280,1024")
        options.add_argument(
            '--unsafely-treat-insecure-origin-as-secure=' + url_client)
        desired_capabilities["browserName"] = "chrome"
        driver_local = webdriver.Remote(
            command_executor=hub_url,
            desired_capabilities=desired_capabilities, options=options)
    else:
        print("Specified browser does not exist.")

    # maximize browser window
    driver_local.maximize_window()

    # driver_local.implicitly_wait(2)
    return driver_local


def get_parallel_sequential_module_list(module_list):
    """
    Functions segregate parallel & sequential modules
    :param module_list: Complete list of modules
    :return: parallel & sequential module lists
    """
    # list of files consisting tests that needs to be
    # executed sequentially
    sequential_tests_file = [
        'regression.feature_tests.pg_utilities_backup_restore_test',
        'regression.feature_tests.pg_utilities_maintenance_test']

    #  list of tests can be executed in parallel
    parallel_tests = list(module_list)
    for module in module_list:
        if str(module[0]) in sequential_tests_file:
            parallel_tests.remove(module)

    #  list of tests can be executed in sequentially
    sequential_tests = [i for i in module_list if i not in parallel_tests]

    # return parallel & sequential lists
    return parallel_tests, sequential_tests


def get_browser_details(browser_info_dict, url):
    """
    Function extracts browser name & version from browser info dict
    in test_config.json
    :param browser_info_dict:
    :return: browser name & version
    """
    browser_name = browser_info_dict["name"].lower()
    browser_version = browser_info_dict["version"]
    if browser_version is None:
        selenoid_status = get_selenium_grid_status_json(url)
        versions = selenoid_status["browsers"][browser_name]
        browser_version = max(versions)
    return browser_name, browser_version


def print_test_summary(complete_module_list, parallel_testlist,
                       sequential_tests_list, browser_name, browser_version):
    """
    Prints test summary about total, parallel, sequential, browser name,
    browser version information
    :param complete_module_list:
    :param parallel_testlist:
    :param sequential_tests_list:
    :param browser_name:
    :param browser_version:
    """
    print(
        "=================================================================",
        file=sys.stderr
    )
    print(
        "Total Tests # {0}\nParallel Tests # {1}, "
        "Sequential Tests # {2}".format(
            len(complete_module_list), len(parallel_testlist),
            len(sequential_tests_list)),
        file=sys.stderr)
    print("Browser: [Name:{0}, Version: {1}]".format(
        browser_name.capitalize(), browser_version),
        file=sys.stderr)
    print(
        "=================================================================\n",
        file=sys.stderr
    )


def get_selenium_grid_status_json(selenoid_url):
    """
    Functions returns json response received from selenoid server
    :param selenoid_url:
    :return:
    """
    try:
        selenoid_status = urlopen(
            "http://" + re.split('/', (re.split('//', selenoid_url, 1)[1]))[
                0] + "/status", timeout=10)
        selenoid_status = json.load(selenoid_status)
        if isinstance(selenoid_status, dict):
            return selenoid_status
    except Exception:
        print("Unable to find Selenoid Status.Kindly check url passed -'{0}'."
              "Check parsing errors in test_config.json".format(selenoid_url))
        return None


def quit_webdriver(driver):
    """
    Function closes webdriver instance
    :param driver:
    """
    try:
        driver.quit()
    except selenium.common.exceptions.InvalidSessionIdException:
        print("Driver object is already closed.")
    except Exception as e:
        print("Some Other exception occurred.")
        traceback.print_exc(file=sys.stderr)
        print(str(e))


def delete_server(tester, server_information=None):
    """ This function use to delete test server """
    try:
        parent_node_dict = regression.parent_node_dict
        test_servers = parent_node_dict["server"]
        test_table_spaces = regression.node_info_dict["tsid"]
        for server in test_servers:
            if server["server_id"] == server_information['server_id']:
                srv_id = server["server_id"]
                servers_dict = server["server"]

                # Delete databases and roles
                delete_database(srv_id, servers_dict)
                delete_roles(srv_id, servers_dict)

                for tablespace in test_table_spaces:
                    if tablespace['server_id'] == srv_id:
                        connection = get_db_connection(
                            servers_dict['db'],
                            servers_dict['username'],
                            servers_dict['db_password'],
                            servers_dict['host'],
                            servers_dict['port'],
                            servers_dict['sslmode']
                        )
                        # Delete tablespace
                        regression.tablespace_utils.delete_tablespace(
                            connection, tablespace["tablespace_name"]
                        )
                        print(
                            "Deleted Tablepace  {0}".format(
                                tablespace["tablespace_name"]),
                            file=sys.stderr)

                # Delete server
                delete_server_with_api(tester, srv_id)
                print("Deleted Database, Roles, Tablespace for {0}".format(
                    servers_dict['name']), file=sys.stderr)
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def delete_database(server_id, servers_dict):
    """This function will delete all the databases from the server"""
    parent_node_dict = regression.parent_node_dict
    test_databases = parent_node_dict["database"]
    deleted_db = []
    for database in test_databases:
        if database['server_id'] == server_id:
            connection = get_db_connection(
                servers_dict['db'],
                servers_dict['username'],
                servers_dict['db_password'],
                servers_dict['host'],
                servers_dict['port'],
                servers_dict['sslmode']
            )
            # Drop database
            drop_database(connection, database["db_name"])
            deleted_db.append(database)

    if len(deleted_db) > 0:
        print("Deleted DB  {0}".format(deleted_db),
              file=sys.stderr)
        for ele in deleted_db:
            regression.parent_node_dict["database"].remove(ele)


def delete_roles(server_id, servers_dict):
    test_roles = regression.node_info_dict["lrid"]
    deleted_roles = []
    for role in test_roles:
        if role['server_id'] == server_id:
            connection = get_db_connection(
                servers_dict['db'],
                servers_dict['username'],
                servers_dict['db_password'],
                servers_dict['host'],
                servers_dict['port'],
                servers_dict['sslmode']
            )
            # Delete role
            regression.roles_utils.delete_role(
                connection, role["role_name"]
            )
            deleted_roles.append(role)

    if len(deleted_roles) > 0:
        print("Deleted Roles  {0}".format(deleted_roles),
              file=sys.stderr)
        for ele in deleted_roles:
            regression.node_info_dict["lrid"].remove(ele)


def get_selenoid_browsers_list(arguments):
    """This function will return the list of all the browsers from selenoid"""
    if 'default_browser' in arguments and \
            arguments['default_browser'] is not None:
        default_browser = arguments['default_browser'].lower()
        list_of_browsers = [{"name": default_browser,
                             "version": None}]
    else:
        list_of_browsers = test_setup.config_data['selenoid_config'][
            'browsers_list']
    return list_of_browsers


def login_using_user_account(tester):
    """
    This function login the test client username and password
    :param tester: test client
    :type tester: flask test client object
    :return: None
    """
    username = tester.test_config_data['login_username']
    password = tester.test_config_data['login_password']
    response = tester.login(username, password)

    if response.status_code != 302:
        print("Unable to login test client, email and password not found.",
              file=sys.stderr)
        sys.exit(1)


def logout_tester_account(tester):
    """
    This function logout the test account
    :param tester: test client
    :type tester: flask test client object
    :return: None
    """
    tester.logout()


def create_user(user_details):
    try:
        conn = sqlite3.connect(config.TEST_SQLITE_PATH)
        # Create the server
        cur = conn.cursor()
        user_details = (
            user_details['login_username'], user_details['login_username'],
            user_details['login_password'], 1, uuid.uuid4().hex)

        cur.execute(
            'select * from user where username = "%s"' % user_details[0])
        user = cur.fetchone()
        if user is None:
            cur.execute('INSERT INTO user (username, email, password, active,'
                        ' fs_uniquifier) VALUES (?,?,?,?,?)', user_details)
            user_id = cur.lastrowid
            conn.commit()
        else:
            user_id = user[0]
        conn.close()

        return user_id
    except Exception as exception:
        traceback.print_exc(file=sys.stderr)
        raise "Error while creating server. %s" % exception


def get_test_user(self, user_details,
                  is_api=True, create_conn=True):
    if user_details is None:
        return None, None

    if is_api is True:

        # Create test_client for this user, and login through it.
        test_client = self.app.test_client()
        user = create_user(user_details)
        if user is not None:
            test_client.test_config_data = dict({
                "login_username": user_details['login_username'],
                "login_password": user_details['login_password']
            })
        else:
            return "User not created"
        login_using_user_account(test_client)
        user = test_client

    return user


def create_user_wise_test_client(user):
    """
    This function creates new test client and execute the test cases.
    :return: None
    """

    def multi_user_decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            main_tester = self.__class__.tester
            try:
                # Login with non-admin_user
                test_user = get_test_user(self, user)
                self.setTestClient(test_user)

                # Call 'runTest' with new test client
                func(self, *args, **kwargs)
            finally:
                # Restore the original user and driver
                self.__class__.tester = main_tester

        return wrapper

    return multi_user_decorator


def create_users_for_parallel_tests(tester):
    """
    Function creates user using /user api
    @param tester: test client
    @return: uer details dict
    """
    login_username = 'ui_test_user' + str(secrets.choice(range(1000, 9999))) +\
                     '@edb.com'
    user_details = {'login_username': login_username,
                    'login_password': 'adminedb'}

    user_data = dict()
    user_data['added'] = [{'username': user_details['login_username'],
                           'email': user_details['login_username'],
                           'newPassword': user_details['login_password'],
                           'confirmPassword': user_details['login_password'],
                           'active': True,
                           'role': "1"}]
    tester.post('/user_management/save', data=json.dumps(user_data))

    response = tester.get('/user_management/user/')
    user_res = json.loads(response.data.decode('utf-8'))
    for item in user_res:
        if item['email'] == login_username:
            user_details['user_id'] = item['id']
    return user_details


def module_patch(*args):
    """
    This is a helper function responsible to import a function inside
    a module with the same name

    e.g. user_info module has user_info function in it.

    :param args:
    :return:
    """

    target = args[0]
    components = target.split('.')
    from unittest import mock
    for i in range(len(components), 0, -1):
        try:
            # attempt to import the module
            imported = importlib.import_module('.'.join(components[:i]))

            # module was imported, let's use it in the patch
            patch = mock.patch(*args)
            patch.getter = lambda: imported
            patch.attribute = '.'.join(components[i:])
            return patch
        except Exception:
            pass

    # did not find a module, just return the default mock
    return mock.patch(*args)
