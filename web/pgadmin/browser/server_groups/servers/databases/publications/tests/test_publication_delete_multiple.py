##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
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
from . import utils as publication_utils


class PublicationDeleteTestCases(BaseTestGenerator):
    """This class will delete publication."""

    scenarios = utils.generate_scenarios('delete_multiple_publication',
                                         publication_utils.test_cases)

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception(
                "Could not connect to database to delete publication.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        self.server_version = schema_info["server_version"]
        if self.server_version < 99999:
            self.skipTest(
                "Logical replication is not supported "
                "for server version less than 10"

            )
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to delete publication.")
        self.table_name = "table_column_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.publication_name = "test_publication_delete_%s" % (
            str(uuid.uuid4())[1:8])
        self.publication_name_1 = "test_publication_delete_%s" % (
            str(uuid.uuid4())[1:8])
        self.publication_ids = [
            publication_utils.create_publication(self.server, self.db_name,
                                                 self.publication_name),
            publication_utils.create_publication(self.server, self.db_name,
                                                 self.publication_name_1),
        ]

    def delete_multiple_publication(self, data):
        return self.tester.delete(
            "{0}{1}/{2}/{3}/".format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id
                                     ),
            follow_redirects=True,
            data=json.dumps(data),
            content_type='html/json'
        )

    def runTest(self):
        """This function will delete publication."""
        rule_response = publication_utils. \
            verify_publication(self.server,
                               self.db_name,
                               self.publication_name)
        if not rule_response:
            raise Exception("Could not find the publication to delete.")

        rule_response = publication_utils. \
            verify_publication(self.server,
                               self.db_name,
                               self.publication_name_1)
        if not rule_response:
            raise Exception("Could not find the publication to delete.")

        data = {'ids': self.publication_ids}
        response = self.delete_multiple_publication(data)
        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
