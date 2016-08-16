# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

import os
import pickle

from test_setup import config_data, pickle_path


SERVER_GROUP = config_data['server_group']


def get_pickle_id_dict():
    """This function returns the empty dict of server config data"""

    pickle_id_dict = {
        "sid": [],  # server
        "did": [],  # database
        "lrid": [],  # role
        "tsid": [],  # tablespace
        "scid": [],  # schema
        "tfnid": [],  # trigger functions
        "coid": []  # collation
    }
    return pickle_id_dict


def get_ids(url=pickle_path):
    """
    This function read the parent node's id and return it

    :param url: file path from which it will red the ids
    :type url: str
    :return: node ids
    :rtype: dict
    """

    output = open(url, 'rb')
    ids = pickle.load(output)
    output.close()
    return ids


# def test_getnodes(tester=None):
#     # Connect to server and database.
#
#     if not tester:
#         return None
#
#     all_id = get_ids()
#
#     server_ids = all_id["sid"]
#     db_ids_dict = all_id["did"][0]
#
#     db_con = []
#     for server_id in server_ids:
#         db_id = db_ids_dict[int(server_id)]
#         db_con.append(verify_database(tester, SERVER_GROUP, server_id, db_id))
#     return db_con


def login_tester_account(tester):
    """
    This function login the test account using credentials mentioned in
    config file

    :param tester: test client
    :type tester: flask test client object
    :return: None
    """

    email = \
        config_data['pgAdmin4_login_credentials']['login_username']
    password = \
        config_data['pgAdmin4_login_credentials']['login_password']
    response = tester.post('/login', data=dict(
        email=email, password=password), follow_redirects=True)


def logout_tester_account(tester):
    """
    This function logout the test account

    :param tester: test client
    :type tester: flask test client object
    :return: None
    """

    response = tester.get('/logout')


# Config data for parent_id.pkl
def get_config_data():
    """
    This function get the data related to server group and database
    like db name, host, port and username etc.

    :return: server_group, db_data, pickle_id_dict
    :rtype: server_group:dict, db_data:list, pickle_id_dict:dict
    """

    db_data = []
    pickle_id_dict = get_pickle_id_dict()
    server_group = config_data['server_group']

    for srv in config_data['server_credentials']:
        data = {"name": srv['name'],
                "comment": "",
                "host": srv['host'],
                "port": srv['db_port'],
                "db": srv['maintenance_db'],
                "username": srv['db_username'],
                "role": "",
                "sslmode": srv['sslmode']}
        db_data.append(data)
    return server_group, db_data, pickle_id_dict


def write_parent_id(response_data, pickle_id_dict):
    """
    This function writes the server's details to file parent_id.pkl

    :param response_data: server's data
    :type response_data: list of dictionary
    :param pickle_id_dict: contains ids of server,database,tables etc.
    :type pickle_id_dict: dict
    :return: None
    """

    server_id = response_data['node']['_id']
    if os.path.isfile(pickle_path):
        existed_server_id = open(pickle_path, 'rb')
        pickle_id_dict = pickle.load(existed_server_id)

    pickle_id_dict["sid"].append(str(server_id))
    output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, output)
    output.close()


def delete_parent_id_file():
    """
    This function deletes the file parent_id.pkl which contains server and
    database details

    :return: None
    """

    if os.path.isfile(pickle_path):
        os.remove(pickle_path)

