##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as subscription_utils


class SubscriptionGetTestCase(BaseTestGenerator):
    """This class will fetch the subscription under table node."""
    scenarios = utils.generate_scenarios('get_subscription',
                                         subscription_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        self.server_version = schema_info["server_version"]
        if self.server_version < 99999:
            self.skipTest(
                "Logical replication is not supported "
                "for server version less than 10"

            )
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to "
                            "delete subscription.")

        self.subscription_name = "test_subscription_delete_%s" % (
            str(uuid.uuid4())[1:8])
        self.subscription_id = subscription_utils.create_subscription(
            self.server, self.db_name,
            self.subscription_name)

    def get_subscription(self):
        return self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' + str(
                self.server_id) + '/' +
            str(self.db_id) + '/' + str(self.subscription_id),
            content_type='html/json')

    def runTest(self):
        """This function will fetch the subscription."""

        if self.is_positive_test:
            if hasattr(self, "database_nodes"):
                self.subscription_id = ''
                response = self.get_subscription()
            else:
                response = self.get_subscription()
        else:
            if hasattr(self, "database_nodes"):
                self.subscription_id = ''
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.get_subscription()
            else:
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.get_subscription()

        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        # Disconnect the database
        subscription_utils.delete_subscription(self.server, self.db_name,
                                               self.subscription_name)
        database_utils.disconnect_database(self, self.server_id, self.db_id)
