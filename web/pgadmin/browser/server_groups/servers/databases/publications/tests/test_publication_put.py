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
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as publication_utils


class PublicationUpdateTestCase(BaseTestGenerator):
    """This class will update the publication."""
    scenarios = utils.generate_scenarios('update_publication',
                                         publication_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        self.server_version = schema_info["server_version"]
        self.test_data['pubowner'] = self.server['username']

        if self.server_version < 99999:
            self.skipTest(
                "Logical replication is not supported "
                "for server version less than 10"

            )

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception(
                "Could not connect to database to delete publication.")

        self.test_data['name'] = "test_publication_add_%s" % (
            str(uuid.uuid4())[1:8])
        self.publication_id = publication_utils.create_publication(self)

    def update_publication(self, data):
        return self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(
                self.db_id) +
            '/' + str(self.publication_id),
            data=json.dumps(data),
            follow_redirects=True)

    def runTest(self):
        """This function will update the publication."""

        publication_name = publication_utils. \
            verify_publication(self.server,
                               self.db_name,
                               self.test_data['name'])
        if not publication_name:
            raise Exception("Could not find the publication to update.")

        if hasattr(self, "update_name"):
            self.test_data['name'] = "test_publication_update_%s" % (
                str(uuid.uuid4())[1:8])

        self.test_data['id'] = self.publication_id

        if self.is_positive_test:
            if hasattr(self, "wrong_publication_id"):
                self.publication_id = 9999
            response = self.update_publication(self.test_data)
        else:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                if hasattr(self, "wrong_publication_id"):
                    self.publication_id = 9999
                response = self.update_publication(self.test_data)

        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        publication_utils.delete_publication(self.server, self.db_name,
                                             self.test_data['name'])

        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
