# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

from __future__ import print_function
import uuid
import json

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.schemas. \
    fts_parser.tests import utils as fts_parser_utils


class FTSConfiguraionAddTestCase(BaseTestGenerator):
    """ This class will add new FTS configuration under test schema. """

    scenarios = [
        # Fetching default URL for fts_configuration node.
        ('Fetch fts_configuration Node URL',
         dict(url='/browser/fts_configuration/obj/'))
    ]

    def setUp(self):
        """ This function will create parser."""

        schema_data = parent_node_dict['schema'][-1]
        self.schema_name = schema_data['schema_name']
        self.schema_id = schema_data['schema_id']
        self.server_id = schema_data['server_id']
        self.db_id = schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.fts_parser_name = "fts_parser_%s" % str(uuid.uuid4())[1:4]

        self.fts_parser_id = fts_parser_utils.create_fts_parser(self.server,
                                                                self.db_name,
                                                                self.schema_name,
                                                                self.fts_parser_name)

    def runTest(self):
        """ This function will add new FTS configuration under test schema. """

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

        data = \
            {
                "name": "fts_conf_%s" % str(uuid.uuid4())[1:4],
                "owner": self.server["username"],
                "prsname": "%s.%s" % (self.schema_name, self.fts_parser_name),
                "schema": self.schema_id,
                "tokens": []
            }

        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id) + '/',
            data=json.dumps(data),
            content_type='html/json')

        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function disconnect the test database."""

        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
