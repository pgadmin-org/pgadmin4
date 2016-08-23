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
import uuid
from regression.test_setup import advanced_config_data, pickle_path
from regression import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.schemas.functions.tests \
    import utils as func_utils

EVENT_TRIGGER_URL = '/browser/event_trigger/obj/'


def get_event_trigger_config_data(schema_name, server_connect_data,
                                  trigger_func_name):
    adv_config_data = None
    db_user = server_connect_data['data']['user']['name']

    # Get the config data of appropriate db user
    for config_test_data in advanced_config_data['event_trigger_credentials']:
        if db_user == config_test_data['owner']:
            adv_config_data = config_test_data

    data = {
        "enabled": adv_config_data['enable'],
        "eventfunname": "{0}.{1}".format(schema_name, trigger_func_name),
        "eventname": adv_config_data['event_name'],
        "eventowner": adv_config_data['owner'],
        "name": "event_trigger_{}".format(str(uuid.uuid4())[1:4]),
        "providers": adv_config_data['provider']
    }
    return data


def add_event_trigger(tester):
    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    schema_info_dict = all_id["scid"][0]
    trigger_func_info_dict = all_id["tfnid"][0]

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        db_con = database_utils.verify_database(tester, utils.SERVER_GROUP,
                                                server_id, db_id)
        if db_con['data']["connected"]:
            server_connect_response = server_utils.verify_server(
                tester, utils.SERVER_GROUP, server_id)

            schema_info = schema_info_dict[int(server_id)]
            trigger_func_list = trigger_func_info_dict[int(server_id)]
            trigger_func_info = \
                filter(lambda x: x[2] == "event_trigger", trigger_func_list)[0]
            trigger_func_name = trigger_func_info[1].replace("()", "")
            trigger_func_id = trigger_func_info[0]

            trigger_func_response = \
                func_utils.verify_trigger_function(tester, server_id,
                                                   db_id, schema_info[0],
                                                   trigger_func_id)
            if trigger_func_response.status_code == 200:
                data = get_event_trigger_config_data(
                    schema_info[1],
                    server_connect_response, trigger_func_name)

                response = tester.post(
                    EVENT_TRIGGER_URL + str(utils.SERVER_GROUP) + '/' +
                    str(server_id) + '/' + str(db_id) +
                    '/', data=json.dumps(data),
                    content_type='html/json')
            assert response.status_code == 200
            response_data = json.loads(response.data.decode('utf-8'))
            write_event_trigger_info(response_data, server_id)


def write_event_trigger_info(response_data, server_id):
    """
    This function writes the schema id into parent_id.pkl

    :param response_data: extension add response data
    :type response_data: dict
    :param server_id: server id
    :type server_id: str
    :return: None
    """

    event_trigger_id = response_data['node']['_id']
    pickle_id_dict = utils.get_pickle_id_dict()
    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
    if 'etid' in pickle_id_dict:
        if pickle_id_dict['etid']:
            # Add the event_trigger_id as value in dict
            pickle_id_dict["etid"][0].update({server_id: event_trigger_id})
        else:
            # Create new dict with server_id and event_trigger_id
            pickle_id_dict["etid"].append({server_id: event_trigger_id})
    event_trigger_output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, event_trigger_output)
    event_trigger_output.close()


def verify_event_trigger(tester, server_group, server_id, db_id,
                         event_trigger_id):
    response = tester.get(EVENT_TRIGGER_URL + str(server_group) + '/' +
                          str(server_id) + '/' + str(db_id) +
                          '/' + str(event_trigger_id),
                          content_type='html/json')
    return response


def delete_event_trigger(tester):
    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    event_trigger_ids_dict = all_id["etid"][0]

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        event_trigger_id = event_trigger_ids_dict[server_id]

        response = verify_event_trigger(tester,
                                        utils.SERVER_GROUP,
                                        server_id,
                                        db_id,
                                        event_trigger_id)
        if response.status_code == 200:
            del_response = tester.delete(
                EVENT_TRIGGER_URL + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' +
                str(db_id) + '/' +
                str(event_trigger_id),
                follow_redirects=True)

            return del_response
