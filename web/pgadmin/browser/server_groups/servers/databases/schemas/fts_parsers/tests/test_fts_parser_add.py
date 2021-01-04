##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import json
import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as fts_parser_utils


class FtsParserAddTestCase(BaseTestGenerator):
    """ This class will add new FTS parser under schema node. """

    scenarios = [
        # Fetching default URL for FTS parser node.
        ('Fetch FTS parser Node URL', dict(url='/browser/fts_parser/obj/'))
    ]

    def runTest(self):
        """ This function will add a new FTS parser under test schema. """
        self.schema_data = parent_node_dict['schema'][-1]
        self.schema_name = self.schema_data['schema_name']
        self.schema_id = self.schema_data['schema_id']
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]

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

        self.fts_parser_name = "fts_parser_%s" % str(uuid.uuid4())[1:8]
        self.data = \
            {
                "name": self.fts_parser_name,
                "schema": self.schema_id,
                "prsend": "prsd_end",
                "prsheadline": "prsd_headline",
                "prslextype": "dsynonym_init",
                "prsstart": "prsd_start",
                "prstoken": "prsd_nexttoken"
            }

        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id) + '/',
            data=json.dumps(self.data),
            content_type='html/json')

        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        """This function delete the fts_parser and disconnect the test
        database."""
        fts_parser_utils.delete_fts_parser(self.server, self.db_name,
                                           self.schema_name,
                                           self.fts_parser_name)
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
