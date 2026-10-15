##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import pickle
import secrets

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

# The preference defaults, which the freshly created test database uses.
PREFERENCE_OPTIONS = {
    'auto_commit': True,
    'auto_rollback': False,
    'server_cursor': False,
}
CHANGED_OPTIONS = {
    'auto_commit': False,
    'auto_rollback': True,
    'server_cursor': True,
}


class TestExecuteOptionsReinit(BaseTestGenerator):
    """
    The execute options chosen on the Query Tool toolbar must be kept when
    the transaction is re-created, rather than reset to the preferences
    (issue #10598).
    """
    scenarios = [
        ('Initialise with the toolbar execute options', dict(
            change_connection=False, init_options=CHANGED_OPTIONS,
            expected=CHANGED_OPTIONS)),
        ('Initialise with some of the toolbar execute options', dict(
            change_connection=False,
            init_options={'server_cursor': True},
            expected=dict(PREFERENCE_OPTIONS, server_cursor=True))),
        ('Initialise without execute options uses the preferences', dict(
            change_connection=False, init_options={},
            expected=PREFERENCE_OPTIONS)),
        ('Initialise ignores execute options that are not booleans', dict(
            change_connection=False,
            init_options={'auto_commit': 'false', 'auto_rollback': None,
                          'server_cursor': 1},
            expected=PREFERENCE_OPTIONS)),
        ('Changing the connection keeps the execute options', dict(
            change_connection=True, init_options={},
            toolbar_options=CHANGED_OPTIONS, expected=CHANGED_OPTIONS)),
        ('Changing the connection ignores execute options that are not '
         'booleans', dict(
             change_connection=True, init_options={},
             toolbar_options={'auto_commit': 'false', 'auto_rollback': 1,
                              'server_cursor': 1},
             expected=PREFERENCE_OPTIONS)),
    ]

    def setUp(self):
        database_info = parent_node_dict["database"][-1]
        self.db_name = database_info["db_name"]
        self.server_id = database_info["server_id"]
        self.db_id = database_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}'.format(
            self.trans_id, utils.SERVER_GROUP, self.server_id, self.db_id)
        response = self.tester.post(url, data=json.dumps(dict(
            self.init_options, dbname=self.db_name)))
        self.assertEqual(response.status_code, 200)

    def runTest(self):
        if self.change_connection:
            # Change the options from the toolbar, then change the
            # connection, which creates a new transaction.
            for option, value in self.toolbar_options.items():
                response = self.tester.post(
                    '/sqleditor/{0}/{1}'.format(option, self.trans_id),
                    data=json.dumps(value))
                self.assertEqual(response.status_code, 200)

            url = ('/sqleditor/initialize/sqleditor/update_connection/'
                   '{0}/{1}/{2}/{3}').format(self.trans_id,
                                             utils.SERVER_GROUP,
                                             self.server_id, self.db_id)
            response = self.tester.post(url, data=json.dumps({
                'user': self.server['username'],
                'role': None,
                'password': self.server['db_password'],
                'database_name': self.db_name,
            }), content_type='html/json')
            self.assertEqual(response.status_code, 200)
            self.trans_id = json.loads(
                response.data.decode('utf-8'))['data']['trans_id']

        with self.tester.session_transaction() as sess:
            command_obj = pickle.loads(
                sess['gridData'][str(self.trans_id)]['command_obj'])

        for option, value in self.expected.items():
            self.assertIs(getattr(command_obj, option), value, option)

    def tearDown(self):
        self.tester.delete('/sqleditor/close/{0}'.format(self.trans_id))
        database_utils.disconnect_database(self, self.server_id, self.db_id)
