# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

from __future__ import print_function

import json

from regression import test_utils as utils

SERVER_URL = '/browser/server/obj/'
SERVER_CONNECT_URL = '/browser/server/connect/'


def connect_server(self, server_id):
    """
    This function used to connect added server
    :param self: class object of server's test class
    :type self: class
    :param server_id: server id
    :type server_id: str
    """
    response = self.tester.post(SERVER_CONNECT_URL + str(utils.SERVER_GROUP) +
                                '/' + str(server_id),
                                data=dict(password=self.server['db_password']),
                                follow_redirects=True)
    assert response.status_code == 200
    response_data = json.loads(response.data.decode('utf-8'))
    return response_data
