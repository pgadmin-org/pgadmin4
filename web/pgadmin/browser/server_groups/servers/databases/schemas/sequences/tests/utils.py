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
from regression.test_setup import pickle_path, advanced_config_data
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from regression import test_utils as utils
import uuid

SEQUENCE_URL = '/browser/sequence/obj/'


def get_sequence_config_data(schema_name, server_connect_data):
    adv_config_data = None
    db_user = server_connect_data['data']['user']['name']

    # Get the config data of appropriate db user
    for config_test_data in advanced_config_data['sequence_credentials']:
        if db_user == config_test_data['owner']:
            adv_config_data = config_test_data

            data = \
                {
                    "cache": adv_config_data['cache'],
                    "cycled": adv_config_data['cycled'],
                    "increment": adv_config_data['increment'],
                    "maximum": adv_config_data['max_value'],
                    "minimum": adv_config_data['min_value'],
                    "name": "sequence_{0}".format(str(uuid.uuid4())[1:4]),
                    "relacl": adv_config_data['acl'],
                    "schema": schema_name,
                    "securities": adv_config_data['security'],
                    "seqowner": adv_config_data['owner'],
                    "start": adv_config_data['start_val']
                }

            return data


def add_sequences(tester):
    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    schema_info_dict = all_id["scid"][0]

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        db_con = database_utils.verify_database(tester, utils.SERVER_GROUP,
                                                server_id, db_id)
        if db_con['data']["connected"]:
            server_connect_response = server_utils.verify_server(
                tester, utils.SERVER_GROUP, server_id)

            schema_name = schema_info_dict[int(server_id)][1]
            data = get_sequence_config_data(schema_name,
                                            server_connect_response)
            schema_id = schema_info_dict[int(server_id)][0]

            response = tester.post(
                SEQUENCE_URL + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' + str(db_id) +
                '/' + str(schema_id) + '/',
                data=json.dumps(data),
                content_type='html/json')
            assert response.status_code == 200
            response_data = json.loads(response.data.decode('utf-8'))
            write_sequence_info(response_data, server_id)


def write_sequence_info(response_data, server_id):
    """
    This function writes the sequence id into parent_id.pkl

    :param response_data: sequence add response data
    :type response_data: dict
    :param server_id: server id
    :type server_id: str
    :return: None
    """

    sequence_id = response_data['node']['_id']
    pickle_id_dict = utils.get_pickle_id_dict()
    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
    if 'fid' in pickle_id_dict:
        if pickle_id_dict['seid']:
            # Add the sequence_id as value in dict
            pickle_id_dict["seid"][0].update({server_id: sequence_id})
        else:
            # Create new dict with server_id and sequence_id
            pickle_id_dict["seid"].append({server_id: sequence_id})
    sequence_output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, sequence_output)
    sequence_output.close()


def verify_sequence(tester, server_group, server_id, db_id, schema_id,
                    sequence_id):
    """This function verifies the sequence using GET API"""

    get_response = tester.get(SEQUENCE_URL + str(server_group) + '/' +
                              str(server_id) + '/' +
                              str(db_id) + '/' +
                              str(schema_id) + '/' +
                              str(sequence_id),
                              content_type='html/json')

    return get_response


def delete_sequence(tester):
    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    schema_ids_dict = all_id["scid"][0]
    sequence_ids_dict = all_id["seid"][0]

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        schema_info = schema_ids_dict[int(server_id)]
        schema_id = schema_info[0]
        sequence_id = sequence_ids_dict[server_id]
        get_response = verify_sequence(tester,
                                       utils.SERVER_GROUP,
                                       server_id,
                                       db_id,
                                       schema_id,
                                       sequence_id)
        if get_response.status_code == 200:
            delete_response = tester.delete(
                SEQUENCE_URL + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' +
                str(db_id) + '/' +
                str(schema_id) + '/' +
                str(sequence_id),
                follow_redirects=True)

            assert delete_response.status_code == 200
            del_resp_data = json.loads(delete_response.data.decode('utf-8'))
            assert del_resp_data['success'] == 1
