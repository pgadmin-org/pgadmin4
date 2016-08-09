# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

import json
import os
import pickle
import uuid

from regression.test_setup import pickle_path, config_data, advanced_config_data
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from regression import test_utils as utils


ROLE_URL = '/browser/role/obj/'


def verify_role(tester, server_group, server_id, role_id):
    """
    This function calls the GET API for role to verify

    :param tester: test client
    :type tester: flask test client object
    :param server_group: server group id
    :type server_group: int
    :param server_id: server id
    :type server_id: str
    :param role_id: role id
    :type role_id: int
    :return: dict/None
    """

    srv_connect = server_utils.verify_server(tester, server_group, server_id)
    if srv_connect['data']['connected']:
        response = tester.get(
            '{0}{1}/{2}/{3}'.format(ROLE_URL, server_group, server_id,
                                    role_id),
            content_type='html/json')
        temp_response = json.loads(response.data.decode('utf-8'))
        return temp_response
    else:
        return None


def test_getrole(tester):
    if not tester:
        return None

    all_id = utils.get_ids()

    server_ids = all_id["sid"]
    role_ids_dict = all_id["lrid"][0]
    server_group = config_data['server_group']

    role_response_data = []
    for server_id in server_ids:
        role_id = role_ids_dict[int(server_id)]
        role_response_data.append(
            verify_role(tester, server_group, server_id, role_id))
    return role_response_data


def get_role_data():
    """This function returns the role data from config file"""

    data = {
        "rolcanlogin": advanced_config_data['lr_credentials']
        ['can_login'],
        "rolconnlimit": advanced_config_data['lr_credentials']
        ['conn_limit'],
        "rolcreaterole": advanced_config_data['lr_credentials']
        ['create_role'],
        "rolinherit": advanced_config_data['lr_credentials']
        ['role_inherit'],
        "rolmembership": advanced_config_data['lr_credentials']
        ['role_membership'],
        "rolname": str(uuid.uuid4())[1:8],
        "rolpassword": advanced_config_data['lr_credentials']
        ['lr_password'],
        "rolvaliduntil": advanced_config_data['lr_credentials']
        ['lr_validity'],
        "seclabels": advanced_config_data['lr_credentials']
        ['sec_lable'],
        "variables": advanced_config_data['lr_credentials']
        ['variable']
    }
    return data


def add_role(tester, server_connect_response, server_group, server_ids):
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

    for server_connect, server_id in zip(server_connect_response,
                                         server_ids):
        if server_connect['data']['connected']:
            data = get_role_data()
            response = tester.post(ROLE_URL + str(server_group) + '/'
                                   + server_id + '/', data=json.dumps(data),
                                   content_type='html/json')
            assert response.status_code == 200
            response_data = json.loads(response.data.decode('utf-8'))
            write_role_id(response_data)


def write_role_id(response_data):
    """

    :param response_data:
    :return:
    """

    lr_id = response_data['node']['_id']
    server_id = response_data['node']['_pid']
    pickle_id_dict = utils.get_pickle_id_dict()
    # TODO: modify logic to write in file / file exists or create new check
    # old file
    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
    if 'lrid' in pickle_id_dict:
        if pickle_id_dict['lrid']:
            # Add the db_id as value in dict
            pickle_id_dict["lrid"][0].update({server_id: lr_id})
        else:
            # Create new dict with server_id and db_id
            pickle_id_dict["lrid"].append({server_id: lr_id})
    db_output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, db_output)
    db_output.close()


def delete_role(tester):
    """
    This function use to delete the existing roles in the servers

    :param tester: flask test client
    :type tester: flask test object
    :return: None
    """

    server_ids = None
    role_ids_dict = None

    all_id = utils.get_ids()
    if "sid" and "lrid" in all_id.keys():
        server_ids = all_id["sid"]
        if all_id['lrid']:
            role_ids_dict = all_id['lrid'][0]
    else:
        raise Exception("Keys are not found: {}".format(["sid", "lrid"]))

    if server_ids and role_ids_dict is not None:
        for server_id in server_ids:
            server_response = server_utils.verify_server(tester,
                                                         utils.SERVER_GROUP,
                                                         server_id)
            if server_response["data"]["connected"]:
                role_id = role_ids_dict[int(server_id)]
                response = tester.delete(
                    ROLE_URL + str(utils.SERVER_GROUP) + '/' +
                    str(server_id) + '/' + str(role_id),
                    follow_redirects=True)
                assert response.status_code == 200
                response_data = json.loads(response.data.decode('utf-8'))
                assert response_data['success'] == 1
    else:
        raise Exception("No servers/roles found.")


