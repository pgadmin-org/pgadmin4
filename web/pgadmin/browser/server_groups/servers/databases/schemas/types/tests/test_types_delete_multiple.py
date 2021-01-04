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

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as types_utils
from unittest.mock import patch


class TypesDeleteMultipleTestCase(BaseTestGenerator):
    """ This class will delete type under schema node. """
    scenarios = utils.generate_scenarios('types_delete_multiple',
                                         types_utils.test_cases)

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to delete a type.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to delete a type.")
        self.type_names = ["test_type_{0}".format(str(uuid.uuid4())[1:8]),
                           "test_type_{0}".format(str(uuid.uuid4())[1:8])]
        self.type_ids = [types_utils.create_type(self.server, self.db_name,
                                                 self.schema_name,
                                                 self.type_names[0]),
                         types_utils.create_type(self.server, self.db_name,
                                                 self.schema_name,
                                                 self.type_names[1])]

    def delete_multiple(self, data):
        """
        This function returns multiple type delete response
        :param data: type ids to delete
        :return: type delete response
        """
        return self.tester.delete(self.url + str(utils.SERVER_GROUP) +
                                  '/' + str(self.server_id) +
                                  '/' + str(self.db_id) + '/' +
                                  str(self.schema_id) + '/',
                                  follow_redirects=True,
                                  data=json.dumps(data),
                                  content_type='html/json')

    def runTest(self):
        """ This function will delete type under schema node. """
        type_response = types_utils.verify_type(self.server, self.db_name,
                                                self.type_names[0])
        if not type_response:
            raise Exception("Could not find the type to delete.")
        type_response = types_utils.verify_type(self.server, self.db_name,
                                                self.type_names[1])
        if not type_response:
            raise Exception("Could not find the type to delete.")

        data = {'ids': self.type_ids}

        if self.is_positive_test:
            response = self.delete_multiple(data)

        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
