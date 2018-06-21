##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from __future__ import print_function
import traceback
import os
import sys
import uuid
import psycopg2
import sqlite3
from functools import partial
from testtools.testcase import clone_test_with_new_id

import config
import regression
from regression import test_setup

from pgadmin.utils.preferences import Preferences

SERVER_GROUP = test_setup.config_data['server_group']
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
        tester.post('/login', data=dict(email=email, password=password),
                    follow_redirects=True)
    else:
        from regression.runtests import app_starter
        print("Unable to login test client, email and password not found.",
              file=sys.stderr)
        _cleanup(tester, app_starter)
        sys.exit(1)


def logout_tester_account(tester):
    """
    This function logout the test account

    :param tester: test client
    :type tester: flask test client object
    :return: None
    """

    tester.get('/logout')


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
        pg_cursor.execute("SELECT db.oid from pg_database db WHERE"
                          " db.datname='%s'" % db_name)
        oid = pg_cursor.fetchone()
        db_id = ''
        if oid:
            db_id = oid[0]
        connection.close()
        return db_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_table(server, db_name, table_name):
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
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            '''CREATE TABLE "%s" (some_column VARCHAR, value NUMERIC,
            details VARCHAR)''' % table_name)
        pg_cursor.execute(
            '''INSERT INTO "%s" VALUES ('Some-Name', 6, 'some info')'''
            % table_name)
        pg_cursor.execute(
            '''INSERT INTO "%s" VALUES ('Some-Other-Name', 22,
            'some other info')''' % table_name)
        pg_cursor.execute(
            '''INSERT INTO "%s" VALUES ('Yet-Another-Name', 14,
            'cool info')''' % table_name)

        connection.set_isolation_level(old_isolation_level)
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
            ''' % (table_name, constraint_name, constraint_type.upper())
        )

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
        pg_cursor.execute("SELECT * FROM pg_database db WHERE"
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
    pg_cursor.execute("SELECT * FROM pg_tablespace")
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
    try:
        conn = sqlite3.connect(config.TEST_SQLITE_PATH)
        # Create the server
        cur = conn.cursor()
        server_details = (1, SERVER_GROUP, server['name'], server['host'],
                          server['port'], server['db'], server['username'],
                          server['role'], server['sslmode'], server['comment'])
        cur.execute('INSERT INTO server (user_id, servergroup_id, name, host, '
                    'port, maintenance_db, username, role, ssl_mode,'
                    ' comment) VALUES (?,?,?,?,?,?,?,?,?,?)', server_details)
        server_id = cur.lastrowid
        conn.commit()
        # Add server info to parent_node_dict
        regression.parent_node_dict["server"].append(
            {
                "server_id": server_id,
                "server": server
            }
        )

        return server_id
    except Exception as exception:
        raise Exception("Error while creating server. %s" % exception)


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


def add_schema_to_parent_node_dict(srv_id, db_id, schema_id, schema_name):
    """ This function stores the schema details into parent dict """
    server_information = {"server_id": srv_id, "db_id": db_id,
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
    db_id = create_database(server_info, test_db_name)
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
        srv_id, db_id, schema[0], schema[1]
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
        ' username, ssl_mode FROM server where id=%s' % sid
    )
    server = server.fetchone()
    if server:
        name = server[0]
        host = server[1]
        db_port = server[2]
        db_name = server[3]
        username = server[4]
        ssl_mode = server[5]
        config_servers = test_setup.config_data['server_credentials']
        # Get the db password from config file for appropriate server
        db_password = get_db_password(config_servers, name, host, db_port)
        if db_password:
            # Drop database
            connection = get_db_connection(
                db_name, username, db_password, host, db_port, ssl_mode
            )
    conn.close()
    return connection


def set_preference(default_binary_path):
    conn = sqlite3.connect(config.TEST_SQLITE_PATH)
    cur = conn.cursor()

    perf = Preferences.module('paths')
    pg_path_pref = perf.preference('pg_bin_dir')

    user_pref = cur.execute(
        'SELECT pid, uid FROM user_preferences where pid=%s' % pg_path_pref.pid
    )
    user_pref = user_pref.fetchone()

    if user_pref:
        cur.execute('UPDATE user_preferences SET value = ? WHERE pid = ?',
                    (default_binary_path['pg'], pg_path_pref.pid))
    else:
        pg_pref_details = (pg_path_pref.pid, 1,
                           default_binary_path['pg'])
        cur.execute('INSERT INTO user_preferences(pid, uid, value)'
                    ' VALUES (?,?,?)', pg_pref_details)

    ppas_path_pref = perf.preference('ppas_bin_dir')

    user_pref = cur.execute(
        'SELECT pid, uid FROM user_preferences where pid=%s' %
        ppas_path_pref.pid
    )
    user_pref = user_pref.fetchone()

    if user_pref:
        cur.execute('UPDATE user_preferences SET value = ? WHERE pid = ? ',
                    (default_binary_path['ppas'], ppas_path_pref.pid))
    else:
        ppas_pref_details = (ppas_path_pref.pid, 1,
                             default_binary_path['ppas'])
        cur.execute('INSERT INTO user_preferences(pid, uid, value)'
                    ' VALUES (?,?,?)', ppas_pref_details)

    gpdb_path_pref = perf.preference('gpdb_bin_dir')

    user_pref = cur.execute(
        'SELECT pid, uid FROM user_preferences where pid=%s' %
        gpdb_path_pref.pid
    )
    user_pref = user_pref.fetchone()

    if user_pref:
        cur.execute('UPDATE user_preferences SET value = ? WHERE pid = ? ',
                    (default_binary_path['gpdb'], gpdb_path_pref.pid))
    else:
        gpdb_pref_details = (gpdb_path_pref.pid, 1,
                             default_binary_path['gpdb'])
        cur.execute('INSERT INTO user_preferences(pid, uid, value)'
                    ' VALUES (?,?,?)', gpdb_pref_details)

    conn.commit()


def remove_db_file():
    """This function use to remove SQLite DB file"""
    if os.path.isfile(config.TEST_SQLITE_PATH):
        os.remove(config.TEST_SQLITE_PATH)


def _cleanup(tester, app_starter):
    """This function use to cleanup the created the objects(servers, databases,
     schemas etc) during the test suite run"""
    try:
        test_servers = regression.parent_node_dict["server"] + \
            regression.node_info_dict["sid"]
        test_databases = regression.parent_node_dict["database"] + \
            regression.node_info_dict["did"]
        test_table_spaces = regression.parent_node_dict["tablespace"] + \
            regression.node_info_dict["tsid"]
        test_roles = regression.parent_node_dict["role"] + \
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
        logout_tester_account(tester)
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
