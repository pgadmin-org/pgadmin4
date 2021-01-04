##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import json
import os
import re
import traceback
from urllib.parse import urlencode
from flask import url_for
import regression
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.versioned_template_loader import \
    get_version_mapping_directories


def create_resql_module_list(all_modules, exclude_pkgs, for_modules):
    """
    This function is used to create the module list for reverse engineered
    SQL by iterating all the modules.

    :param all_modules: List of all the modules
    :param exclude_pkgs: List of exclude packages
    :param for_modules: Module list
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

            if len(for_modules) > 0:
                if module_name in for_modules:
                    resql_module_list[module_name] = \
                        os.path.join(*module_name_list)
            else:
                resql_module_list[module_name] = \
                    os.path.join(*module_name_list)

    return resql_module_list


class ReverseEngineeredSQLTestCases(BaseTestGenerator):
    """ This class will test the reverse engineered SQL"""

    scenarios = [
        ('Reverse Engineered SQL Test Cases', dict())
    ]

    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

    def setUp(self):
        # Get the database connection
        self.db_con = database_utils.connect_database(
            self, utils.SERVER_GROUP, self.server_information['server_id'],
            self.server_information['db_id'])

        self.get_db_connection()

        if not self.db_con['info'] == "Database connected.":
            raise Exception("Could not connect to database.")

        self.test_config_db_conn = utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port']
        )

        # Get the application path
        self.apppath = os.getcwd()
        # Status of the test case
        self.final_test_status = True
        self.parent_ids = dict()
        self.all_object_ids = dict()

        # Added line break after scenario name
        print("")

    def runTest(self):
        """ Create the module list on which reverse engineeredsql test
        cases will be executed."""

        # Schema ID placeholder in JSON file which needs to be replaced
        # while running the test cases
        self.JSON_PLACEHOLDERS = {'schema_id': '<SCHEMA_ID>',
                                  'owner': '<OWNER>',
                                  'timestamptz_1': '<TIMESTAMPTZ_1>',
                                  'password': '<PASSWORD>',
                                  'pga_job_id': '<PGA_JOB_ID>',
                                  'timestamptz_2': '<TIMESTAMPTZ_2>'}

        resql_module_list = create_resql_module_list(
            BaseTestGenerator.re_sql_module_list,
            BaseTestGenerator.exclude_pkgs,
            getattr(BaseTestGenerator, 'for_modules', []))

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
                        try:
                            data = json.load(jsonfp)
                        except Exception as e:
                            print(
                                "Unable to read the json file: {0}".format(
                                    complete_file_name))
                            traceback.print_exc()
                            continue

                        for key, scenarios in data.items():
                            self.execute_test_case(scenarios)

                        # Clear the parent ids stored for one json file.
                        self.parent_ids.clear()
                        self.all_object_ids.clear()

        # Check the final status of the test case
        self.assertEqual(self.final_test_status, True)

    def tearDown(self):
        database_utils.disconnect_database(
            self, self.server_information['server_id'],
            self.server_information['db_id'])
        self.test_config_db_conn.close()

    def get_db_connection(self):
        """Get the database connection."""
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]

        if (not hasattr(self, 'connection')) or \
                (hasattr(self, 'connection') and self.connection.closed == 1):
            self.connection = utils.get_db_connection(
                self.db_name,
                self.server['username'],
                self.server['db_password'],
                self.server['host'],
                self.server['port']
            )

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
                    # For schema node object_id is the actual schema id.
                    if endpoint.__contains__('NODE-schema') and \
                            object_id is not None:
                        options['scid'] = int(object_id)
                    else:
                        options['scid'] = int(self.schema_id)
                # tid represents table oid
                elif arg == 'tid' and 'tid' in self.parent_ids:
                    options['tid'] = int(self.parent_ids['tid'])
                # fid represents FDW oid
                elif arg == 'fid' and 'fid' in self.parent_ids:
                    options['fid'] = int(self.parent_ids['fid'])
                # fsid represents Foreign Server oid
                elif arg == 'fsid' and 'fsid' in self.parent_ids:
                    options['fsid'] = int(self.parent_ids['fsid'])
                else:
                    if object_id is not None:
                        try:
                            options[arg] = int(object_id)
                        except ValueError:
                            options[arg] = object_id

            with self.app.test_request_context():
                object_url = url_for(rule.endpoint, **options)

        return object_url

    def execute_test_case(self, scenarios):
        """
        This function will run the test cases for specific module.

        :param scenarios: List of scenarios
        :return:
        """
        object_id = None

        for scenario in scenarios:
            skip_test_case = True
            if 'precondition_sql' in scenario:
                if 'pgagent_test' in scenario and self.check_precondition(
                        scenario['precondition_sql'], True):
                    skip_test_case = False
                elif self.check_precondition(
                        scenario['precondition_sql'], False):
                    skip_test_case = False
            else:
                skip_test_case = False

            if skip_test_case:
                print(scenario['name'] +
                      "... skipped (pre-condition SQL not satisfied)")
                continue

            # Check precondition for schema
            self.check_schema_precondition(scenario)

            # Preprocessed data to replace any place holder if available
            if 'preprocess_data' in scenario and \
                    scenario['preprocess_data'] and 'data' in scenario:
                scenario['data'] = self.preprocess_data(scenario['data'])

            # If msql_endpoint exists then validate the modified sql
            if 'msql_endpoint' in scenario\
                    and scenario['msql_endpoint']:
                if not self.check_msql(scenario, object_id):
                    print_msg = scenario['name']
                    if 'expected_msql_file' in scenario:
                        print_msg += "  Expected MSQL File:" + scenario[
                            'expected_msql_file']
                    print_msg = print_msg + "... FAIL"
                    print(print_msg)
                    continue
                else:
                    print(scenario['name'] + " (MSQL) ... ok")

            if 'type' in scenario and scenario['type'] == 'create':
                # Get the url and create the specific node.

                create_url = self.get_url(scenario['endpoint'])
                response = self.tester.post(create_url,
                                            data=json.dumps(scenario['data']),
                                            content_type='html/json')
                try:
                    self.assertEqual(response.status_code, 200)
                except Exception as e:
                    self.final_test_status = False
                    print(scenario['name'] + "... FAIL")
                    traceback.print_exc()
                    continue

                resp_data = json.loads(response.data.decode('utf8'))
                object_id = resp_data['node']['_id']

                # Store the object id based on endpoints
                if 'store_object_id' in scenario:
                    self.store_object_ids(object_id,
                                          scenario['data'],
                                          scenario['endpoint'])

                # Compare the reverse engineering SQL
                if not self.check_re_sql(scenario, object_id):
                    print(scenario['name'] + "... FAIL")

                    if 'expected_sql_file' in scenario:
                        print_msg = " - Expected SQL File: " + \
                                    os.path.join(self.test_folder,
                                                 scenario['expected_sql_file'])
                        print(print_msg)
                    continue
            elif 'type' in scenario and scenario['type'] == 'alter':
                # Get the url and create the specific node.

                alter_url = self.get_url(scenario['endpoint'], object_id)
                response = self.tester.put(alter_url,
                                           data=json.dumps(scenario['data']),
                                           follow_redirects=True)
                try:
                    self.assertEqual(response.status_code, 200)
                except Exception as e:
                    self.final_test_status = False
                    print(scenario['name'] + "... FAIL")
                    traceback.print_exc()
                    continue

                resp_data = json.loads(response.data.decode('utf8'))
                object_id = resp_data['node']['_id']

                # Compare the reverse engineering SQL
                if not self.check_re_sql(scenario, object_id):
                    print_msg = scenario['name']
                    if 'expected_sql_file' in scenario:
                        print_msg = print_msg + "  Expected SQL File:" + \
                                                scenario['expected_sql_file']
                    print_msg = print_msg + "... FAIL"
                    print(print_msg)
                    continue
            elif 'type' in scenario and scenario['type'] == 'delete':
                # Get the delete url and delete the object created above.
                delete_url = self.get_url(scenario['endpoint'], object_id)
                delete_response = self.tester.delete(
                    delete_url, data=json.dumps(scenario.get('data', {})),
                    follow_redirects=True)
                try:
                    self.assertEqual(delete_response.status_code, 200)
                except Exception as e:
                    self.final_test_status = False
                    print(scenario['name'] + "... FAIL")
                    traceback.print_exc()
                    continue

            print(scenario['name'] + "... ok")

    def get_test_folder(self, module_path):
        """
        This function will get the appropriate test folder based on
        server version and their existence.

        :param module_path: Path of the module to be tested.
        :return:
        """
        # Join the application path, module path and tests folder
        tests_folder_path = os.path.join(self.apppath, module_path, 'tests')

        # A folder name matching the Server Type (pg, ppas) takes priority so
        # check whether that exists or not. If so, than check the version
        # folder in it, else look directly in the 'tests' folder.
        absolute_path = os.path.join(tests_folder_path, self.server['type'])
        if not os.path.exists(absolute_path):
            absolute_path = tests_folder_path

        # Iterate the version mapping directories.
        for version_mapping in get_version_mapping_directories(
                self.server['type']):
            if version_mapping['number'] > \
                    self.server_information['server_version']:
                continue

            complete_path = os.path.join(absolute_path,
                                         version_mapping['name'])

            if os.path.exists(complete_path):
                return True, complete_path

        return False, None

    def check_msql(self, scenario, object_id):
        """
        This function is used to check the modified SQL.
        :param scenario:
        :param object_id:
        :return:
        """

        msql_url = self.get_url(scenario['msql_endpoint'],
                                object_id)

        # As msql data is passed as URL params, dict, list types data has to
        # be converted to string using json.dumps before passing it to
        # urlencode
        msql_data = {
            key: json.dumps(val)
            if isinstance(val, dict) or isinstance(val, list) else val
            for key, val in scenario['data'].items()}

        params = urlencode(msql_data)
        params = params.replace('False', 'false').replace('True', 'true')
        url = msql_url + "?%s" % params
        response = self.tester.get(url,
                                   follow_redirects=True)
        try:
            self.assertEqual(response.status_code, 200)
        except Exception as e:
            self.final_test_status = False
            print(scenario['name'] + "... FAIL")
            traceback.print_exc()
            return False
        try:
            if isinstance(response.data, bytes):
                response_data = response.data.decode('utf8')
                resp = json.loads(response_data)
            else:
                resp = json.loads(response.data)
            resp_sql = resp['data']
        except Exception:
            print("Unable to decode the response data from url: ", url)
            return False

        # Remove first and last double quotes
        if resp_sql.startswith('"') and resp_sql.endswith('"'):
            resp_sql = resp_sql[1:-1]

        # Remove triling \n
        resp_sql = resp_sql.rstrip()

        # Check if expected sql is given in JSON file or path of the output
        # file is given
        if 'expected_msql_file' in scenario:
            output_file = os.path.join(self.test_folder,
                                       scenario['expected_msql_file'])

            if os.path.exists(output_file):
                fp = open(output_file, "r")
                # Used rstrip to remove trailing \n
                sql = fp.read().rstrip()
                sql = self.preprocess_expected_sql(scenario, sql, resp_sql,
                                                   object_id)
                try:
                    self.assertEqual(sql, resp_sql)
                except Exception as e:
                    self.final_test_status = False
                    traceback.print_exc()
                    return False
            else:
                try:
                    self.assertFalse("Expected Modified SQL File not found")
                except Exception as e:
                    self.final_test_status = False
                    traceback.print_exc()
                    return False
        return True

    def check_re_sql(self, scenario, object_id):
        """
        This function is used to get the reverse engineered SQL.
        :param scenario:
        :param object_id:
        :return:
        """

        sql_url = self.get_url(scenario['sql_endpoint'], object_id)
        response = self.tester.get(sql_url)

        try:
            self.assertEqual(response.status_code, 200)
        except Exception as e:

            self.final_test_status = False
            traceback.print_exc()
            return False

        resp_sql = response.data.decode('unicode_escape')

        # Remove first and last double quotes
        if resp_sql.startswith('"') and resp_sql.endswith('"'):
            resp_sql = resp_sql[1:-1]

        # Remove triling \n
        resp_sql = resp_sql.rstrip()

        # Check if expected sql is given in JSON file or path of the output
        # file is given
        if 'expected_sql_file' in scenario:
            output_file = os.path.join(self.test_folder,
                                       scenario['expected_sql_file'])

            if os.path.exists(output_file):
                fp = open(output_file, "r")
                # Used rstrip to remove trailing \n
                sql = fp.read().rstrip()
                sql = self.preprocess_expected_sql(scenario, sql, resp_sql,
                                                   object_id)
                try:
                    self.assertEqual(sql, resp_sql)
                except Exception as e:
                    self.final_test_status = False
                    traceback.print_exc()
                    return False
            else:
                try:
                    self.assertFalse("Expected SQL File not found")
                except Exception as e:
                    self.final_test_status = False
                    traceback.print_exc()
                    return False
        elif 'expected_sql' in scenario:
            exp_sql = scenario['expected_sql']
            exp_sql = self.preprocess_expected_sql(scenario, exp_sql, resp_sql,
                                                   object_id)
            try:
                self.assertEqual(exp_sql, resp_sql)
            except Exception as e:
                self.final_test_status = False
                traceback.print_exc()
                return False

        return True

    def check_precondition(self, precondition_sql, use_test_config_db_conn):
        """
        This method executes precondition_sql and returns appropriate result
        :param precondition_sql: SQL query in format select count(*) from ...
        :return: True/False depending on precondition_sql result
        """
        precondition_flag = False
        if not use_test_config_db_conn:
            self.get_db_connection()
            pg_cursor = self.connection.cursor()
        else:
            pg_cursor = self.test_config_db_conn.cursor()

        try:
            pg_cursor.execute(precondition_sql)
            precondition_result = pg_cursor.fetchone()
            if len(precondition_result) >= 1 and precondition_result[0] == '1':
                precondition_flag = True
        except Exception as e:
            traceback.print_exc()
        pg_cursor.close()
        return precondition_flag

    def check_schema_precondition(self, scenario):
        """
        This function will check the given schema is exist or not. If exist
        then fetch the oid and if not then create it.

        :param scenario:
        :return:
        """
        if 'type' in scenario and scenario['type'] == 'create':
            # Get the url and create the specific node.

            if 'data' in scenario and 'schema' in scenario['data']:
                # If schema is already exist then fetch the oid
                self.get_db_connection()
                schema = regression.schema_utils.verify_schemas(
                    self.server, self.db_name,
                    scenario['data']['schema']
                )

                if schema:
                    self.schema_id = schema[0]
                else:
                    # If schema doesn't exist then create it
                    schema = regression.schema_utils.create_schema(
                        self.connection,
                        scenario['data']['schema'])
                    self.schema_id = schema[0]
            else:
                self.schema_id = self.server_information['schema_id']

            if 'data' in scenario and 'schema_id' in scenario['data'] and \
                scenario['data']['schema_id'] == \
                    self.JSON_PLACEHOLDERS['schema_id']:
                scenario['data']['schema'] = self.schema_id

    def convert_timestamptz(self, scenario, sql):
        """
        This function will convert the given timestamptz with database
        servers timestamptz and replace that in given sql.
        :param scenario:
        :param sql:
        :return:
        """
        if 'convert_timestamp_columns' in scenario:
            col_list = list()
            key_attr = ''
            is_tz_columns_list = False
            tz_index = 0
            if isinstance(scenario['convert_timestamp_columns'], dict):
                for key, value in scenario[
                        'convert_timestamp_columns'].items():
                    col_list = scenario['convert_timestamp_columns'][key]
                    key_attr = key
                    break
            else:
                col_list = scenario['convert_timestamp_columns']
                is_tz_columns_list = True

            for col in col_list:
                if ('data' in scenario and col in scenario['data']) or \
                    (key_attr and 'data' in scenario and 'type' in
                     scenario and scenario['type'] == 'create' and col in
                     scenario['data'][key_attr][0]) or \
                    (key_attr and 'data' in scenario and 'type' in
                     scenario and scenario['type'] == 'alter' and col in
                     scenario['data'][key_attr]['added'][0]):
                    self.get_db_connection()
                    pg_cursor = self.connection.cursor()
                    try:
                        if is_tz_columns_list:
                            query = "SELECT timestamp with time zone '" \
                                    + scenario['data'][col] + "'"
                        elif scenario['type'] == 'create':
                            query = "SELECT timestamp with time zone '" \
                                    + scenario['data'][key_attr][0][col] + "'"
                        else:
                            query = "SELECT timestamp with time zone '" \
                                    + scenario['data'][key_attr][
                                        'added'][0][col] + "'"

                        pg_cursor.execute(query)
                        converted_tz = pg_cursor.fetchone()
                        if len(converted_tz) >= 1:
                            tz_index = tz_index + 1
                            tz_str = "timestamptz_{0}".format(tz_index)
                            sql = sql.replace(
                                self.JSON_PLACEHOLDERS[tz_str],
                                converted_tz[0])
                    except Exception as e:
                        traceback.print_exc()
                    pg_cursor.close()

        return sql

    def store_object_ids(self, object_id, object_data, endpoint):
        """
        This functions will store the object id based on endpoints
        :param object_id: Object id of the created node
        :param object_name: Object name
        :param endpoint:
        :return:
        """
        object_name = object_data.get('name', '')
        if endpoint.__contains__("NODE-table"):
            self.parent_ids['tid'] = object_id
        elif endpoint.__contains__("NODE-foreign_data_wrapper"):
            self.parent_ids['fid'] = object_id
        elif endpoint.__contains__("NODE-foreign_server"):
            self.parent_ids['fsid'] = object_id
        elif endpoint.__contains__("NODE-role.obj"):
            object_name = object_data['rolname']

        # Store object id with object name
        self.all_object_ids[object_name] = object_id

    def preprocess_data(self, data):
        """
        This function iterate through data and check for any place holder
        starts with '<' and ends with '>' and replace with respective object
        ids.
        :param data: Data
        :return:
        """

        if isinstance(data, dict):
            for key, val in data.items():
                if isinstance(val, dict) or isinstance(val, list):
                    data[key] = self.preprocess_data(val)
                else:
                    data[key] = self.replace_placeholder_with_id(val)
        elif isinstance(data, list):
            ret_list = []
            for item in data:
                if isinstance(item, dict) or isinstance(item, list):
                    ret_list.append(self.preprocess_data(item))
                else:
                    ret_list.append(self.replace_placeholder_with_id(item))
            return ret_list

        return data

    def preprocess_expected_sql(self, scenario, sql, resp_sql, object_id):
        """
        This function preprocesses expected sql before comparing
        it with response sql.
        :param data: sql
        :param data: resp_sql
        :return:
        """
        # Replace place holder <owner> with the current username
        # used to connect to the database
        if 'username' in self.server:
            sql = sql.replace(self.JSON_PLACEHOLDERS['owner'],
                              self.server['username'])
        # Convert timestamp with timezone from json file to the
        # database server's correct timestamp
        sql = self.convert_timestamptz(scenario, sql)

        # extract password fields from response and replace in expected
        # to match the response
        if 'replace_password' in scenario:
            password = ''
            for line in resp_sql.split('\n'):
                if 'PASSWORD' in line:
                    found = re.search("'([\w\W]*)'", line)
                    if found:
                        password = found.groups(0)[0]
                    break

            sql = sql.replace(self.JSON_PLACEHOLDERS['password'], password)

        if 'replace_regex_pattern' in scenario:
            for a_patten in scenario['replace_regex_pattern']:
                found = re.findall(a_patten, resp_sql)
                if len(found) > 0:
                    sql = re.sub(a_patten, found[0], sql)

        # Replace place holder <owner> with the current username
        # used to connect to the database
        if 'pga_job_id' in scenario:
            sql = sql.replace(self.JSON_PLACEHOLDERS['pga_job_id'],
                              str(object_id))

        return sql

    def replace_placeholder_with_id(self, value):
        """
        This function is used to replace the place holder with id.
        :param value:
        :return:
        """

        if isinstance(value, str) and \
                value.startswith('<') and value.endswith('>'):
            # Remove < and > from the string
            temp_value = value[1:-1]
            # Find the place holder OID in dictionary
            if temp_value in self.all_object_ids:
                return self.all_object_ids[temp_value]
        return value
