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

from regression.test_setup import pickle_path, advanced_config_data
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from regression import test_utils as utils

COLLATION_URL = '/browser/collation/obj/'


def get_collation_config_data(server_connect_data):
    """This function returns the collation config data"""

    adv_config_data = None
    data = None
    db_user = server_connect_data['data']['user']['name']

    # Get the config data of appropriate db user
    for config_test_data in \
            advanced_config_data['collation_credentials']:
        if db_user == config_test_data['owner']:
            adv_config_data = config_test_data

    if adv_config_data is not None:
        data = {
            "copy_collation": adv_config_data['copy_collation'],
            "name": adv_config_data['name'],
            "owner": adv_config_data['owner'],
            "schema": adv_config_data['schema']
        }
    return data


def write_collation_id(response_data, server_id):
    """
    This function writes the server and collation id

    :param response_data: collation response data
    :type response_data: dict
    :param server_id: server id
    :type server_id: int
    :return: None
    """

    collation_id = response_data['node']['_id']
    pickle_id_dict = utils.get_pickle_id_dict()
    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
    if 'coid' in pickle_id_dict:
        if pickle_id_dict['coid']:
            # Add the db_id as value in dict
            pickle_id_dict["coid"][0].update(
                {int(server_id): collation_id})
        else:
            # Create new dict with server_id and db_id
            pickle_id_dict["coid"].append(
                {int(server_id): collation_id})
    db_output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, db_output)
    db_output.close()


def add_collation(tester, server_connect_response, server_ids):
    """This function add the collation to schemas"""

    all_id = utils.get_ids()
    db_ids_dict = all_id["did"][0]
    schema_ids_dict = all_id["scid"][0]

    for server_connect_response, server_id in zip(server_connect_response,
                                                  server_ids):
        db_id = db_ids_dict[int(server_id)]
        db_con = database_utils.verify_database(tester, utils.SERVER_GROUP,
                                                server_id, db_id)
        if db_con['data']["connected"]:
            schema_info = schema_ids_dict[int(server_id)]
            schema_utils.verify_schemas(tester, server_id, db_id,
                                        schema_info[0])
            data = get_collation_config_data(server_connect_response)
            data['schema'] = schema_info[1]
            response = tester.post(
                COLLATION_URL + str(utils.SERVER_GROUP) + '/' + str(server_id)
                + '/' + str(db_id) + '/' + str(schema_info[0]) + '/',
                data=json.dumps(data), content_type='html/json')
            response_data = json.loads(response.data.decode('utf-8'))
            write_collation_id(response_data, server_id)


def verify_collation(tester, server_id, db_id, schema_id, collation_id):
    """This function verifies the collation using GET API"""

    get_response = tester.get(
        COLLATION_URL + str(utils.SERVER_GROUP) + '/' + str(server_id) + '/' +
        str(db_id) + '/' + str(schema_id) + '/' + str(collation_id),
        content_type='html/json')

    return get_response


def delete_collation(tester):
    """This function deletes the collations from schema"""

    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    schema_ids_dict = all_id["scid"][0]
    collation_ids_dict = all_id["coid"][0]

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        db_con = database_utils.verify_database(tester, utils.SERVER_GROUP,
                                                server_id, db_id)
        if db_con['data']["connected"]:
            schema_info = schema_ids_dict[int(server_id)]
            schema_response = schema_utils.verify_schemas(tester, server_id,
                                                          db_id,
                                                          schema_info[0])
            schema_response = json.loads(schema_response.data.decode('utf-8'))
            if len(schema_response) != 0:
                collation_id = collation_ids_dict[int(server_id)]
                get_response = verify_collation(
                    tester, server_id, db_id, schema_info[0], collation_id)

                get_response_data = json.loads(
                    get_response.data.decode('utf-8'))
                if len(get_response_data) == 0:
                    raise Exception("No collation node to delete.")

                del_response = tester.delete(
                    COLLATION_URL + str(utils.SERVER_GROUP) + '/' +
                    str(server_id) + '/' + str(db_id) + '/' +
                    str(schema_info[0]) + '/' + str(collation_id),
                    follow_redirects=True)

                assert del_response.status_code == 200
                del_response_data = json.loads(
                    del_response.data.decode('utf-8'))
                assert del_response_data['success'] == 1
