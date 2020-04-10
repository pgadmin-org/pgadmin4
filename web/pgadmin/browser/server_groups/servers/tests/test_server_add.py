##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import copy
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils


class ServersAddTestCase(BaseTestGenerator):
    """ This class will add the servers under default server group. """

    scenarios = [
        # Fetch the default url for server object
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    def setUp(self):
        pass

    def runTest(self):
        """ This function will add the server under default server group."""
        url = "{0}{1}/".format(self.url, utils.SERVER_GROUP)
        response = self.tester.post(url, data=json.dumps(self.server),
                                    content_type='html/json')
        self.assertEquals(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.server_id = response_data['node']['_id']
        server_dict = {"server_id": int(self.server_id)}
        utils.write_node_info("sid", server_dict)

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)


class AddServersWithSavePasswordTestCase(BaseTestGenerator):
    """ This class will add the servers under default server group. """

    scenarios = [
        # Fetch the default url for server object
        ('Add server with password and save password to true',
         dict(url='/browser/server/obj/', with_pwd=True, with_save=True)),
        ('Add server with password and save password to false',
         dict(url='/browser/server/obj/', with_pwd=True, with_save=False)),
        ('Add server without password and save password to true',
         dict(url='/browser/server/obj/', with_pwd=False, with_save=True)),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """ This function will add the server under default server group."""
        url = "{0}{1}/".format(self.url, utils.SERVER_GROUP)
        _server = copy.deepcopy(self.server)
        # Update the flag as required
        _server['save_password'] = self.with_save
        if not self.with_pwd:
            # Remove the password from server object
            del _server['db_password']

        response = self.tester.post(url, data=json.dumps(_server),
                                    content_type='html/json')
        self.assertEquals(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.server_id = response_data['node']['_id']
        server_dict = {"server_id": int(self.server_id)}
        # Fetch the node info to check if password was saved or not
        response = self.tester.get(self.url.replace('obj', 'nodes') +
                                   str(utils.SERVER_GROUP) + '/' +
                                   str(self.server_id),
                                   follow_redirects=True)
        self.assertEquals(response.status_code, 200)
        self.assertTrue('is_password_saved' in response.json['result'])
        utils.write_node_info("sid", server_dict)

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)
