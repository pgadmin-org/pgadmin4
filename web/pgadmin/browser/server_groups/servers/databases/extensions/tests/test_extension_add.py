##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import json

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as extension_utils


class ExtensionsAddTestCase(BaseTestGenerator):
    scenarios = [
        # Fetching default URL for extension node.
        ('Check Extension Node', dict(url='/browser/extension/obj/'))
    ]

    def runTest(self):
        """ This function will add extension under test schema. """
        super().runTest()
        self.schema_data = parent_node_dict["schema"][-1]
        self.server_id = self.schema_data["server_id"]
        self.db_id = self.schema_data['db_id']
        self.schema_name = self.schema_data['schema_name']
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")
        self.data = extension_utils.get_extension_data(self.schema_name)
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(
                self.db_id) + '/',
            data=json.dumps(self.data),
            content_type='html/json')
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        """This function disconnect the test database and drop added extension.
        """
        db_name = parent_node_dict["database"][-1]['db_name']
        extension_utils.drop_extension(self.server, db_name, self.data['name'])
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
