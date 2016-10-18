# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
from __future__ import print_function
import traceback
import os
import sys
import uuid
import psycopg2
import sqlite3
from functools import partial

import config
import test_setup
import regression

SERVER_GROUP = test_setup.config_data['server_group']
file_name = os.path.realpath(__file__)


def get_db_connection(db, username, password, host, port):
    """This function returns the connection object of psycopg"""
    connection = psycopg2.connect(database=db,
                                  user=username,
                                  password=password,
                                  host=host,
                                  port=port)
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
        print("Unable to login test client, email and password not found.",
              file=sys.stderr)
        _drop_objects(tester)
        sys.exit(1)


def logout_tester_account(tester):
    """
    This function logout the test account

    :param tester: test client
    :type tester: flask test client object
    :return: None
    """

    response = tester.get('/logout')


def get_config_data():
    """This function reads the server data from config_data"""
    server_data = []
    for srv in test_setup.config_data['server_credentials']:
        if (not srv.has_key('enabled')) or srv['enabled'] == True:
            data = {"name": srv['name'],
                    "comment": srv['comment'],
                    "host": srv['host'],
                    "port": srv['db_port'],
                    "db": srv['maintenance_db'],
                    "username": srv['db_username'],
                    "db_password": srv['db_password'],
                    "role": "",
                    "sslmode": srv['sslmode'],
                    "tablespace_path": srv.get('tablespace_path', None)}
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


def create_database(server, db_name):
    """This function used to create database and returns the database id"""
    try:
        connection = get_db_connection(server['db'],
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute('''CREATE DATABASE "%s" TEMPLATE template0''' % db_name)
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


def drop_database(connection, database_name):
    """This function used to drop the database"""
    if database_name not in ["postgres", "template1", "template0"]:
        pg_cursor = connection.cursor()
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
        conn = sqlite3.connect(config.SQLITE_PATH)
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
        regression.parent_node_dict["server"].append({"server_id": server_id,
                                                      "server": server})

        return server_id
    except Exception as exception:
        raise Exception("Error while creating server. %s" % exception)


def delete_server_with_api(tester, sid):
    """This function used to delete server from SQLite"""
    try:
        url = '/browser/server/obj/' + str(SERVER_GROUP) + "/"
        # Call API to delete the server
        response = tester.delete(url + str(sid))
    except Exception:
        traceback.print_exc(file=sys.stderr)


def add_db_to_parent_node_dict(srv_id, db_id, test_db_name):
    regression.parent_node_dict["database"].append({"server_id": srv_id,
                                                    "db_id": db_id,
                                                    "db_name": test_db_name})


def add_schema_to_parent_node_dict(srv_id, db_id, schema_id, schema_name):
    regression.parent_node_dict["schema"].append({"server_id": srv_id,
                                                  "db_id": db_id,
                                                  "schema_id": schema_id,
                                                  "schema_name": schema_name})


def create_parent_server_node(server_info, node_name):
    """
    This function create the test server which will act as parent server,
    the other node will add under this server
    :param server_info: server details
    :type server_info: dict
    :param node_name: node name
    :type node_name: str
    :return: None
    """
    srv_id = create_server(server_info)
    if node_name == "databases":
        # Create test database
        test_db_name = "test_db_%s" % str(uuid.uuid4())[1:6]
        db_id = create_database(server_info, test_db_name)
        add_db_to_parent_node_dict(srv_id, db_id, test_db_name)
    elif node_name == "schemas":
        test_db_name = "test_db_%s" % str(uuid.uuid4())[1:6]
        db_id = create_database(server_info, test_db_name)
        add_db_to_parent_node_dict(srv_id, db_id, test_db_name)
        # Create schema
        schema_name = "test_schema_%s" % str(uuid.uuid4())[1:6]
        connection = get_db_connection(test_db_name,
                                       server_info['username'],
                                       server_info['db_password'],
                                       server_info['host'],
                                       server_info['port'])

        schema = regression.schema_utils.create_schema(connection, schema_name)
        add_schema_to_parent_node_dict(srv_id, db_id, schema[0],
                                       schema[1])
    elif node_name not in ["servers", "roles", "tablespaces", "browser"]:
        # Create test database
        test_db_name = "test_db_%s" % str(uuid.uuid4())[1:6]
        db_id = create_database(server_info, test_db_name)
        add_db_to_parent_node_dict(srv_id, db_id, test_db_name)
        # Create schema
        schema_name = "test_schema_%s" % str(uuid.uuid4())[1:6]
        connection = get_db_connection(test_db_name,
                                       server_info['username'],
                                       server_info['db_password'],
                                       server_info['host'],
                                       server_info['port'])

        schema = regression.schema_utils.create_schema(connection, schema_name)
        add_schema_to_parent_node_dict(srv_id, db_id, schema[0],
                                       schema[1])


def delete_test_server(tester):
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
                connection = get_db_connection(servers_dict['db'],
                                               servers_dict['username'],
                                               servers_dict['db_password'],
                                               servers_dict['host'],
                                               servers_dict['port'])
                database_name = database["db_name"]
                # Drop database
                drop_database(connection, database_name)
            for role in test_roles:
                connection = get_db_connection(servers_dict['db'],
                                               servers_dict['username'],
                                               servers_dict['db_password'],
                                               servers_dict['host'],
                                               servers_dict['port'])
                # Delete role
                regression.roles_utils.delete_role(connection,
                                                   role["role_name"])
            for tablespace in test_table_spaces:
                connection = get_db_connection(servers_dict['db'],
                                               servers_dict['username'],
                                               servers_dict['db_password'],
                                               servers_dict['host'],
                                               servers_dict['port'])
                # Delete tablespace
                regression.tablespace_utils.delete_tablespace(
                    connection, tablespace["tablespace_name"])
            # Delete server
            delete_server_with_api(tester, srv_id)
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def get_db_password(config_servers, name, host, db_port):
    db_password = ''
    for srv in config_servers:
        if (srv['name'], srv['host'], srv['db_port']) == (name, host, db_port):
            db_password = srv['db_password']
    return db_password


def get_db_server(sid):
    connection = ''
    conn = sqlite3.connect(config.SQLITE_PATH)
    cur = conn.cursor()
    server = cur.execute('SELECT name, host, port, maintenance_db,'
                         ' username FROM server where id=%s' % sid)
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
            connection = get_db_connection(db_name,
                                           username,
                                           db_password,
                                           host,
                                           db_port)
    conn.close()
    return connection


def remove_db_file():
    """This function use to remove SQLite DB file"""
    if os.path.isfile(config.SQLITE_PATH):
        os.remove(config.SQLITE_PATH)


def _drop_objects(tester):
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


def get_cleanup_handler(tester):
    """This function use to bind variable to drop_objects function"""
    return partial(_drop_objects, tester)
