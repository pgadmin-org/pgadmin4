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

SYNONYM_URL = '/browser/synonym/obj/'


def get_synonym_config_data(server_connect_data):
    """This function returns the synonym config data"""

    adv_config_data = None
    data = None
    db_user = server_connect_data['data']['user']['name']

    # Get the config data of appropriate db user
    for config_test_data in \
            advanced_config_data['synonym_credentials']:
        if db_user == config_test_data['owner']:
            adv_config_data = config_test_data

    if adv_config_data is not None:
        data = {
            "name": adv_config_data['name'],
            "schema": adv_config_data['schema'],
            "synobjname": adv_config_data['synobjname'],
            "synobjschema": adv_config_data['synobjschema'],
            "targettype": adv_config_data['targettype']
        }
    return data


def write_synonym_id(response_data, server_id):
    """
    This function writes the server and synonym id

    :param response_data: synonym response data
    :type response_data: dict
    :param server_id: server id
    :type server_id: int
    :return: None
    """

    synonym_id = response_data['node']['_id']
    pickle_id_dict = utils.get_pickle_id_dict()
    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
    if 'syid' in pickle_id_dict:
        if pickle_id_dict['syid']:
            # Add the db_id as value in dict
            pickle_id_dict["syid"][0].update(
                {int(server_id): synonym_id})
        else:
            # Create new dict with server_id and db_id
            pickle_id_dict["syid"].append(
                {int(server_id): synonym_id})
    db_output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, db_output)
    db_output.close()


def add_synonym(tester, server_connect_response, server_ids):
    """This function add the synonym to schemas"""

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
            data = get_synonym_config_data(server_connect_response)
            data['schema'] = schema_info[1]
            response = tester.post(
                SYNONYM_URL + str(utils.SERVER_GROUP) + '/' + str(server_id)
                + '/' + str(db_id) + '/' + str(schema_info[0]) + '/',
                data=json.dumps(data), content_type='html/json')
            response_data = json.loads(response.data.decode('utf-8'))
            write_synonym_id(response_data, server_id)


def verify_synonym(tester, server_id, db_id, schema_id, synonym_id):
    """This function verifies the synonym using GET API"""

    get_response = tester.get(
        SYNONYM_URL + str(utils.SERVER_GROUP) + '/' + str(server_id) + '/' +
        str(db_id) + '/' + str(schema_id) + '/' + str(synonym_id),
        content_type='html/json')

    return get_response


def delete_synonym(tester):
    """This function deletes the synonyms from schema"""

    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    schema_ids_dict = all_id["scid"][0]
    synonym_ids_dict = all_id["syid"][0]

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
                synonym_id = synonym_ids_dict[int(server_id)]
                get_response = verify_synonym(
                    tester, server_id, db_id, schema_info[0], synonym_id)

                get_response_data = json.loads(
                    get_response.data.decode('utf-8'))
                if len(get_response_data) == 0:
                    raise Exception("No synonym node to delete.")

                del_response = tester.delete(
                    SYNONYM_URL + str(utils.SERVER_GROUP) + '/' +
                    str(server_id) + '/' + str(db_id) + '/' +
                    str(schema_info[0]) + '/' + str(synonym_id),
                    follow_redirects=True)

                assert del_response.status_code == 200
                del_response_data = json.loads(
                    del_response.data.decode('utf-8'))
                assert del_response_data['success'] == 1
