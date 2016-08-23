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
from regression.test_setup import advanced_config_data, pickle_path
from regression import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.tests import utils as server_utils


EXTENSION_URL = '/browser/extension/obj/'


def get_extension_config_data(schema_name, server_connect_data):
    adv_config_data = None
    db_user = server_connect_data['data']['user']['name']

    # Get the config data of appropriate db user
    for config_test_data in advanced_config_data['extension_credentials']:
        if db_user == config_test_data['owner']:
            adv_config_data = config_test_data

    data = {
        "name": adv_config_data['name'],
        "relocatable": adv_config_data['relocate'],
        "schema": schema_name,
        "version": adv_config_data['version']
    }
    return data


def write_extension_info(response_data, server_id):
    """
    This function writes the schema id into parent_id.pkl

    :param response_data: extension add response data
    :type response_data: dict
    :param server_id: server id
    :type server_id: str
    :return: None
    """

    extension_id = response_data['node']['_id']
    # schema_name = str(response_data['node']['label'])
    pickle_id_dict = utils.get_pickle_id_dict()
    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
    if 'eid' in pickle_id_dict:
        if pickle_id_dict['eid']:
            # Add the extension_id as value in dict
            pickle_id_dict["eid"][0].update({server_id: extension_id})
        else:
            # Create new dict with server_id and extension_id
            pickle_id_dict["eid"].append({server_id: extension_id})
    extension_output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, extension_output)
    extension_output.close()


def add_extensions(tester):

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
            data = get_extension_config_data(schema_name,
                                             server_connect_response)

            response = tester.post(
                EXTENSION_URL + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' + str(
                    db_id) + '/',
                data=json.dumps(data),
                content_type='html/json')
            assert response.status_code == 200
            response_data = json.loads(response.data.decode('utf-8'))
            write_extension_info(response_data, server_id)


def verify_extensions(tester, server_group, server_id, db_id, extension_id):

    response = tester.get(EXTENSION_URL + str(server_group) + '/' +
                          str(server_id) + '/' + str(db_id) +
                          '/' + str(extension_id),
                          content_type='html/json')
    return response


def delete_extension(tester):

    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    extension_ids_dict = all_id["eid"][0]

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        extension_id = extension_ids_dict[server_id]

        response = verify_extensions(tester,
                                     utils.SERVER_GROUP,
                                     server_id, db_id,
                                     extension_id)
        if response.status_code == 200:
            delete_response = tester.delete(
                EXTENSION_URL + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' +
                str(db_id) + '/' +
                str(extension_id),
                follow_redirects=True)
            delete_respdata = json.loads(delete_response.data.decode())
            return delete_respdata
