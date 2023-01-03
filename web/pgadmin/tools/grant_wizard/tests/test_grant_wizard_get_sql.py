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

from unittest.mock import patch
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as grant_wizard_utils
from pgadmin.browser.server_groups.servers.databases.schemas.packages.tests \
    import utils as package_utils


class GrantWizardSaveGetSQLTestCase(BaseTestGenerator):
    """
    This will Get SQL for grant permissions.
    """

    scenarios = utils.generate_scenarios(
        'grant_wizard_get_sql',
        grant_wizard_utils.test_cases
    )

    def setUp(self):
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        self.did = self.database_info["db_id"]
        self.sid = parent_node_dict["server"][-1]["server_id"]

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.sid, self.did)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")

        self.schema_id = parent_node_dict['schema'][-1]["schema_id"]
        self.schema_name = parent_node_dict['schema'][-1]["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")

        if self.test_data['objects'][-1]['object_type'] == 'Package':

            if self.server_information['type'] == 'pg':
                message = "Packages are not supported by PG."
                self.skipTest(message)

            self.pkg_name = "pkg_%s" % str(uuid.uuid4())[1:8]
            self.proc_name = "proc_%s" % str(uuid.uuid4())[1:8]

            self.package_id = package_utils.create_package(self.server,
                                                           self.db_name,
                                                           self.schema_name,
                                                           self.pkg_name,
                                                           self.proc_name)

            self.test_data['objects'][-1]['name'] = self.pkg_name
            self.test_data['objects'][-1]['name_with_args'] = self.pkg_name

        else:
            self.table_name = "table_for_wizard%s" % (str(uuid.uuid4())[1:8])
            self.table_id = tables_utils.create_table(self.server,
                                                      self.db_name,
                                                      self.schema_name,
                                                      self.table_name)

            self.test_data['objects'][-1]['name'] = self.table_name
            self.test_data['objects'][-1]['name_with_args'] = self.table_name

        self.test_data['objects'][-1]['nspname'] = self.schema_name

        if self.server_information['type'] == 'ppas':
            self.test_data['acl'][-1]['grantee'] = 'enterprisedb'
            self.test_data['acl'][-1]['grantor'] = 'enterprisedb'
        else:
            self.test_data['acl'][-1]['grantee'] = 'postgres'
            self.test_data['acl'][-1]['grantor'] = 'postgres'

    def grant_permissions_sql(self):
        response = self.tester.post(
            self.url + str(self.sid) + '/' + str(self.did) + '/',
            data=json.dumps(self.test_data),
            content_type='html/json'
        )
        return response

    def runTest(self):
        """ This function will grant permission for user under database
        object. """
        if self.is_positive_test:
            response = self.grant_permissions_sql()
            actual_response_code = response.status_code
            expected_response_code = self.expected_data['status_code']
        else:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                response = self.grant_permissions_sql()
                actual_response_code = response.status_code
                expected_response_code = self.expected_data['status_code']

        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function disconnect database."""
        database_utils.disconnect_database(self, self.sid,
                                           self.did)
