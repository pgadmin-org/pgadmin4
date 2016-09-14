# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
from __future__ import print_function

import os
import sys
import psycopg2
import sqlite3
import config

import test_setup
import regression

SERVER_GROUP = test_setup.config_data['server_group']


def get_db_connection(db, username, password, host, port):
    """This function retruns the connection object of psycopg"""
    connection = psycopg2.connect(database=db,
                                  user=username,
                                  password=password,
                                  host=host,
                                  port=port)
    return connection


def get_node_info_dict():
    return regression.node_info_dict


def login_tester_account(tester):
    """
    This function login the test client using env variables email and password
    :param tester: test client
    :type tester: flask test client object
    :return: None
    """
    if os.environ['PGADMIN_SETUP_EMAIL'] and os.environ[
        'PGADMIN_SETUP_PASSWORD']:
        email = os.environ['PGADMIN_SETUP_EMAIL']
        password = os.environ['PGADMIN_SETUP_PASSWORD']
        tester.post('/login', data=dict(email=email, password=password),
                    follow_redirects=True)
    else:
        print("Unable to login test client, email and password not found.",
              file=sys.stderr)
        drop_objects()
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
        data = {"name": srv['name'],
                "comment": "",
                "host": srv['host'],
                "port": srv['db_port'],
                "db": srv['maintenance_db'],
                "username": srv['db_username'],
                "db_password": srv['db_password'],
                "role": "",
                "sslmode": srv['sslmode'],
                "tablespace_path": srv['tablespace_path']}
        server_data.append(data)
    return server_data


def write_node_info(node_id, key, node_info=None):
    """
    This function append the node details to
    :param node_id: node id
    :type node_id: int
    :param key: dict key name to store node info
    :type key: str
    :param node_info: node details
    :type node_info: dict
    :return: node_info_dict
    :rtype: dict
    """
    node_info_dict = regression.node_info_dict
    if node_info_dict:
        if key in node_info_dict and node_info_dict[key]:
            node_info_dict[key].append({node_id: node_info})
        else:
            node_info_dict[key] = [{node_id: node_info}]
    else:
        raise Exception("node_info_dict is null.")


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
        pg_cursor.execute("CREATE DATABASE %s" % db_name)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()

        # Get 'oid' from newly created database
        pg_cursor.execute(
            "SELECT db.oid from pg_database db WHERE db.datname='%s'" %
            db_name)
        oid = pg_cursor.fetchone()
        db_id = ''
        if oid:
            db_id = oid[0]
        connection.close()
        return db_id
    except Exception as exception:
        raise Exception("Error while creating database. %s" % exception)


def drop_database(connection, db_name):
    """This function used to drop the database"""
    try:
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute('''DROP DATABASE "%s"''' % db_name)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        connection.close()
    except Exception as exception:
        raise Exception("Exception while dropping the database. %s" %
                        exception)


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
        return server_id
    except Exception as exception:
        raise Exception("Error while creating server. %s" % exception)


def delete_server(sid):
    """This function used to delete server from SQLite"""
    try:
        conn = sqlite3.connect(config.SQLITE_PATH)
        cur = conn.cursor()
        servers = cur.execute('SELECT * FROM server WHERE id=%s' % sid)
        servers_count = len(servers.fetchall())
        if servers_count:
            cur.execute('DELETE FROM server WHERE id=%s' % sid)
            conn.commit()
        else:
            print("No servers found to delete.", file=sys.stderr)
    except Exception as err:
        raise Exception("Error while deleting server %s" % err)


def create_test_server(server):
    """
    This function create the test server which will act as parent server,
    the other node will add under this server
    :param server: server details
    :type server: dict
    :return: None
    """
    # Create the server
    server_id = create_server(server)

    # Create test database
    test_db_name = "test_db"
    db_id = create_database(server, test_db_name)

    # Add server info to test_server_dict
    regression.test_server_dict["server"].append({"server_id": server_id,
                                                  "server": server})
    regression.test_server_dict["database"].append({"server_id": server_id,
                                                    "db_id": db_id,
                                                    "db_name": test_db_name})


def delete_test_server(server):
    test_server_dict = regression.test_server_dict
    if test_server_dict:
        connection = get_db_connection(server['db'],
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'])
        db_name = test_server_dict["database"][0]["db_name"]
        drop_database(connection, db_name)
        # Delete the server
        server_id = test_server_dict['server'][0]["server_id"]
        conn = sqlite3.connect(config.SQLITE_PATH)
        cur = conn.cursor()
        servers = cur.execute('SELECT * FROM server WHERE id=%s' % server_id)
        servers_count = len(servers.fetchall())
        if servers_count:
            cur.execute('DELETE FROM server WHERE id=%s' % server_id)
            conn.commit()
            conn.close()
            server_dict = regression.test_server_dict["server"]

            # Pop the server from dict if it's deleted
            server_dict = [server_dict.pop(server_dict.index(item))
                           for item in server_dict
                           if str(server_id) == str(item["server_id"])]

            # Pop the db from dict if it's deleted
            db_dict = regression.test_server_dict["database"]
            db_dict = [db_dict.pop(db_dict.index(item)) for item in db_dict
                       if server_id == item["server_id"]]


def drop_objects():
    """This function use to cleanup the created the objects(servers, databases,
     schemas etc) during the test suite run"""

    # Cleanup in node_info_dict
    servers_info = regression.node_info_dict['sid']
    if servers_info:
        for server in servers_info:
            server_id = server.keys()[0]
            server = server.values()[0]
            if regression.node_info_dict['did']:
                db_conn = get_db_connection(server['db'],
                                            server['username'],
                                            server['db_password'],
                                            server['host'],
                                            server['port'])
                db_dict = regression.node_info_dict['did'][0]
                if int(server_id) in db_dict:
                    db_name = db_dict[int(server_id)]["db_name"]
                    drop_database(db_conn, db_name)
            delete_server(server_id)

    # Cleanup in test_server_dict
    servers = regression.test_server_dict["server"]
    if servers:
        for server in servers:
            server_id = server["server_id"]
            server = server["server"]
            if regression.test_server_dict["database"]:
                db_info = regression.test_server_dict["database"]
                db_dict = [item for item in db_info
                           if server_id == item["server_id"]]
                if db_dict:
                    for db in db_dict:
                        db_name = db["db_name"]
                        db_conn = get_db_connection(server['db'],
                                                    server['username'],
                                                    server['db_password'],
                                                    server['host'],
                                                    server['port'])
                        drop_database(db_conn, db_name)
            delete_server(server_id)

    # Remove the test SQLite database
    if os.path.isfile(config.SQLITE_PATH):
        os.remove(config.SQLITE_PATH)
