##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import uuid
import json

from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers.\
    tests import utils as fdw_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as fsrv_utils


class ForeignServerDeleteMultipleTestCase(BaseTestGenerator):
    """This class will delete foreign server under FDW node."""
    scenarios = utils.generate_scenarios('foreign_server_multiple_delete',
                                         fsrv_utils.test_cases)

    def setUp(self):
        """ This function will create extension and foreign data wrapper."""
        super().setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.fdw_name = "test_fdw_%s" % (str(uuid.uuid4())[1:8])
        self.fsrv_names = ["test_fsrv_%s" % (str(uuid.uuid4())[1:8]),
                           "test_fsrv_%s" % (str(uuid.uuid4())[1:8])]

        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)
        self.fsrv_ids = [fsrv_utils.create_fsrv(self.server, self.db_name,
                                                self.fsrv_names[0],
                                                self.fdw_name),
                         fsrv_utils.create_fsrv(self.server, self.db_name,
                                                self.fsrv_names[1],
                                                self.fdw_name)]

    def delete_multiple(self, data):
        """
        This function returns multiple foreign server delete response
        :param data: foreign server ids to delete
        :return: foreign server delete response
        """
        return self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.fdw_id) + "/",
            data=json.dumps(data),
            content_type='html/json',
            follow_redirects=True)

    def runTest(self):
        """This function will delete foreign server present under test
         database."""
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")
        fdw_response = fdw_utils.verify_fdw(self.server, self.db_name,
                                            self.fdw_name)
        if not fdw_response:
            raise Exception("Could not find FDW.")
        fsrv_response = fsrv_utils.verify_fsrv(self.server, self.db_name,
                                               self.fsrv_names[0])
        if not fsrv_response:
            raise Exception("Could not find FSRV.")
        fsrv_response = fsrv_utils.verify_fsrv(self.server, self.db_name,
                                               self.fsrv_names[1])
        if not fsrv_response:
            raise Exception("Could not find FSRV.")
        data = {'ids': self.fsrv_ids}

        if self.is_positive_test:
            delete_response = self.delete_multiple(data)

        actual_response_code = delete_response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function disconnect the test database and drop added
         foreign data server and dependant objects."""
        fdw_utils.delete_fdw(self.server, self.db_name,
                             self.fdw_name)
        database_utils.disconnect_database(self, self.server_id, self.db_id)
