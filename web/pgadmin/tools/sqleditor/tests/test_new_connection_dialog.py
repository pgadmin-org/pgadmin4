##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from unittest.mock import patch
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.test_setup import config_data
from pgadmin.utils.exception import CryptKeyMissing


class TestNewConnectionDialog(BaseTestGenerator):
    """ This class will test new connection dialog. """
    scenarios = [
        ('New connection dialog',
         dict(
             url="/sqleditor/new_connection_dialog/",
             crypt_key_missing=False,
             expected_data={
                 "status_code": 200
             }
         )),
        ('New connection dialog when the crypt key is missing',
         dict(
             url="/sqleditor/new_connection_dialog/",
             crypt_key_missing=True,
             expected_data={
                 "status_code": 503
             }
         )),
    ]

    def setUp(self):
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.sgid = config_data['server_group']

    def new_connection(self):
        response = self.tester.get(
            self.url + str(self.sgid) + '/' + str(self.sgid),
            content_type='html/json'
        )

        return response

    def runTest(self):
        if self.crypt_key_missing:
            # When the crypt key is missing (e.g. the backend was restarted),
            # the endpoint must surface CryptKeyMissing as a 503
            # CRYPTKEY_MISSING response so the client can transparently
            # recover, rather than swallowing it into a generic error and
            # logging a traceback. See issue #10027.
            with patch('pgadmin.utils.driver.psycopg3.server_manager.'
                       'ServerManager.connection',
                       side_effect=CryptKeyMissing()):
                response = self.new_connection()
            self.assertEqual(response.status_code,
                             self.expected_data['status_code'])
            self.assertIn('CRYPTKEY_MISSING', response.data.decode('utf-8'))
        else:
            response = self.new_connection()
            self.assertEqual(response.status_code,
                             self.expected_data['status_code'])
