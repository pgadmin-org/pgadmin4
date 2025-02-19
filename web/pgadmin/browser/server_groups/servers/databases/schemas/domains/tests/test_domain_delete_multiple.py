##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
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
from . import utils as domain_utils


class DomainDeleteMultipleTestCase(BaseTestGenerator):
    """ This class will delete new domains under schema node. """
    scenarios = utils.generate_scenarios('domain_multiple_delete',
                                         domain_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.database_info = parent_node_dict["database"][-1]
        self.db_id = self.database_info["db_id"]
        self.server_id = self.database_info["server_id"]
        self.db_name = self.database_info["db_name"]
        self.schema_info = parent_node_dict["schema"][-1]
        self.schema_name = self.schema_info["schema_name"]
        self.schema_id = self.schema_info["schema_id"]
        self.domain_names = ["domain_delete_%s" % (str(uuid.uuid4())[1:8]),
                             "domain_delete_%s" % (str(uuid.uuid4())[1:8])]
        self.domain_infos = [domain_utils.create_domain(self.server,
                                                        self.db_name,
                                                        self.schema_name,
                                                        self.schema_id,
                                                        self.domain_names[0]),
                             domain_utils.create_domain(self.server,
                                                        self.db_name,
                                                        self.schema_name,
                                                        self.schema_id,
                                                        self.domain_names[1])]

    def delete_multiple(self, data):
        """
        This function returns multiple domain delete response
        :param data: domain ids to delete
        :return: domain delete response
        """
        return self.tester.delete(
            self.url,
            content_type='html/json',
            follow_redirects=True,
            data=json.dumps(data))

    def runTest(self):
        """ This function will add domain under schema node. """
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to get the domain.")
        db_name = self.database_info["db_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to get the domain.")
        data = {'ids': [self.domain_infos[0][0], self.domain_infos[1][0]]}
        self.url = self.url + str(utils.SERVER_GROUP) + '/' + str(
            self.server_id) + '/' + str(self.db_id) + '/' +\
            str(self.schema_id) + "/"
        # Call GET API to verify the domain
        get_response = self.delete_multiple(data)

        actual_response_code = get_response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
