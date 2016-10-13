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
from . import utils as fts_configuration_utils


class FTSConfPutTestCase(BaseTestGenerator):
    """ This class will update added FTS configuration under schema node. """

    scenarios = [
        # Fetching default URL for fts_configuration node.
        ('Fetch FTS configuration Node URL',
         dict(url='/browser/fts_configuration/obj/'))
    ]

    def setUp(self):
        """ This function will create FTS configuration."""

        schema_data = parent_node_dict['schema'][-1]
        self.schema_name = schema_data['schema_name']
        self.schema_id = schema_data['schema_id']
        self.server_id = schema_data['server_id']
        self.db_id = schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.fts_conf_name = "fts_conf_%s" % str(uuid.uuid4())[1:4]

        self.fts_conf_id = fts_configuration_utils.create_fts_configuration(
            self.server, self.db_name, self.schema_name, self.fts_conf_name)

    def runTest(self):
        """ This function will update new FTS configuration under
        test schema. """

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

        fts_conf_response = fts_configuration_utils.verify_fts_configuration(
            self.server, self.db_name, self.fts_conf_name
        )

        if not fts_conf_response:
            raise Exception("Could not find the FTS Configuration.")

        data = \
            {
                "description": "This is FTS configuration update comment",
                "id": self.fts_conf_id
            }

        put_response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.fts_conf_id),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEquals(put_response.status_code, 200)

    def tearDown(self):
        """This function disconnect the test database."""

        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
