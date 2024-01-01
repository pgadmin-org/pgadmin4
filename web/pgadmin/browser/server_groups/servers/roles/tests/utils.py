##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import os
import sys
import uuid
import json

from regression.python_test_utils import test_utils as utils

ROLE_URL = '/browser/role/obj/'
file_name = os.path.basename(__file__)

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/role_test_data.json") as data_file:
    test_cases = json.load(data_file)


def verify_role(server, role_name):
    """
    This function calls the GET API for role to verify
    :param server: server details
    :type server: dict
    :param role_name: role name
    :type role_name: str
    :return role: role record from db
    :rtype role: dict
    """
    try:
        connection = utils.get_db_connection(server['db'],
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT * from pg_catalog.pg_roles pr WHERE pr.rolname='%s'" %
            role_name)
        connection.commit()
        role = pg_cursor.fetchone()
        connection.close()
        return role
    except Exception as exception:
        exception = "Error while getting role: %s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)


def test_getrole(tester):
    if not tester:
        return None

    all_id = utils.get_ids()

    server_ids = all_id["sid"]
    role_ids_dict = all_id["lrid"][0]

    role_response_data = []
    for server_id in server_ids:
        role_id = role_ids_dict[int(server_id)]
        role_response_data.append(
            verify_role(server_id, role_id))
    return role_response_data


def get_role_data(lr_pwd):
    """This function returns the role data"""
    data = {
        "rolcanlogin": "true",
        "rolconnlimit": -1,
        "rolcreaterole": "true",
        "rolinherit": "true",
        "rolmembership": [],
        "rolname": "test_role_%s" % str(uuid.uuid4())[1:8],
        "rolpassword": lr_pwd,
        "rolvaliduntil": "12/27/2017",
        "seclabels": [],
        "variables": [{"name": "work_mem",
                       "database": "postgres",
                       "value": 65}]
    }
    return data


def create_role(server, role_name):
    """
    This function create the role.
    :param server:
    :param role_name:
    :return:
    """
    try:
        connection = utils.get_db_connection(server['db'],
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("CREATE ROLE %s LOGIN" % role_name)
        connection.commit()
        # Get 'oid' from newly created tablespace
        pg_cursor.execute(
            "SELECT pr.oid from pg_catalog.pg_roles pr WHERE pr.rolname='%s'" %
            role_name)
        oid = pg_cursor.fetchone()
        role_id = ''
        if oid:
            role_id = oid[0]
        connection.close()
        return role_id
    except Exception as exception:
        exception = "Error while deleting role: %s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)


def delete_role(connection, role_names):
    """
    This function use to delete the existing roles in the servers

    :param connection: db connection
    :type connection: connection object
    :param role_name: role name
    :type role_name: str
    :return: None
    """
    if not isinstance(role_names, list):
        role_names = [role_names]

    try:
        for role_name in role_names:
            pg_cursor = connection.cursor()
            pg_cursor.execute(
                "SELECT * FROM pg_catalog.pg_roles WHERE rolname='%s'" %
                role_name)
            role_count = pg_cursor.fetchone()
            if role_count:
                old_isolation_level = connection.isolation_level
                utils.set_isolation_level(connection, 0)
                pg_cursor = connection.cursor()
                pg_cursor.execute("DROP ROLE %s" % role_name)
                utils.set_isolation_level(connection, old_isolation_level)
                connection.commit()
        connection.close()
    except Exception as exception:
        exception = "Error while deleting role: %s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)


def create_role_with_password(server, role_name, role_password):
    """
     This function create the role.
     :param server:
     :param role_name:
     :param role_password:
     :return:
     """
    try:
        connection = utils.get_db_connection(server['db'],
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "CREATE ROLE %s LOGIN PASSWORD '%s'" % (role_name, role_password))
        connection.commit()
        # Get 'oid' from newly created tablespace
        pg_cursor.execute(
            "SELECT pr.oid from pg_catalog.pg_roles pr WHERE pr.rolname='%s'" %
            role_name)
        oid = pg_cursor.fetchone()
        role_id = ''
        if oid:
            role_id = oid[0]
        connection.close()
        return role_id
    except Exception as exception:
        exception = "Error while deleting role: %s: line:%s %s" % (
            file_name, sys.exc_traceback.tb_lineno, exception)
        print(exception, file=sys.stderr)
