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


class ExtensionsDeleteMultipleTestCase(BaseTestGenerator):
    scenarios = [
        # Fetching default URL for extension node.
        ('Check Extension Node', dict(url='/browser/extension/obj/'))
    ]

    def setUp(self):
        """ This function will create extensions."""
        super().setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.schema_name = self.schema_data['schema_name']

        self.extension_names = ["dblink", "hstore"]
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.extension_ids = []
        self.extension_ids.append(extension_utils.create_extension(
            self.server, self.db_name, self.extension_names[0],
            self.schema_name))
        self.extension_ids.append(extension_utils.create_extension(
            self.server, self.db_name, self.extension_names[1],
            self.schema_name))

    def runTest(self):
        """ This function will delete extensions added test database. """
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")
        response = extension_utils.verify_extension(self.server, self.db_name,
                                                    self.extension_names[0])
        if not response:
            raise Exception("Could not find extension.")
        response = extension_utils.verify_extension(self.server, self.db_name,
                                                    self.extension_names[1])
        if not response:
            raise Exception("Could not find extension.")
        data = {'ids': self.extension_ids}
        delete_response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) + '/',
            follow_redirects=True,
            data=json.dumps(data),
            content_type='html/json'
        )
        self.assertEqual(delete_response.status_code, 200)

    def tearDown(self):
        """This function disconnect the test database. """
        database_utils.disconnect_database(self, self.server_id, self.db_id)
