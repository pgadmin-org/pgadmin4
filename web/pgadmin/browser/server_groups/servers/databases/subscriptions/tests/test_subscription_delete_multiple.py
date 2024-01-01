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


class SubscriptionDeleteTestCases(BaseTestGenerator):
    """This class will delete subscription."""

    scenarios = utils.generate_scenarios('delete_multiple_subscription',
                                         subscription_utils.test_cases)

    def setUp(self):
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
            raise Exception(
                "Could not connect to database to delete subscription.")

        self.subscription_name = "test_subscription_delete_%s" % (
            str(uuid.uuid4())[1:8])
        self.subscription_name_1 = "test_subscription_delete_%s" % (
            str(uuid.uuid4())[1:8])
        self.subscription_ids = [
            subscription_utils.create_subscription(self.server, self.db_name,
                                                   self.subscription_name),
            subscription_utils.create_subscription(self.server, self.db_name,
                                                   self.subscription_name_1),
        ]

    def delete_multiple_subscription(self, data):
        return self.tester.delete(
            "{0}{1}/{2}/{3}/".format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id
                                     ),
            follow_redirects=True,
            data=json.dumps(data),
            content_type='html/json'
        )

    def runTest(self):
        """This function will delete subscription."""
        subscription_response = subscription_utils.verify_subscription(
            self.server,
            self.db_name,
            self.subscription_name)
        if not subscription_response:
            raise Exception("Could not find the subscription to delete.")

        subscription_response = subscription_utils.verify_subscription(
            self.server,
            self.db_name,
            self.subscription_name_1)
        if not subscription_response:
            raise Exception("Could not find the subscription to delete.")

        data = {'ids': self.subscription_ids}
        if self.is_positive_test:
            response = self.delete_multiple_subscription(data)
        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        # Disconnect the database

        database_utils.disconnect_database(self, self.server_id, self.db_id)
