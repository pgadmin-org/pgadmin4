##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import uuid
import json

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as fdw_utils


class FDWDDeleteMultipleTestCase(BaseTestGenerator):
    """This class will delete foreign data wrappers under test database."""
    skip_on_database = ['gpdb']
    scenarios = utils.generate_scenarios('fdw_delete_multiple',
                                         fdw_utils.test_cases)

    def setUp(self):
        """ This function will create extension and foreign data wrapper."""
        super(FDWDDeleteMultipleTestCase, self).setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.fdw_names = ["fdw_{0}".format(str(uuid.uuid4())[1:8]),
                          "fdw_{0}".format(str(uuid.uuid4())[1:8])]
        self.fdw_ids = [fdw_utils.create_fdw(self.server, self.db_name,
                                             self.fdw_names[0]),
                        fdw_utils.create_fdw(self.server, self.db_name,
                                             self.fdw_names[1])]

    def delete_multiple(self, data):
        """
        This function returns multiple fdw delete response
        :param data: fdw ids to delete
        :return: fdw delete response
        """
        return self.tester.delete(self.url + str(utils.SERVER_GROUP) +
                                  '/' + str(self.server_id) +
                                  '/' + str(self.db_id) + '/',
                                  follow_redirects=True,
                                  data=json.dumps(data),
                                  content_type='html/json')

    def runTest(self):
        """This function will fetch foreign data wrapper present under test
         database."""
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")
        fdw_response = fdw_utils.verify_fdw(self.server, self.db_name,
                                            self.fdw_names[0])
        if not fdw_response:
            raise Exception("Could not find FDW.")
        fdw_response = fdw_utils.verify_fdw(self.server, self.db_name,
                                            self.fdw_names[1])
        if not fdw_response:
            raise Exception("Could not find FDW.")
        data = {'ids': self.fdw_ids}
        delete_response = self.delete_multiple(data)

        self.assertEquals(delete_response.status_code,
                          self.expected_data['status_code'])

    def tearDown(self):
        """This function disconnect the test database and drop added extension
         and dependant objects."""
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
