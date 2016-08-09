# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

import json
import os
import pickle

from regression import test_utils as utils
from regression.test_setup import pickle_path, config_data

SERVER_URL = '/browser/server/obj/'
SERVER_CONNECT_URL = 'browser/server/connect/'


def write_server_id(response_data, pickle_id_dict):
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


def add_server(tester):
    """
    This function add the server in the existing server group

    :param tester: test object
    :type tester: flask test object
    :return:None
    """

    server_group, db_data, pickle_id_dict = utils.get_config_data()
    url = "{0}{1}/".format(SERVER_URL, server_group)
    for db_detail in db_data:
        response = tester.post(url, data=json.dumps(db_detail),
                               content_type='html/json')
        assert response.status_code == 200
        response_data = json.loads(response.data.decode('utf-8'))
        write_server_id(response_data, pickle_id_dict)


def get_server(tester):
    """
    This function gets the added serer details

    :param tester: test client object
    :type tester: flask test object
    :return: response_data
    :rtype: list
    """

    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    for server_id in server_ids:
        response = tester.get(SERVER_URL + str(utils.SERVER_GROUP) + '/' +
                              str(server_id),
                              follow_redirects=True)
        assert response.status_code == 200


def connect_server(tester):
    """
    This function used to connect added server

    :param tester:test client object
    :type tester: flask test object
    :param add_db_flag: flag for db add test case
    :type add_db_flag: bool
    :return: server_connect, server_group, server_id
    :rtype: server_connect:dict, server_group:dict, server_id:str
    """

    server_connect = []
    servers = []
    server_config = None

    srv_id = utils.get_ids()
    server_ids = srv_id["sid"]

    # Connect to all servers
    for server_id in server_ids:
        response = tester.post(SERVER_CONNECT_URL + str(utils.SERVER_GROUP) +
                               '/' + server_id,
                               data=dict(
                                   password=config_data
                                   ['server_credentials'][0]
                                   ['db_password']),
                               follow_redirects=True)
        server_connect_detail = json.loads(response.data.decode('utf-8'))
        db_user = server_connect_detail['data']['user']['name']
        server_connect_detail['tablespace_path'] = None

        # Get the server config of appropriate db user
        for config in config_data['server_credentials']:
            if db_user == config['db_username']:
                server_config = config

        if "tablespace_path" in server_config:
            server_connect_detail['tablespace_path'] = \
                server_config['tablespace_path']

        server_connect.append(server_connect_detail)
        servers.append(server_id)
    return server_connect, utils.SERVER_GROUP, servers


def verify_server(tester, server_group, server_id):
    """This function verifies that server is connecting or not"""

    response = tester.post(
        '{0}{1}/{2}'.format(SERVER_CONNECT_URL, server_group, server_id),
        data=dict(password=config_data
        ['server_credentials'][0]
        ['db_password']),
        follow_redirects=True)
    srv_connect = json.loads(response.data.decode('utf-8'))
    return srv_connect


def delete_server(tester):
    """
    This function used to delete the added servers

    :param tester: test client object
    :return: None
    """

    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    url = SERVER_URL + str(utils.SERVER_GROUP) + "/"

    if len(server_ids) == 0:
        raise Exception("No server(s) to delete!!!")

    # Call api to delete the servers
    for server_id in server_ids:
        response = tester.delete(url + str(server_id))
        assert response.status_code == 200
        response_data = json.loads(response.data.decode('utf-8'))
        assert response_data['success'] == 1