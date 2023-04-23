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

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.databases.schemas \
    .fts_dictionaries.tests import utils as fts_dict_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils


class FtsDictionaryAddTestCase(BaseTestGenerator):
    """ This class will add new FTS dictionary under schema node. """

    scenarios = [
        # Fetching default URL for FTS dictionary node.
        ('Fetch FTS dictionary Node URL', dict(
            url='/browser/fts_dictionary/obj/'))
    ]

    def runTest(self):
        """ This function will add new FTS dictionary under test schema. """
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
        self.fts_dict_name = "fts_dict_%s" % str(uuid.uuid4())[1:8]
        data = \
            {
                "name": self.fts_dict_name,
                "options": [
                    {
                        "value": "synonym_sample",
                        "option": "synonyms"
                    }
                ],
                "owner": self.server["username"],
                "schema": self.schema_id,
                "template": "synonym"
            }

        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id) + '/',
            data=json.dumps(data),
            content_type='html/json')

        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        """This function delete the fts dictionaries and disconnect the test
        database."""
        fts_dict_utils.delete_fts_dictionaries(self.server, self.db_name,
                                               self.schema_name,
                                               self.fts_dict_name)
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
