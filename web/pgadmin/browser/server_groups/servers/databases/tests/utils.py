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
import uuid

from regression.test_setup import pickle_path, config_data, advanced_config_data
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from regression import test_utils as utils


DATABASE_URL = '/browser/database/obj/'
DATABASE_CONNECT_URL = 'browser/database/connect/'


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
    for config_test_data in advanced_config_data['add_database_data']:
        if db_user == config_test_data['owner']:
            adv_config_data = config_test_data

    if adv_config_data is not None:
        data = {
            "datacl": adv_config_data['privileges_acl'],
            "datconnlimit": adv_config_data['conn_limit'],
            "datowner": adv_config_data['owner'],
            "deffuncacl": adv_config_data['fun_acl'],
            "defseqacl": adv_config_data['seq_acl'],
            "deftblacl": adv_config_data['tbl_acl'],
            "deftypeacl": adv_config_data['type_acl'],
            "encoding": adv_config_data['encoding'],
            "name": str(uuid.uuid4())[1:8],
            "privileges": adv_config_data['privileges'],
            "securities": adv_config_data['securities'],
            "variables": adv_config_data['variables']
        }
    return data


def write_db_id(response_data):
    """
    This function writes the server and database related data like server
    name, server id , database name, database id etc.

    :param response_data: server and databases details
    :type response_data: dict
    :return: None
    """

    db_id = response_data['node']['_id']
    server_id = response_data['node']['_pid']
    pickle_id_dict = utils.get_pickle_id_dict()
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


def add_database(tester, server_connect_response, server_ids):
    """
    This function add the database into servers

    :param tester: flask test client
    :type tester: flask test object
    :param server_connect_response: server response
    :type server_connect_response: dict
    :param server_ids: server ids
    :type server_ids: list
    :return: None
    """

    for server_connect, server_id in zip(server_connect_response, server_ids):
        if server_connect['data']['connected']:
            data = get_db_data(server_connect)
            db_response = tester.post(DATABASE_URL + str(utils.SERVER_GROUP) +
                                           "/" + server_id + "/",
                                           data=json.dumps(data),
                                           content_type='html/json')
            assert db_response.status_code == 200
            response_data = json.loads(db_response.data.decode('utf-8'))
            write_db_id(response_data)


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

    # Verify servers
    server_utils.verify_server(tester,server_group,server_id)

    # Connect to database
    con_response = tester.post('{0}{1}/{2}/{3}'.format(
        DATABASE_CONNECT_URL, server_group, server_id, db_id),
        follow_redirects=True)
    temp_db_con = json.loads(con_response.data.decode('utf-8'))

    return temp_db_con


def delete_database(tester):
    """
    This function used to delete the added databases

    :param tester: test client object
    :return: None
    """

    server_ids = None
    db_ids_dict = None

    all_id = utils.get_ids()
    if "sid" and "did" in all_id.keys():
        server_ids = all_id["sid"]
        if all_id['did']:
            db_ids_dict = all_id['did'][0]
    else:
        raise Exception("Keys are not found in pickle dict: {}".format(["sid", "did"]))

    if server_ids and db_ids_dict is not None:
        for server_id in server_ids:
            server_response = server_utils.verify_server(tester, utils.SERVER_GROUP, server_id)
            if server_response["data"]["connected"]:
                db_id = db_ids_dict[int(server_id)]
                response = tester.delete(DATABASE_URL + str(utils.SERVER_GROUP) + '/' +
                                         str(server_id) + '/' + str(db_id),
                                         follow_redirects=True)
                assert response.status_code == 200
                response_data = json.loads(response.data.decode('utf-8'))
                assert response_data['success'] == 1
    else:
        raise Exception("No servers/databases found.")

