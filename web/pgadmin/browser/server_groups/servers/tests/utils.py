# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

from __future__ import print_function

import sys
import json
import sqlite3
import config

from regression import node_info_dict
from regression import test_utils as utils
from regression.test_setup import config_data

SERVER_URL = '/browser/server/obj/'
SERVER_CONNECT_URL = 'browser/server/connect/'


def get_server_id():
    """This function returns the server id from node_info_dict"""

    server_id = 0
    if "sid" in node_info_dict:
        if node_info_dict['sid']:
            server_id = list(node_info_dict['sid'][0].keys())[0]
    return server_id


def connect_server(self, server_id):
    """
    This function used to connect added server
    :param self: class object of server's test class
    :type self: class
    :param server_id: flag for db add test case
    :type server_id: bool
    """
    response = self.tester.post(SERVER_CONNECT_URL + str(utils.SERVER_GROUP) +
                                '/' + str(server_id),
                                data=dict(password=self.server['db_password']),
                                follow_redirects=True)
    assert response.status_code == 200
    response_data = json.loads(response.data.decode('utf-8'))
    return response_data


def add_server(server):
    try:
        conn = sqlite3.connect(config.SQLITE_PATH)
        cur = conn.cursor()
        server_details = (
            1, utils.SERVER_GROUP, server['name'], server['host'],
            server['port'], server['db'], server['username'],
            server['role'], server['sslmode'],
            server['comment'])
        cur.execute(
            'INSERT INTO server (user_id, servergroup_id, name, host, '
            'port, maintenance_db, username, role, ssl_mode,'
            ' comment) VALUES (?,?,?,?,?,?,?,?,?,?)', server_details)
        server_id = cur.lastrowid
        # Add server info to node_info_dict
        utils.write_node_info(int(server_id), "sid", server)
        conn.commit()
    except Exception as err:
        raise Exception(err)
