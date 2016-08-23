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

CAST_URL = '/browser/cast/obj/'


def get_cast_config_data(server_connect_data):

    adv_config_data = None
    db_user = server_connect_data['data']['user']['name']

    # Get the config data of appropriate db user
    for config_test_data in advanced_config_data['casts_credentials']:
        if db_user == config_test_data['owner']:
            adv_config_data = config_test_data

    data = {
        "castcontext": adv_config_data
        ['cast_context'],
        "encoding": adv_config_data
        ['encoding'],
        "name": adv_config_data
        ['name'],
        "srctyp": adv_config_data
        ['source_type'],
        "trgtyp": adv_config_data
        ['target_type']
        }
    return data


def add_cast(tester):
    """
    This function add the cast in the existing database

    :param tester: test object
    :type tester: flask test object
    :return:None
    """

    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    server_group = utils.config_data['server_group']

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        db_con = database_utils.verify_database(tester, server_group,
                                                server_id, db_id)
        if db_con['data']['connected']:
            server_connect_response = server_utils.verify_server(
                tester, server_group, server_id)

            data = get_cast_config_data(server_connect_response)

            response = tester.post(CAST_URL + str(server_group) + '/' +
                                   str(server_id) + '/' + str(
                db_id) + '/',
                                   data=json.dumps(data),
                                   content_type='html/json')

            assert response.status_code == 200
            response_data = json.loads(response.data.decode('utf-8'))
            write_cast_info(response_data, server_id)


def write_cast_info(response_data, server_id):
    """
    This function writes the server's details to file parent_id.pkl

    :param response_data: server's data
    :type response_data: list of dictionary
    :param pickle_id_dict: contains ids of server,database,tables etc.
    :type pickle_id_dict: dict
    :return: None
    """

    cast_id = response_data['node']['_id']
    pickle_id_dict = utils.get_pickle_id_dict()
    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
    if 'cid' in pickle_id_dict:
        if pickle_id_dict['cid']:
            # Add the cast_id as value in dict
            pickle_id_dict["cid"][0].update({server_id: cast_id})
        else:
            # Create new dict with server_id and cast_id
            pickle_id_dict["cid"].append({server_id: cast_id})
    cast_output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, cast_output)
    cast_output.close()


def verify_cast(tester, server_group, server_id, db_id, cast_id):

    cast_response = tester.get(CAST_URL + str(server_group) + '/' +
                               str(server_id) + '/' + str(db_id) +
                               '/' + str(cast_id),
                               content_type='html/json')
    return cast_response


def delete_cast(tester):
    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    cast_ids_dict = all_id["cid"][0]

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        db_con = database_utils.verify_database(tester, utils.SERVER_GROUP,
                                                server_id,
                                                db_id)
        if len(db_con) == 0:
            raise Exception("No database(s) to delete for server id %s"
                            % server_id)
        cast_id = cast_ids_dict[server_id]
        cast_get_data = verify_cast(tester, utils.SERVER_GROUP,
                                    server_id,
                                    db_id, cast_id)

        if cast_get_data.status_code == 200:
            delete_response = tester.delete(
                CAST_URL + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' + str(db_id) +
                '/' + str(cast_id),
                follow_redirects=True)
            return delete_response
