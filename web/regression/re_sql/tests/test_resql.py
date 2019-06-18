##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import os

from flask import url_for
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.versioned_template_loader import \
    get_version_mapping_directories


def create_resql_module_list(all_modules, exclude_pkgs):
    """
    This function is used to create the module list for reverse engineering
    SQL by iterating all the modules.

    :param all_modules: List of all the modules
    :param exclude_pkgs: List of exclude packages
    :return:
    """
    resql_module_list = dict()

    for module in all_modules:
        if "tests." in str(module) and not any(str(module).startswith(
                'pgadmin.' + str(exclude_pkg)) for exclude_pkg in exclude_pkgs
        ):
            complete_module_name = module.split(".test")
            module_name_list = complete_module_name[0].split(".")
            module_name = module_name_list[len(module_name_list) - 1]

            resql_module_list[module_name] = os.path.join(*module_name_list)

    return resql_module_list


class ReverseEngineeredSQLTestCases(BaseTestGenerator):
    """ This class will test the reverse engineering SQL"""

    scenarios = [
        ('Reverse Engineered SQL Test Cases', dict())
    ]

    def setUp(self):
        # Get the database connection
        self.db_con = database_utils.connect_database(
            self, utils.SERVER_GROUP, self.server_information['server_id'],
            self.server_information['db_id'])
        if not self.db_con['info'] == "Database connected.":
            raise Exception("Could not connect to database.")

        # Get the application path
        self.apppath = os.getcwd()

    def runTest(self):
        # Create the module list on which reverse engineering sql test
        # cases will be executed.
        resql_module_list = create_resql_module_list(
            BaseTestGenerator.re_sql_module_list,
            BaseTestGenerator.exclude_pkgs)

        for module in resql_module_list:
            module_path = resql_module_list[module]
            # Get the folder name based on server version number and
            # their existence.
            status, self.test_folder = self.get_test_folder(module_path)
            if not status:
                continue

            # Iterate all the files in the test folder and check for
            # the JSON files.
            for filename in os.listdir(self.test_folder):
                if filename.endswith(".json"):
                    complete_file_name = os.path.join(self.test_folder,
                                                      filename)
                    with open(complete_file_name) as jsonfp:
                        data = json.load(jsonfp)
                        for key, scenarios in data.items():
                            self.execute_test_case(scenarios)

    def tearDown(self):
        database_utils.disconnect_database(
            self, self.server_information['server_id'],
            self.server_information['db_id'])

    def get_url(self, endpoint, object_id=None):
        """
        This function is used to get the url.

        :param endpoint:
        :param object_id:
        :return:
        """
        object_url = None
        for rule in self.app.url_map.iter_rules(endpoint):
            options = {}
            for arg in rule.arguments:
                if arg == 'gid':
                    options['gid'] = int(utils.SERVER_GROUP)
                elif arg == 'sid':
                    options['sid'] = int(self.server_information['server_id'])
                elif arg == 'did':
                    options['did'] = int(self.server_information['db_id'])
                elif arg == 'scid':
                    options['scid'] = int(self.server_information['schema_id'])
                else:
                    if object_id is not None:
                        options[arg] = int(object_id)

            with self.app.test_request_context():
                object_url = url_for(rule.endpoint, **options)

        return object_url

    def execute_test_case(self, scenarios):
        """
        This function will run the test cases for specific module.

        :param module_name: Name of the module
        :param scenarios: List of scenarios
        :return:
        """
        object_id = None
        # Added line break after scenario name
        print("\n")

        for scenario in scenarios:
            print(scenario['name'])

            if 'type' in scenario and scenario['type'] == 'create':
                # Get the url and create the specific node.
                create_url = self.get_url(scenario['endpoint'])
                response = self.tester.post(create_url,
                                            data=json.dumps(scenario['data']),
                                            content_type='html/json')
                self.assertEquals(response.status_code, 200)
                resp_data = json.loads(response.data.decode('utf8'))
                object_id = resp_data['node']['_id']

                # Compare the reverse engineering SQL
                self.check_re_sql(scenario, object_id)
            elif 'type' in scenario and scenario['type'] == 'alter':
                # Get the url and create the specific node.
                alter_url = self.get_url(scenario['endpoint'], object_id)
                response = self.tester.put(alter_url,
                                           data=json.dumps(scenario['data']),
                                           follow_redirects=True)
                self.assertEquals(response.status_code, 200)
                resp_data = json.loads(response.data.decode('utf8'))
                object_id = resp_data['node']['_id']

                # Compare the reverse engineering SQL
                self.check_re_sql(scenario, object_id)
            elif 'type' in scenario and scenario['type'] == 'delete':
                # Get the delete url and delete the object created above.
                delete_url = self.get_url(scenario['endpoint'], object_id)
                delete_response = self.tester.delete(delete_url,
                                                     follow_redirects=True)
                self.assertEquals(delete_response.status_code, 200)

    def get_test_folder(self, module_path):
        """
        This function will get the appropriate test folder based on
        server version and their existence.

        :param module_path: Path of the module to be tested.
        :return:
        """
        # Join the application path and the module path
        absolute_path = os.path.join(self.apppath, module_path)
        # Iterate the version mapping directories.
        for version_mapping in get_version_mapping_directories(
                self.server['type']):
            if version_mapping['number'] > \
                    self.server_information['server_version']:
                continue

            complete_path = os.path.join(absolute_path, 'tests',
                                         version_mapping['name'])

            if os.path.exists(complete_path):
                return True, complete_path

        return False, None

    def check_re_sql(self, scenario, object_id):
        """
        This function is used to get the reverse engineering SQL.
        :param scenario:
        :param object_id:
        :return:
        """
        sql_url = self.get_url(scenario['sql_endpoint'], object_id)
        response = self.tester.get(sql_url)
        self.assertEquals(response.status_code, 200)
        resp_sql = response.data.decode('unicode_escape')

        # Remove first and last double quotes
        if resp_sql.startswith('"') and resp_sql.endswith('"'):
            resp_sql = resp_sql[1:-1]

        # Check if expected sql is given in JSON file or path of the output
        # file is given
        if 'expected_sql_file' in scenario:
            output_file = os.path.join(self.test_folder,
                                       scenario['expected_sql_file'])

            if os.path.exists(output_file):
                fp = open(output_file, "r")
                # Used rstrip to remove trailing \n
                sql = fp.read().rstrip()
                self.assertEquals(sql, resp_sql)
            else:
                self.assertFalse("Expected SQL File not found")
        elif 'expected_sql' in scenario:
            self.assertEquals(scenario['expected_sql'], resp_sql)
