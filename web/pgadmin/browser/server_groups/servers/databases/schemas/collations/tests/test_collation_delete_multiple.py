##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as collation_utils


class CollationDeleteMultipleTestCase(BaseTestGenerator):
    """ This class will delete added collations under schema node. """
    scenarios = utils.generate_scenarios('delete_multiple_collation',
                                         collation_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.schema_info = parent_node_dict["schema"][-1]
        self.schema_name = self.schema_info["schema_name"]
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        coll_names = ["collation_get_%s" % str(uuid.uuid4())[1:8],
                      "collation_get_%s" % str(uuid.uuid4())[1:8]]

        self.collations = [collation_utils.create_collation(self.server,
                                                            self.schema_name,
                                                            coll_names[0],
                                                            self.db_name),
                           collation_utils.create_collation(self.server,
                                                            self.schema_name,
                                                            coll_names[1],
                                                            self.db_name)
                           ]

    def delete_multiple(self, data):
        """
        This function returns multiple collation delete response
        :param data: collation ids to delete
        :return: collation delete response
        """
        return self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' + str(
                self.server_id) + '/' +
            str(self.db_id) + '/' + str(self.schema_id) + '/',
            content_type='html/json',
            data=json.dumps(data),
            follow_redirects=True,
        )

    def runTest(self):
        """ This function will delete collations under schema node. """
        self.server_id = self.schema_info["server_id"]
        self.db_id = self.schema_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database.")

        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")
        data = {'ids': [self.collations[0][0], self.collations[1][0]]}
        self.schema_id = self.schema_info["schema_id"]

        if self.is_positive_test:
            response = self.delete_multiple(data)

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect database to delete it
        database_utils.disconnect_database(self, self.server_id, self.db_id)
