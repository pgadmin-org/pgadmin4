##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.databases.schemas \
    .fts_configurations.tests import utils as fts_config_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as fts_configuration_utils


class FTSConfGetTestCase(BaseTestGenerator):
    """ This class will fetch added fts_configuration under schema node. """

    scenarios = [
        # Fetching default URL for fts_configuration node.
        ('Fetch FTS configuration Node',
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
        self.fts_conf_name = "fts_conf_%s" % str(uuid.uuid4())[1:8]

        self.fts_conf_id = fts_configuration_utils.create_fts_configuration(
            self.server, self.db_name, self.schema_name, self.fts_conf_name)

    def runTest(self):
        """ This function will fetch new FTS configuration under test schema.
        """

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

        get_response = self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.fts_conf_id),
            content_type='html/json')

        self.assertEqual(get_response.status_code, 200)

    def tearDown(self):
        """This function delete the fts_config and disconnect the test
        database."""
        fts_config_utils.delete_fts_configurations(self.server, self.db_name,
                                                   self.schema_name,
                                                   self.fts_conf_name)
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
