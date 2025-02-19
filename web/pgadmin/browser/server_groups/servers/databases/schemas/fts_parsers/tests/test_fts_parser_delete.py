##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as fts_parser_utils


class FtsParserDeleteTestCase(BaseTestGenerator):
    """ This class will delete added FTS Parser under schema node. """

    scenarios = [
        # Fetching default URL for FTS parser node.
        ('Delete FTS Parser Node', dict(url='/browser/fts_parser/obj/'))
    ]

    def setUp(self):

        self.schema_data = parent_node_dict['schema'][-1]
        self.schema_name = self.schema_data['schema_name']
        self.schema_id = self.schema_data['schema_id']
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.fts_parser_name = "fts_parser_%s" % str(uuid.uuid4())[1:8]

        self.fts_parser_id = fts_parser_utils.create_fts_parser(
            self.server,
            self.db_name,
            self.schema_name,
            self.fts_parser_name)

    def runTest(self):
        """ This function will delete FTS parser present under test schema. """
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")

        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")

        parser_response = fts_parser_utils.verify_fts_parser(
            self.server,
            self.db_name,
            self.fts_parser_name)

        if not parser_response:
            raise Exception("Could not find the FTS parser.")

        delete_response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.fts_parser_id),
            follow_redirects=True)

        self.assertEqual(delete_response.status_code, 200)

        negative_delete_response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(0),
            follow_redirects=True)

        self.assertEqual(negative_delete_response.status_code, 410)

    def tearDown(self):
        """This function disconnect the test database."""

        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
