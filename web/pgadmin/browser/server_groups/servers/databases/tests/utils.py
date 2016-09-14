# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

import json
import uuid

from regression.test_setup import advanced_config_data
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from regression import test_utils as utils


DATABASE_URL = '/browser/database/obj/'
DATABASE_CONNECT_URL = 'browser/database/connect/'


def get_db_data():
    """This function returns the database details from json file"""
    data = None
    if advanced_config_data['add_database_data'] is not None:
        adv_config_data = advanced_config_data['add_database_data']
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


def verify_database(self, server_group, server_id, db_id):
    """
    This function verifies that database is exists and whether it connect
    successfully or not

    :param self: class object of test case class
    :type self: class
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
    server_utils.connect_server(self, server_id)

    # Connect to database
    db_con = self.tester.post('{0}{1}/{2}/{3}'.format(
        DATABASE_CONNECT_URL, server_group, server_id, db_id),
        follow_redirects=True)
    self.assertEquals(db_con.status_code, 200)
    db_con = json.loads(db_con.data.decode('utf-8'))
    return db_con


def disconnect_database(self, server_id, db_id):
    """This function disconnect the db"""
    db_con = self.tester.delete('{0}{1}/{2}/{3}'.format(
        'browser/database/connect/', utils.SERVER_GROUP, server_id, db_id),
        follow_redirects=True)
    self.assertEquals(db_con.status_code, 200)


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

