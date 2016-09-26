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
import uuid
import psycopg2
import sqlite3
from functools import partial

import config
import test_setup
import regression

SERVER_GROUP = test_setup.config_data['server_group']
file_name = os.path.basename(__file__)


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
    if os.environ['PGADMIN_SETUP_EMAIL'] and\
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
        exception = "Error while creating database: %s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)


def drop_database(connection, database_name):
    """This function used to drop the database"""

    try:
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * FROM pg_database db WHERE db.datname='%s'"
                          % database_name)
        if pg_cursor.fetchall():
            # Release pid if any process using database
            pg_cursor.execute("select pg_terminate_backend(pid) from"
                              " pg_stat_activity where datname='%s'" %
                              database_name)
            old_isolation_level = connection.isolation_level
            connection.set_isolation_level(0)
            pg_cursor.execute('''DROP DATABASE "%s"''' % database_name)
            connection.set_isolation_level(old_isolation_level)
            connection.commit()
            connection.close()
    except Exception as exception:
        exception = "%s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)


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


def delete_server(tester, sid):
    """This function used to delete server from SQLite"""
    try:
        url = '/browser/server/obj/' + str(SERVER_GROUP) + "/"
        # Call API to delete the server
        response = tester.delete(url + str(sid))
    except Exception as exception:
        exception = "%s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)


def delete_server_from_sqlite(sid):
    """This function used to delete server from SQLite"""
    try:
        con = sqlite3.connect(config.SQLITE_PATH)
        cur = con.cursor()
        server_objects = cur.execute('SELECT * FROM server WHERE id=%s' % sid)
        ss = server_objects.fetchall()
        # for i in ss:
        #     print(">>>>>>>>>>>", i)
        servers_count = len(ss)
        # print(">>>>>>>", sid)
        if servers_count:
            cur.execute('DELETE FROM server WHERE id=%s' % sid)
            con.commit()
        con.close()
    except Exception as exception:
        exception = "%s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)


def create_test_server(server_info):
    """
    This function create the test server which will act as parent server,
    the other node will add under this server
    :param server_info: server details
    :type server_info: dict
    :return: None
    """
    # Create the server
    srv_id = create_server(server_info)

    # Create test database
    test_db_name = "test_db_%s" % str(uuid.uuid4())[1:8]
    db_id = create_database(server_info, test_db_name)

    # Add server info to test_server_dict
    regression.test_server_dict["server"].append({"server_id": srv_id,
                                                  "server": server_info})
    regression.test_server_dict["database"].append({"server_id": srv_id,
                                                    "db_id": db_id,
                                                    "db_name": test_db_name})


def delete_test_server(tester):
    test_server_dict = regression.test_server_dict
    test_servers = test_server_dict["server"]
    test_databases = test_server_dict["database"]
    test_table_spaces = test_server_dict["tablespace"]
    try:
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
            # Delete server
            delete_server(tester, srv_id)
    except Exception as exception:
        exception = "Exception: %s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)

    # Clear test_server_dict
    for item in regression.test_server_dict:
        del regression.test_server_dict[item][:]


def remove_db_file():
    """This function use to remove SQLite DB file"""
    if os.path.isfile(config.SQLITE_PATH):
        os.remove(config.SQLITE_PATH)


def _drop_objects(tester):
    """This function use to cleanup the created the objects(servers, databases,
     schemas etc) during the test suite run"""
    try:
        conn = sqlite3.connect(config.SQLITE_PATH)
        cur = conn.cursor()
        servers = cur.execute('SELECT name, host, port, maintenance_db,'
                              ' username, id  FROM server')
        if servers:
            all_servers = servers.fetchall()
            for server_info in all_servers:
                name = server_info[0]
                host = server_info[1]
                db_port = server_info[2]

                config_servers = test_setup.config_data['server_credentials']
                db_password = ''
                # Get the db password from config file for appropriate server
                for srv in config_servers:
                    if (srv['name'], srv['host'], srv['db_port']) == \
                            (name, host, db_port):
                        db_password = srv['db_password']
                if db_password:
                    # Drop database
                    connection = get_db_connection(server_info[3],
                                                   server_info[4],
                                                   db_password,
                                                   server_info[1],
                                                   server_info[2])

                    pg_cursor = connection.cursor()
                    pg_cursor.execute("SELECT db.datname FROM pg_database db")
                    databases = pg_cursor.fetchall()
                    if databases:
                        for db in databases:
                            connection = get_db_connection(server_info[3],
                                                           server_info[4],
                                                           db_password,
                                                           server_info[1],
                                                           server_info[2])
                            # Do not drop the default databases
                            if db[0] not in ["postgres", "template1",
                                             "template0"]:
                                drop_database(connection, db[0])

                    # Delete tablespace
                    connection = get_db_connection(server_info[3],
                                                   server_info[4],
                                                   db_password,
                                                   server_info[1],
                                                   server_info[2])
                    pg_cursor = connection.cursor()
                    pg_cursor.execute("SELECT * FROM pg_tablespace")
                    table_spaces = pg_cursor.fetchall()
                    if table_spaces:
                        for tablespace in table_spaces:
                            # Do not delete default table spaces
                            if tablespace[0] not in ["pg_default",
                                                     "pg_global"]:
                                tablespace_name = tablespace[0]
                                # Delete tablespace
                                connection = get_db_connection(server_info[3],
                                                               server_info[4],
                                                               db_password,
                                                               server_info[1],
                                                               server_info[2])
                                regression.tablespace_utils.delete_tablespace(
                                    connection, tablespace_name)

                    # Delete role
                    connection = get_db_connection(server_info[3],
                                                   server_info[4],
                                                   db_password,
                                                   server_info[1],
                                                   server_info[2])
                    pg_cursor = connection.cursor()
                    pg_cursor.execute("SELECT * FROM pg_catalog.pg_roles")
                    roles = pg_cursor.fetchall()
                    if roles:
                        for role_name in roles:
                            # Do not delete default table spaces
                            if role_name[0] not in ["postgres",
                                                    "enterprisedb"]:
                                role_name = role_name[0]
                                # Delete role
                                regression.roles_utils.delete_role(connection,
                                                                   role_name)

            for server_info in all_servers:
                server_id = server_info[5]
                # Delete server
                try:
                    delete_server(tester, server_id)
                except Exception as exception:
                    exception = "Exception while deleting server: %s:" \
                                " line:%s %s" %\
                                (file_name, sys.exc_traceback.tb_lineno,
                                 exception)
                    print(exception, file=sys.stderr)
                    continue
        conn.close()
    except Exception as exception:
        exception = "Exception: %s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)
    finally:
        # Logout the test client
        logout_tester_account(tester)
        # Remove SQLite db file
        remove_db_file()


def get_cleanup_handler(tester):
    """This function use to bind variable to drop_objects function"""
    return partial(_drop_objects, tester)
