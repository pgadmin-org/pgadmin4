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
import json
import uuid

from test_setup import config_data, advanced_config_data, \
    pickle_path

SERVER_URL = '/browser/server/obj/'
SERVER_CONNECT_URL = 'browser/server/connect/'
DATABASE_URL = '/browser/database/obj/'
DATABASE_CONNECT_URL = 'browser/database/connect/'


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


def verify_database(tester, server_group, server_id, db_id):
    """
    This function verifies that database is exists and whether it connect
    successfully or not

    :param tester: test client
    :type tester: flask test client object
    :param server_group: server group id
    :type server_group: int
    :param server_id: server id
    :type server_id: str
    :param db_id: database id
    :type db_id: str
    :return: temp_db_con
    :rtype: list
    """

    # Connect to server
    response = tester.post('{0}{1}/{2}'.format(
        SERVER_CONNECT_URL, server_group, server_id), data=dict(
        password=config_data['test_server_credentials'][0][
            'test_db_password']),
        follow_redirects=True)

    # Connect to database
    con_response = tester.post('{0}{1}/{2}/{3}'.format(
        DATABASE_CONNECT_URL, server_group, server_id, db_id),
        follow_redirects=True)
    temp_db_con = json.loads(con_response.data.decode('utf-8'))

    return temp_db_con


def test_getnodes(tester=None):
    # Connect to server and database.

    if not tester:
        return None

    all_id = get_ids()

    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    srv_grp = config_data['test_server_group']

    db_con = []
    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        db_con.append(verify_database(tester, srv_grp, server_id, db_id))
    return db_con


def get_db_data(server_connect_data):
    """
    This function is used to get advance config test data for appropriate
    server

    :param server_connect_data: list of server details
    :return data: database details
    :rtype: dict
    """

    adv_config_data = None
    data = None
    db_user = server_connect_data['data']['user']['name']

    # Get the config data of appropriate db user
    for config_test_data in advanced_config_data['test_add_database_data']:
        if db_user == config_test_data['test_owner']:
            adv_config_data = config_test_data

    if adv_config_data is not None:
        data = {
            "datacl": adv_config_data['test_privileges_acl'],
            "datconnlimit": adv_config_data['test_conn_limit'],
            "datowner": adv_config_data['test_owner'],
            "deffuncacl": adv_config_data['test_fun_acl'],
            "defseqacl": adv_config_data['test_seq_acl'],
            "deftblacl": adv_config_data['test_tbl_acl'],
            "deftypeacl": adv_config_data['test_type_acl'],
            "encoding": adv_config_data['test_encoding'],
            "name": str(uuid.uuid4())[1:8],
            "privileges": adv_config_data['test_privileges'],
            "securities": adv_config_data['test_securities'],
            "variables": adv_config_data['test_variables']
        }

    return data


def login_tester_account(tester):
    """
    This function login the test account using credentials mentioned in
    config file

    :param tester: test client
    :type tester: flask test client object
    :return: None
    """

    email = \
        config_data['pgAdmin4_login_credentials']['test_login_username']
    password = \
        config_data['pgAdmin4_login_credentials']['test_login_password']
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


def get_config_data():
    """
    This function get the data related to server group and database
    like db name, host, port and username etc.

    :return: server_group, db_data, pickle_id_dict
    :rtype: server_group:dict, db_data:list, pickle_id_dict:dict
    """

    db_data = []

    pickle_id_dict = {
        "sid": [],  # server
        "did": []  # database
    }

    server_group = config_data['test_server_group']

    for srv in config_data['test_server_credentials']:
        data = {"name": srv['test_name'],
                "comment": "",
                "host": srv['test_host'],
                "port": srv['test_db_port'],
                "db": srv['test_maintenance_db'],
                "username": srv['test_db_username'],
                "role": "",
                "sslmode": srv['test_sslmode']}
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

    pickle_id_dict["sid"].append(server_id)
    output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, output)
    output.close()


