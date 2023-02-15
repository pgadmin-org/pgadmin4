##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json
import re

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as domain_utils
from unittest.mock import patch


class DomainReverseEngineeredSQLTestCase(BaseTestGenerator):
    """ This class will verify reverse engineered sql for domain
     under schema node. """
    scenarios = utils.generate_scenarios('domain_get_sql',
                                         domain_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        self.schema_info = parent_node_dict["schema"][-1]
        self.schema_name = self.schema_info["schema_name"]
        self.schema_id = self.schema_info["schema_id"]
        self.test_data['domain_name'] = 'domain_get_%s' % (
                                        str(uuid.uuid4())[1:8])
        if hasattr(self, "Domain_Reverse_Engineered_SQL_with_char"):
            self.test_data['domain_sql'] = 'AS "char";'

        if hasattr(self,
           "Domain_Reverse_Engineered_SQL_with_Length_Precision_and_Default"):
            self.test_data['domain_sql'] =\
                'AS numeric(12,2) DEFAULT 12 NOT NULL;'

        if hasattr(self, "Domain_Reverse_Engineered_SQL_with_Length"):
            self.test_data['domain_sql'] = 'AS interval(6);'
        if hasattr(self, "internal_server_error"):
            self.test_data['domain_sql'] = 'AS "char";'
        if hasattr(self, "wrong_domain_id"):
            self.test_data['domain_sql'] = 'AS "char";'

        self.domain_info =\
            domain_utils.create_domain(self.server,
                                       self.db_name,
                                       self.schema_name,
                                       self.schema_id,
                                       self.test_data['domain_name'],
                                       self.test_data['domain_sql'])

    def get_sql(self):
        """
        This function returns the doamin sql
        :return: domain sql
        """
        return self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.domain_id),
            content_type='html/json')

    def runTest(self):
        """ This function will add domain and verify the
         reverse engineered sql. """
        self.db_id = self.database_info["db_id"]
        self.server_id = self.database_info["server_id"]
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
        self.domain_id = self.domain_info[0]

        # Call GET API to fetch the domain sql
        if self.is_positive_test:
            get_response = self.get_sql()

            expected_response_code = self.expected_data['status_code']
            self.assertEqual(get_response.status_code, expected_response_code)
            orig_sql = json.loads(get_response.data.decode('utf-8'))

            # Replace multiple spaces with one space and check the expected sql
            sql = re.sub('\s+', ' ', orig_sql).strip()
            expected_sql = '-- DOMAIN: {0}.{1} -- DROP DOMAIN IF EXISTS ' \
                           '{0}.{1}; CREATE DOMAIN {0}.{1} {2} ' \
                           'ALTER DOMAIN {0}.{1} OWNER' \
                           ' TO {3};'.format(self.schema_name,
                                             self.test_data['domain_name'],
                                             self.test_data['domain_sql'],
                                             self.server["username"])

            self.assertEqual(sql, expected_sql)

            domain_utils.delete_domain(self.server,
                                       db_name,
                                       self.schema_name,
                                       self.test_data['domain_name'])

            # Verify the reverse engineered sql with creating domain with
            # the sql we get from the server
            domain_utils.create_domain_from_sql(self.server, db_name, orig_sql)

            domain_utils.delete_domain(self.server, db_name,
                                       self.schema_name,
                                       self.test_data['domain_name'])
        else:
            if hasattr(self, "internal_server_error"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    get_response = self.get_sql()

                    expected_response_code = self.expected_data['status_code']
                    self.assertEqual(get_response.status_code,
                                     expected_response_code)

            if hasattr(self, "wrong_domain_id"):
                self.domain_id = 99999
                get_response = self.get_sql()
                expected_response_code = self.expected_data['status_code']
                self.assertEqual(get_response.status_code,
                                 expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
