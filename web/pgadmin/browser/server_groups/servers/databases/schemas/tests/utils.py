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

from regression.test_setup import pickle_path, advanced_config_data
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from regression import test_utils as utils

SCHEMA_URL = '/browser/schema/obj/'


def get_schema_config_data(server_connect_response):
    """This function is used to get advance config test data for schema"""

    adv_config_data = None
    data = None
    db_user = server_connect_response['data']['user']['name']

    # Get the config data of appropriate db user
    for config_test_data in advanced_config_data['schema_credentials']:
        if db_user == config_test_data['owner']:
            adv_config_data = config_test_data

    if adv_config_data is not None:
        data = {
            "deffuncacl": adv_config_data['func_acl'],
            "defseqacl": adv_config_data['seq_acl'],
            "deftblacl": adv_config_data['tbl_acl'],
            "deftypeacl": adv_config_data['type_acl'],
            "name": "test_{0}".format(str(uuid.uuid4())[1:8]),
            "namespaceowner": adv_config_data['owner'],
            "nspacl": adv_config_data['privilege'],
            "seclabels": adv_config_data['sec_label']
        }
    return data


def write_schema_id(response_data, server_id):
    """
    This function writes the schema id into parent_id.pkl

    :param response_data: schema add response data
    :type response_data: dict
    :param server_id: server id
    :type server_id: str
    :return: None
    """

    schema_id = response_data['node']['_id']
    schema_name = str(response_data['node']['label'])
    pickle_id_dict = utils.get_pickle_id_dict()
    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
    if 'scid' in pickle_id_dict:
        if pickle_id_dict['scid']:
            # Add the schema_id as value in dict
            pickle_id_dict["scid"][0].update(
                {int(server_id): [schema_id, schema_name]})
        else:
            # Create new dict with server_id and schema_id
            pickle_id_dict["scid"].append(
                {int(server_id): [schema_id, schema_name]})
    schema_output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, schema_output)
    schema_output.close()


def add_schemas(tester):
    """This function add the schemas into databases"""

    all_id = utils.get_ids()

    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]

    for server_id in server_ids:
        server_connect_response = server_utils.verify_server(
            tester, str(utils.SERVER_GROUP), server_id)
        db_id = db_ids_dict[int(server_id)]
        db_con = database_utils.verify_database(tester, utils.SERVER_GROUP,
                                                server_id, db_id)
        if db_con['data']["connected"]:
            data = get_schema_config_data(
                server_connect_response)
            response = tester.post(
                SCHEMA_URL + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' + str(db_id) +
                '/', data=json.dumps(data),
                content_type='html/json')

            assert response.status_code == 200
            response_data = json.loads(response.data.decode('utf-8'))
            write_schema_id(response_data, server_id)


def verify_schemas(tester, server_id, db_id, schema_id):
    """This function verifies the schema is exists"""

    response = tester.get(SCHEMA_URL + str(utils.SERVER_GROUP) + '/' +
                          str(server_id) + '/' + str(db_id) +
                          '/' + str(schema_id),
                          content_type='html/json')
    return response


def delete_schema(tester):
    """This function delete schemas from the databases"""

    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    schema_ids_dict = all_id["scid"][0]

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        db_con = database_utils.verify_database(tester, utils.SERVER_GROUP,
                                                server_id, db_id)
        if db_con['data']["connected"]:
            schema_id = schema_ids_dict[int(server_id)][0]
            schema_response = verify_schemas(tester, server_id, db_id,
                                             schema_id)
            schema_response = json.loads(schema_response.data.decode('utf-8'))
            if not schema_response:
                raise Exception("No schema(s) to delete.")

            del_response = tester.delete(
                SCHEMA_URL + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' +
                str(db_id) + '/' +
                str(schema_id),
                follow_redirects=True)
            assert del_response.status_code == 200
            response_data = json.loads(del_response.data.decode('utf-8'))
            assert response_data['success'] == 1
