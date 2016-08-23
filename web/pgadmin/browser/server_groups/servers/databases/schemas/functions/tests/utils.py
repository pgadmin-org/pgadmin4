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

from regression.test_setup import pickle_path, advanced_config_data
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from regression import test_utils as utils

TRIGGER_FUNCTIONS_URL = '/browser/trigger_function/obj/'
TRIGGER_FUNCTIONS_DELETE_URL = '/browser/trigger_function/delete/'


def get_trigger_func_data(server_connect_data):
    """This function returns the trigger function config data"""

    adv_config_data = None
    data = None
    db_user = server_connect_data['data']['user']['name']

    # Get the config data of appropriate db user
    for config_test_data in \
            advanced_config_data['trigger_function_credentials']:
        if db_user == config_test_data['fun_owner']:
            adv_config_data = config_test_data

    if adv_config_data is not None:
        data = {
            "acl": adv_config_data['acl'],
            "arguments": adv_config_data['args'],
            "funcowner": adv_config_data['fun_owner'],
            "lanname": adv_config_data['language'],
            "name": adv_config_data['name'],
            "options": adv_config_data['options'],
            "proleakproof": adv_config_data['leak_proof'],
            "pronamespace": adv_config_data['namespace'],
            "prorettypename": adv_config_data['type'],
            "prosecdef": adv_config_data['sec_def'],
            "prosrc": adv_config_data['code'],
            "provolatile": adv_config_data['volitile'],
            "seclabels": adv_config_data['sec_label'],
            "variables": adv_config_data['Variable']
        }
    return data


def write_trigger_func_id(trigger_func_ids_list, server_id):
    """
    This function writes the server and trigger function related data like
    server id and trigger function name

    :param trigger_func_ids_list: list of trigger functions ids
    :type trigger_func_ids_list: list
    :param server_id: server id
    :type server_id: int
    :return: None
    """

    pickle_id_dict = utils.get_pickle_id_dict()

    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
    if 'tfnid' in pickle_id_dict:
        if pickle_id_dict['tfnid']:
            # Add the db_id as value in dict
            pickle_id_dict["tfnid"][0].update(
                {int(server_id): trigger_func_ids_list})
        else:
            # Create new dict with server_id and db_id
            pickle_id_dict["tfnid"].append(
                {int(server_id): trigger_func_ids_list})
    db_output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, db_output)
    db_output.close()


def add_trigger_function(tester, server_connect_response, server_ids):
    """This function add the trigger function to schema"""

    all_id = utils.get_ids()
    db_ids_dict = all_id["did"][0]
    schema_ids_dict = all_id["scid"][0]
    for server_connect_response, server_id in zip(server_connect_response,
                                                  server_ids):
        db_id = db_ids_dict[int(server_id)]
        db_con = database_utils.verify_database(tester, utils.SERVER_GROUP,
                                                server_id, db_id)
        if db_con['data']["connected"]:
            schema_id = schema_ids_dict[int(server_id)][0]
            schema_utils.verify_schemas(tester, server_id, db_id,
                                        schema_id)
            data = get_trigger_func_data(server_connect_response)
            # Get the type from config data. We are adding two types
            # i.e. event_trigger and trigger.
            trigger_func_types = data['prorettypename'].split('/')
            trigger_func_ids_list = []
            for func_type in trigger_func_types:
                data['prorettypename'] = func_type
                data["name"] = "event_{}".format(str(uuid.uuid4())[1:8])
                if schema_id:
                    data['pronamespace'] = schema_id
                else:
                    schema_id = data['pronamespace']

                response = tester.post(
                    TRIGGER_FUNCTIONS_URL + str(utils.SERVER_GROUP) + '/' +
                    str(server_id) + '/' + str(db_id) + '/' + str(schema_id)
                    + '/', data=json.dumps(data), content_type='html/json')

                assert response.status_code == 200
                response_data = json.loads(response.data.decode('utf-8'))
                trigger_func_id = response_data['node']['_id']
                event_trigger_name = str(response_data['node']['label'])
                trigger_func_ids_list.append(
                    (trigger_func_id, event_trigger_name, func_type))

            write_trigger_func_id(trigger_func_ids_list, server_id)


def verify_trigger_function(tester, server_id, db_id, schema_id,
                            trigger_func_id):
    """This function verifies the trigger function with GET API"""

    get_response = tester.get(
        TRIGGER_FUNCTIONS_URL + str(utils.SERVER_GROUP) + '/'
        + str(server_id) + '/' + str(db_id) + '/' +
        str(schema_id) + '/' + str(trigger_func_id),
        content_type='html/json')
    assert get_response.status_code == 200
    return get_response


def delete_trigger_function(tester):
    """This function add the trigger function to schema"""

    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    schema_ids_dict = all_id["scid"][0]
    trigger_ids_dict = all_id["tfnid"][0]
    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        db_con = database_utils.verify_database(tester, utils.SERVER_GROUP,
                                                server_id, db_id)
        if db_con['data']["connected"]:
            schema_id = schema_ids_dict[int(server_id)][0]
            schema_response = schema_utils.verify_schemas(
                tester, server_id, db_id, schema_id)
            if schema_response.status_code == 200:
                trigger_func_list = trigger_ids_dict[int(server_id)]
                for trigger_func in trigger_func_list:
                    trigger_func_id = trigger_func[0]
                    trigger_response = verify_trigger_function(
                        tester, server_id, db_id, schema_id, trigger_func_id)
                    if trigger_response.status_code == 200:
                        del_response = tester.delete(
                            TRIGGER_FUNCTIONS_DELETE_URL + str(
                                utils.SERVER_GROUP) + '/' +
                            str(server_id) + '/' + str(db_id) + '/' +
                            str(schema_id) + '/' + str(trigger_func_id),
                            follow_redirects=True)
                        assert del_response.status_code == 200
                        del_response_data = json.loads(
                            del_response.data.decode('utf-8'))
                        assert del_response_data['success'] == 1
