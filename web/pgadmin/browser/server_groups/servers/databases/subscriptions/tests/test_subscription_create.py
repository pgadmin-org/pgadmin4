##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as subscription_utils


class SubscriptionAddTestCase(BaseTestGenerator):
    """This class will add new subscription"""
    scenarios = utils.generate_scenarios('add_subscription',
                                         subscription_utils.test_cases)

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        self.schema_name = schema_info["schema_name"]
        self.server_version = schema_info["server_version"]
        if self.server_version < 99999:
            self.skipTest(
                "Logical replication is not supported "
                "for server version less than 10"

            )

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception(
                "Could not connect to database to add a subscription.")

        if self.is_positive_test and hasattr(self, 'few_tables_11'):
            self.table_name = "table_column_%s" % (str(uuid.uuid4())[1:8])
            self.table_id = tables_utils.create_table(self.server,
                                                      self.db_name,
                                                      self.schema_name,
                                                      self.table_name)

            self.test_data['pubtable'] = subscription_utils.get_tables(self)

    def runTest(self):
        """This function will subscription."""
        self.test_data['name'] = \
            "test_subscription_add_%s" % (str(uuid.uuid4())[1:8])
        self.test_data['slot_name'] = None

        data = self.test_data
        if self.is_positive_test:
            response = self.create_subscription()
        else:
            if hasattr(self, 'without_name'):
                del data["name"]
                response = self.create_subscription()
            elif hasattr(self, 'error_creating_subscription'):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.create_subscription()
            else:
                with patch(self.mock_data["function_name"],
                           side_effect=self.mock_data["return_value"]):
                    response = self.create_subscription()
        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def create_subscription(self):
        return self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(
                self.db_id) + '/',
            data=json.dumps(self.test_data),
            content_type='html/json')

    def tearDown(self):
        if self.is_positive_test:
            subscription_utils.delete_subscription(self.server, self.db_name,
                                                   self.test_data['name'])

        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
