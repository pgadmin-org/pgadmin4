# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

from __future__ import print_function

import json
import os
import pickle
import uuid
import sys

from regression.test_setup import pickle_path, config_data, \
    advanced_config_data
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from regression import test_utils as utils

TABLE_SPACE_URL = '/browser/tablespace/obj/'


# Tablespace utility
def get_tablespace_data(server_connect):
    """This function returns the tablespace data from config file"""

    adv_config_data = None
    data = None
    db_user = server_connect['data']['user']['name']
    server_config_data = config_data['server_credentials']

    # Get the config data of appropriate db user
    for config_test_data in advanced_config_data['tablespc_credentials']:
        if db_user == config_test_data['spc_user']:
            # Add the tablespace path from server config
            server_config = (item for item in server_config_data if
                             item["db_username"] == db_user).next()
            if "tablespace_path" in server_config:
                config_test_data['spc_location'] = server_config['tablespace_path']
                adv_config_data = config_test_data
            else:
                config_test_data['spc_location'] = None

    if adv_config_data is not None:
        data = {
            "name": str(uuid.uuid4())[1:8],
            "seclabels": adv_config_data["spc_seclable"],
            "spcacl": adv_config_data["spc_acl"],
            "spclocation": adv_config_data["spc_location"],
            "spcoptions": adv_config_data["spc_opts"],
            "spcuser": adv_config_data["spc_user"]
        }
    return data


def write_tablespace_id(response_data):
    """
    This function write the table space id to parent_id.pkl

    :param response_data: create table space API response data
    :type response_data: dict
    :return: None
    """

    table_space_id = response_data['node']['_id']
    server_id = response_data['node']['_pid']
    pickle_id_dict = utils.get_pickle_id_dict()
    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
    if 'tsid' in pickle_id_dict:
        if pickle_id_dict['tsid']:
            # Add the db_id as value in dict
            pickle_id_dict["tsid"][0].update(
                {server_id: table_space_id})
        else:
            # Create new dict with server_id and db_id
            pickle_id_dict["tsid"].append(
                {server_id: table_space_id})
    db_output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, db_output)
    db_output.close()


def add_table_space(tester, server_connect_response, server_group, server_ids):
    """
    This function is used to add the roles to server

    :param tester: flask test client
    :type tester: flask test client object
    :param server_connect_response: server connect API response
    :type server_connect_response: dict
    :param server_group: server group
    :type server_group: int
    :param server_ids: list of server id
    :type server_ids: list
    :return: None
    """

    total_servers_count = len(server_ids)
    servers_without_tablespace_path = []

    for server_connect, server_id in zip(server_connect_response,
                                         server_ids):
        tablespace_path = server_connect['tablespace_path']
        # Skip the test case if tablespace_path does not exist
        if not tablespace_path or tablespace_path is None:
            file_name = os.path.basename(
                sys._getframe().f_back.f_code.co_filename)
            servers_without_tablespace_path.append(server_id)
            if total_servers_count == len(servers_without_tablespace_path):
                print("Skipping tablespaces test cases for the  file <{0}>, "
                      "Tablespace path not configured for the servers: "
                      "{1}".format(file_name, server_ids), file=sys.stderr)
                return
            else:
                print("Skipping tablespaces test case for the file <{0}>: "
                      "Tablespace path not configured for server: {1}".format(
                        file_name, server_id), file=sys.stderr)
                continue

        if server_connect['data']['connected']:
            data = get_tablespace_data(server_connect)
            response = tester.post(TABLE_SPACE_URL + str(server_group) + '/'
                                   + server_id + '/',
                                   data=json.dumps(data),
                                   content_type='html/json')
            assert response.status_code == 200
            response_data = json.loads(response.data.decode('utf-8'))
            write_tablespace_id(response_data)


def verify_table_space(tester, server_group, server_id, tablespace_id):
    """
    This function calls the GET API for role to verify

    :param tester: test client
    :type tester: flask test client object
    :param server_group: server group id
    :type server_group: int
    :param server_id: server id
    :type server_id: str
    :param tablespace_id: table space id
    :type tablespace_id: int
    :return: dict/None
    """

    srv_connect = server_utils.verify_server(tester, server_group, server_id)
    if srv_connect['data']['connected']:
        response = tester.get(
            '{0}{1}/{2}/{3}'.format(TABLE_SPACE_URL, server_group, server_id,
                                    tablespace_id),
            content_type='html/json')
        assert response.status_code == 200
        temp_response = json.loads(response.data.decode('utf-8'))
        return temp_response
    else:
        return None


def delete_table_space(tester):
    """
    This function use to delete the existing tablespace in the servers

    :param tester: flask test client
    :type tester: flask test object
    :return: None
    """

    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    if "tsid" in all_id and all_id["tsid"]:
        tablespace_ids_dict = all_id["tsid"][0]
    else:
        tablespace_ids_dict = None

    if tablespace_ids_dict is not None:
        for server_id in server_ids:
            tablespace_id = tablespace_ids_dict[int(server_id)]
            role_response = verify_table_space(tester, utils.SERVER_GROUP,
                                               server_id,
                                               tablespace_id)
            if len(role_response) == 0:
                raise Exception("No tablespace(s) to delete!!!")
            response = tester.delete(
                TABLE_SPACE_URL + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' + str(tablespace_id),
                follow_redirects=True)
            assert response.status_code == 200
            delete_response_data = json.loads(response.data.decode('utf-8'))
            assert delete_response_data['success'] == 1
