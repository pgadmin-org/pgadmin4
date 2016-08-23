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
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers.tests \
    import utils as fdw_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers.\
    foreign_servers.tests import utils as fsrv_utils


UM_URL = '/browser/user_mapping/obj/'


def get_um_config_data(server_connect_data):
    adv_config_data = None
    db_user = server_connect_data['data']['user']['name']

    # Get the config data of appropriate db user
    for config_test_data in advanced_config_data['user_mapping_credentials']:
        if db_user == config_test_data['owner']:
            adv_config_data = config_test_data

    data = {
        "name": adv_config_data['name'],
        "um_options": adv_config_data['option'],
        "umoptions": adv_config_data['options']
    }

    return data


def add_um(tester):

    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    fdw_ids_dict = all_id["fid"][0]
    fsrv_ids_dict = all_id["fsid"][0]

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        db_con = database_utils.verify_database(tester,
                                                utils.SERVER_GROUP,
                                                server_id, db_id)

        if db_con['data']['connected']:
            server_connect_response = server_utils.verify_server(
                tester, utils.SERVER_GROUP, server_id)

            fdw_id = fdw_ids_dict[server_id]

            fdw_response = fdw_utils.verify_fdws(tester,
                                                 utils.SERVER_GROUP,
                                                 server_id, db_id,
                                                 fdw_id)

            fsrv_id = fsrv_ids_dict[server_id]

            fsrv_response = fsrv_utils.verify_fsrv(tester, utils.SERVER_GROUP,
                                                   server_id, db_id,
                                                   fdw_id, fsrv_id)

            if fsrv_response.status_code == 200:
                data = get_um_config_data(server_connect_response)

                response = tester.post(
                    UM_URL + str(utils.SERVER_GROUP) + '/' +
                    str(server_id) + '/' + str(
                        db_id) +
                    '/' + str(fdw_id) + '/' + str(fsrv_id) + '/',
                    data=json.dumps(data),
                    content_type='html/json')

                assert response.status_code == 200

                response_data = json.loads(response.data.decode())
                write_um_info(response_data, server_id)


def write_um_info(response_data, server_id):
    """
    This function writes the schema id into parent_id.pkl

    :param response_data: foreign server add response data
    :type response_data: dict
    :param server_id: server id
    :type server_id: str
    :return: None
    """

    um_id = response_data['node']['_id']
    pickle_id_dict = utils.get_pickle_id_dict()
    if os.path.isfile(pickle_path):
        existing_server_id = open(pickle_path, 'rb')
        tol_server_id = pickle.load(existing_server_id)
        pickle_id_dict = tol_server_id
    if 'umid' in pickle_id_dict:
        if pickle_id_dict['umid']:
            # Add the umid as value in dict
            pickle_id_dict["umid"][0].update({server_id: um_id})
        else:
            # Create new dict with server_id and umid
            pickle_id_dict["umid"].append({server_id: um_id})
    fsrv_output = open(pickle_path, 'wb')
    pickle.dump(pickle_id_dict, fsrv_output)
    fsrv_output.close()


def verify_um(tester, server_group,  server_id, db_id, fdw_id, fsrv_id, um_id):
    response = tester.get(UM_URL + str(server_group) + '/' +
                          str(server_id) + '/' + str(db_id) +
                          '/' + str(fdw_id) + '/' + str(fsrv_id) + '/' + str(
        um_id),
                          content_type='html/json')
    return response


def delete_um(tester):
    all_id = utils.get_ids()
    server_ids = all_id["sid"]
    db_ids_dict = all_id["did"][0]
    fdw_ids_dict = all_id["fid"][0]
    fsrv_ids_dict = all_id["fsid"][0]
    um_ids_dict = all_id["umid"][0]

    for server_id in server_ids:
        db_id = db_ids_dict[int(server_id)]
        fdw_id = fdw_ids_dict[server_id]
        fsrv_id = fsrv_ids_dict[server_id]
        um_id = um_ids_dict[server_id]

        response = verify_um(tester, utils.SERVER_GROUP,
                             server_id, db_id,
                             fdw_id, fsrv_id, um_id)
        if response.status_code == 200:
            delete_response = tester.delete(
                UM_URL + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' + str(db_id) +
                '/' + str(fdw_id) + '/' +
                str(fsrv_id) + '/' + str(um_id),
                follow_redirects=True)
            delete_respdata = json.loads(delete_response.data.decode())
            return delete_respdata