def write_db_parent_id(response_data):
    """
    This function writes the server and database related data like server
    name, server id , database name, database id etc.

    :param response_data: server and databases details
    :type response_data: dict
    :return: None
    """

    db_id = response_data['node']['_id']
    server_id = response_data['node']['_pid']
    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
        if 'did' in pickle_id_dict:
            if pickle_id_dict['did']:
                # Add the db_id as value in dict
                pickle_id_dict["did"][0].update({server_id: db_id})
            else:
                # Create new dict with server_id and db_id
                pickle_id_dict["did"].append({server_id: db_id})
        db_output = open(pickle_path, 'wb')
        pickle.dump(pickle_id_dict, db_output)
        db_output.close()


def delete_parent_id_file():
    """
    This function deletes the file parent_id.pkl which contains server and
    database details

    :return: None
    """

    if os.path.isfile(pickle_path):
        os.remove(pickle_path)


def add_server(tester):
    """
    This function add the server in the existing server group

    :param tester: test object
    :type tester: flask test object
    :return:None
    """

    server_group, db_data, pickle_id_dict = get_config_data()
    url = "{0}{1}/".format(SERVER_URL, server_group)
    for db_detail in db_data:
        response = tester.post(url, data=json.dumps(db_detail),
                               content_type='html/json')
        response_data = json.loads(response.data.decode())
        write_parent_id(response_data, pickle_id_dict)


def get_server(tester):
    """
    This function gets the added serer details

    :param tester: test client object
    :type tester: flask test object
    :return: response_data
    :rtype: list
    """

    all_id = get_ids()
    server_ids = all_id["sid"]
    server_group = config_data['test_server_group']
    for server_id in server_ids:
        response = tester.get(SERVER_URL + str(server_group) + '/' +
                              str(server_id),
                              follow_redirects=True)
        response_data = json.loads(response.data.decode())


def connect_server(tester):
    """
    This function used to connect added server

    :param tester:test client object
    :type tester: flask test object
    :return: server_connect, server_group, server_id
    :rtype: server_connect:dict, server_group:dict, server_id:str
    """

    server_connect = []
    servers = []

    srv_id = get_ids()
    server_ids = srv_id["sid"]
    server_group = config_data['test_server_group']

    # Connect to all servers
    for server_id in server_ids:
        response = tester.post(SERVER_CONNECT_URL + str(server_group) +
                               '/' + server_id,
                               data=dict(
                                   password=config_data
                                   ['test_server_credentials'][0]
                                   ['test_db_password']),
                               follow_redirects=True)
        server_connect_detail = json.loads(response.data.decode())
        connect_database(tester, server_connect_detail, server_id,
                         server_group)
        server_connect.append(server_connect_detail)
        servers.append(server_id)
    return server_connect, server_group, servers


def connect_database(tester, server_connect, server_id, server_group):
    """
    This function is used to connect database and writes it's details to
    file 'parent_id.pkl'

    :param tester: test client object
    :type tester: flask test client object
    :param server_connect: server's data
    :type server_connect: dict
    :param server_id: server id
    :type server_id: str
    :param server_group: server group name
    :type server_group: str
    :return: None
    """

    if server_connect['data']['connected']:
        db_data = get_db_data(server_connect)
        db_response = tester.post(
            DATABASE_URL + str(server_group) + "/" + server_id + "/",
            data=json.dumps(db_data),
            content_type='html/json')
        response_data = json.loads(db_response.data.decode())
        write_db_parent_id(response_data)


def delete_server(tester):
    """
    This function used to delete the added servers

    :param tester: test client object
    :return: None
    """

    srv_grp = config_data['test_server_group']
    all_id = get_ids()
    server_ids = all_id["sid"]
    url = SERVER_URL + str(srv_grp) + "/"

    # Call api to delete the servers
    for server_id in server_ids:
        response = tester.delete(url + str(server_id))
        assert response.status_code == 200
        response_data = json.loads(response.data.decode())
        assert response_data['success'] == 1


def delete_database(tester):
    """
    This function used to delete the added databases

    :param tester: test client object
    :return: None
    """

    srv_grp = config_data['test_server_group']
    all_id = get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id['did'][0]

    db_con = test_getnodes(tester)
    if len(db_con) == 0:
        raise Exception("No database(s) to delete.")

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        response = tester.delete(DATABASE_URL + str(srv_grp) + '/' +
                                 str(server_id) + '/' + str(db_id),
                                 follow_redirects=True)
        assert response.status_code == 200
        response_data = json.loads(response.data.decode('utf-8'))
        assert response_data['success'] == 1
