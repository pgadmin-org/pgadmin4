##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" This file collect all modules/files present in tests directory and add
them to TestSuite. """
from __future__ import print_function

import argparse
import atexit
import logging
import os
import signal
import sys
import traceback
import json
import random
import coverage

import unittest

if sys.version_info[0] >= 3:
    import builtins
else:
    import __builtin__ as builtins

# Ensure the global server mode is set.
builtins.SERVER_MODE = None

logger = logging.getLogger(__name__)
file_name = os.path.basename(__file__)

from testscenarios import scenarios

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))

# Set sys path to current directory so that we can import pgadmin package
root = os.path.dirname(CURRENT_PATH)

if sys.path[0] != root:
    sys.path.insert(0, root)
    os.chdir(root)

from pgadmin import create_app
import config

COVERAGE_CONFIG_FILE = os.path.join(CURRENT_PATH, ".coveragerc")

if config.SERVER_MODE is True:
    config.SECURITY_RECOVERABLE = True
    config.SECURITY_CHANGEABLE = True
    config.SECURITY_POST_CHANGE_VIEW = 'browser.change_password'

# disable master password for test cases
config.MASTER_PASSWORD_REQUIRED = False

from regression import test_setup
from regression.feature_utils.app_starter import AppStarter

# Delete SQLite db file if exists
if os.path.isfile(config.TEST_SQLITE_PATH):
    os.remove(config.TEST_SQLITE_PATH)

os.environ["PGADMIN_TESTING_MODE"] = "1"

# Disable upgrade checks - no need during testing, and it'll cause an error
# if there's no network connection when it runs.
config.UPGRADE_CHECK_ENABLED = False

pgadmin_credentials = test_setup.config_data

# Set environment variables for email and password
os.environ['PGADMIN_SETUP_EMAIL'] = ''
os.environ['PGADMIN_SETUP_PASSWORD'] = ''
if pgadmin_credentials:
    if 'pgAdmin4_login_credentials' in pgadmin_credentials:
        if all(item in pgadmin_credentials['pgAdmin4_login_credentials']
               for item in ['login_username', 'login_password']):
            pgadmin_credentials = pgadmin_credentials[
                'pgAdmin4_login_credentials']
            os.environ['PGADMIN_SETUP_EMAIL'] = str(pgadmin_credentials[
                'login_username'])
            os.environ['PGADMIN_SETUP_PASSWORD'] = str(pgadmin_credentials[
                'login_password'])

# Execute the setup file
exec(open("setup.py").read())

# Get the config database schema version. We store this in pgadmin.model
# as it turns out that putting it in the config files isn't a great idea
from pgadmin.model import SCHEMA_VERSION

# Delay the import test_utils as it needs updated config.SQLITE_PATH
from regression.python_test_utils import test_utils
from regression.python_test_utils.csrf_test_client import TestClient

config.SETTINGS_SCHEMA_VERSION = SCHEMA_VERSION

# Override some other defaults
from logging import WARNING

config.CONSOLE_LOG_LEVEL = WARNING

# Create the app
app = create_app()

app.PGADMIN_INT_KEY = ''
app.config.update({'SESSION_COOKIE_DOMAIN': None})
driver = None
app_starter = None
handle_cleanup = None
app.PGADMIN_RUNTIME = True
if config.SERVER_MODE is True:
    app.PGADMIN_RUNTIME = False
app.config['WTF_CSRF_ENABLED'] = True
app.test_client_class = TestClient
test_client = app.test_client()
test_client.setApp(app)

setattr(unittest.result.TestResult, "passed", [])

unittest.runner.TextTestResult.addSuccess = test_utils.add_success

# Override apply_scenario method as we need custom test description/name
scenarios.apply_scenario = test_utils.apply_scenario


def get_suite(module_list, test_server, test_app_client, server_information,
              test_db_name):
    """
     This function add the tests to test suite and return modified test suite
      variable.
    :param server_information:
    :param module_list: test module list
    :type module_list: list
    :param test_server: server details
    :type test_server: dict
    :param test_app_client: test client
    :type test_app_client: pgadmin app object
    :return pgadmin_suite: test suite with test cases
    :rtype: TestSuite
    """
    modules = []
    pgadmin_suite = unittest.TestSuite()

    # Get the each test module and add into list
    for key, klass in module_list:
        # Separate each test class from list of classes and store in modules
        for item in klass:
            gen = item
            modules.append(gen)

    # Set the test client to each module & generate the scenarios
    for module in modules:
        obj = module()
        obj.setApp(app)
        obj.setTestClient(test_app_client)
        obj.setTestServer(test_server)
        obj.setDriver(driver)
        obj.setServerInformation(server_information)
        obj.setTestDatabaseName(test_db_name)
        scenario = scenarios.generate_scenarios(obj)
        pgadmin_suite.addTests(scenario)

    return pgadmin_suite


def get_test_modules(arguments):
    """
     This function loads the all modules in the tests directory into testing
     environment.

    :param arguments: this is command line arguments for module name to
    which test suite will run
    :type arguments: dict
    :return module list: test module list
    :rtype: list
    """

    from pgadmin.utils.route import TestsGeneratorRegistry

    exclude_pkgs = []
    global driver, app_starter, handle_cleanup

    if not config.SERVER_MODE:
        # following test cases applicable only for server mode
        exclude_pkgs.extend([
            "browser.tests.test_change_password",
            "browser.tests.test_gravatar_image_display",
            "browser.tests.test_login",
            "browser.tests.test_logout",
            "browser.tests.test_reset_password",
        ])
    if arguments['exclude'] is not None:
        exclude_pkgs += arguments['exclude'].split(',')

    if 'feature_tests' not in exclude_pkgs and \
            (arguments['pkg'] is None or arguments['pkg'] == "all" or
             arguments['pkg'] == "feature_tests"):

        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.common.desired_capabilities import \
            DesiredCapabilities

        default_browser = 'chrome'

        # Check default browser provided through command line. If provided
        # then use that browser as default browser else check for the setting
        # provided in test_config.json file.
        if (
            'default_browser' in arguments and
            arguments['default_browser'] is not None
        ):
            default_browser = arguments['default_browser'].lower()
        elif (
            test_setup.config_data and
            "default_browser" in test_setup.config_data
        ):
            default_browser = test_setup.config_data['default_browser'].lower()

        if default_browser == 'firefox':
            cap = DesiredCapabilities.FIREFOX
            cap['requireWindowFocus'] = True
            cap['enablePersistentHover'] = False
            profile = webdriver.FirefoxProfile()
            profile.set_preference("dom.disable_beforeunload", True)
            driver = webdriver.Firefox(capabilities=cap,
                                       firefox_profile=profile)
            driver.implicitly_wait(1)
        else:
            options = Options()
            if test_setup.config_data:
                if 'headless_chrome' in test_setup.config_data:
                    if test_setup.config_data['headless_chrome']:
                        options.add_argument("--headless")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-setuid-sandbox")
            options.add_argument("--window-size=1280,1024")
            options.add_argument("--disable-infobars")
            options.add_experimental_option('w3c', False)
            driver = webdriver.Chrome(chrome_options=options)

        # maximize browser window
        driver.maximize_window()

        app_starter = AppStarter(driver, config)
        app_starter.start_app()

    handle_cleanup = test_utils.get_cleanup_handler(test_client, app_starter)
    # Register cleanup function to cleanup on exit
    atexit.register(handle_cleanup)

    # Load the test modules which are in given package(i.e. in arguments.pkg)
    if arguments['pkg'] is None or arguments['pkg'] == "all":
        TestsGeneratorRegistry.load_generators('pgadmin', exclude_pkgs)
    elif arguments['pkg'] is not None and arguments['pkg'] == "resql":
        for_modules = []
        if arguments['modules'] is not None:
            for_modules = arguments['modules'].split(',')

        # Load the reverse engineering sql test module
        TestsGeneratorRegistry.load_generators('pgadmin', exclude_pkgs,
                                               for_modules, is_resql_only=True)
    else:
        for_modules = []
        if arguments['modules'] is not None:
            for_modules = arguments['modules'].split(',')

        TestsGeneratorRegistry.load_generators('pgadmin.%s' %
                                               arguments['pkg'],
                                               exclude_pkgs,
                                               for_modules)

    # Sort module list so that test suite executes the test cases sequentially
    module_list = TestsGeneratorRegistry.registry.items()
    module_list = sorted(module_list, key=lambda module_tuple: module_tuple[0])
    return module_list


def add_arguments():
    """
    This function parse the command line arguments(project's package name
    e.g. browser) & add into parser

    :return args: command line argument for pgadmin's package name
    :rtype: argparse namespace
    """

    parser = argparse.ArgumentParser(description='Test suite for pgAdmin4')
    parser.add_argument(
        '--pkg',
        help='Executes the test cases of particular package and subpackages'
    )
    parser.add_argument(
        '--exclude',
        help='Skips execution of the test cases of particular package and '
             'sub-packages'
    )
    parser.add_argument('--coverage', nargs='?', const=True, type=bool,
                        default=False, help='Enable code coverage feature')
    parser.add_argument(
        '--default_browser',
        help='Executes the feature test in specific browser'
    )
    parser.add_argument(
        '--modules',
        help='Executes the feature test for specific modules in pkg'
    )
    arg = parser.parse_args()

    return arg


def sig_handler(signo, frame):
    global handle_cleanup
    if handle_cleanup:
        handle_cleanup()


def update_test_result(test_cases, test_result_dict):
    """
    This function update the test result in appropriate test behaviours i.e
    passed/failed/skipped.
    :param test_cases: test cases
    :type test_cases: dict
    :param test_result_dict: test result to be stored
    :type test_result_dict: dict
    :return: None
    """
    for test_case in test_cases:
        test_class_name = test_case[0].__class__.__name__
        test_scenario_name = getattr(
            test_case[0], 'scenario_name', str(test_case[0])
        )
        if test_class_name in test_result_dict:
            test_result_dict[test_class_name].append(
                {test_scenario_name: test_case[1]})
        else:
            test_result_dict[test_class_name] = \
                [{test_scenario_name: test_case[1]}]


def get_tests_result(test_suite):
    """This function returns the total ran and total failed test cases count"""
    try:
        total_ran = test_suite.testsRun
        passed_cases_result = {}
        failed_cases_result = {}
        skipped_cases_result = {}
        if total_ran:
            passed = test_suite.passed
            failures = test_suite.failures
            errors = test_suite.errors
            skipped = test_suite.skipped
            if passed:
                update_test_result(passed, passed_cases_result)
            if failures:
                update_test_result(failures, failed_cases_result)
            if errors:
                update_test_result(errors, failed_cases_result)
            if skipped:
                update_test_result(skipped, skipped_cases_result)

        return total_ran, failed_cases_result, skipped_cases_result, \
            passed_cases_result
    except Exception:
        traceback.print_exc(file=sys.stderr)


class StreamToLogger(object):
    def __init__(self, logger, log_level=logging.INFO):
        self.terminal = sys.stderr
        self.logger = logger
        self.log_level = log_level
        self.linebuf = ''

    def write(self, buf):
        """
        This function writes the log in the logger file as well as on console

        :param buf: log message
        :type buf: str
        :return: None
        """

        self.terminal.write(buf)
        for line in buf.rstrip().splitlines():
            self.logger.log(self.log_level, line.rstrip())

    def flush(self):
        pass


if __name__ == '__main__':
    # Failure detected?
    failure = False
    test_result = dict()
    cov = None

    # Set signal handler for cleanup
    signal_list = dir(signal)
    required_signal_list = ['SIGTERM', 'SIGABRT', 'SIGQUIT', 'SIGINT']
    # Get the OS wise supported signals
    supported_signal_list = [sig for sig in required_signal_list if
                             sig in signal_list]
    for sig in supported_signal_list:
        signal.signal(getattr(signal, sig), sig_handler)

    # Set basic logging configuration for log file
    fh = logging.FileHandler(CURRENT_PATH + '/' +
                             'regression.log', 'w', 'utf-8')
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(logging.Formatter(config.FILE_LOG_FORMAT))

    logger = logging.getLogger()
    logger.addHandler(fh)

    # Create logger to write log in the logger file as well as on console
    stderr_logger = logging.getLogger('STDERR')
    sys.stderr = StreamToLogger(stderr_logger, logging.ERROR)
    args = vars(add_arguments())
    # Get test module list
    try:
        test_module_list = get_test_modules(args)
    except Exception as e:
        print(str(e))
        sys.exit(1)
    # Login the test client
    test_utils.login_tester_account(test_client)

    servers_info = test_utils.get_config_data()
    node_name = "all"
    if args['pkg'] is not None:
        node_name = args['pkg'].split('.')[-1]

    # Start coverage
    if test_utils.is_coverage_enabled(args):
        cov = coverage.Coverage(config_file=COVERAGE_CONFIG_FILE)
        cov.start()

    try:
        for server in servers_info:
            print("\n=============Running the test cases for '%s'============="
                  % server['name'], file=sys.stderr)
            # Create test server
            server_information = test_utils.create_parent_server_node(server)

            # Create test database with random number to avoid conflict in
            # parallel execution on different platforms. This database will be
            # used across all feature tests.
            test_db_name = "acceptance_test_db" + \
                           str(random.randint(10000, 65535))
            connection = test_utils.get_db_connection(
                server['db'],
                server['username'],
                server['db_password'],
                server['host'],
                server['port'],
                server['sslmode']
            )

            # Add the server version in server information
            server_information['server_version'] = connection.server_version
            server_information['type'] = server['type']

            # Drop the database if already exists.
            test_utils.drop_database(connection, test_db_name)
            # Create database
            test_utils.create_database(server, test_db_name)
            # Configure preferences for the test cases
            test_utils.configure_preferences(
                default_binary_path=server['default_binary_paths'])

            suite = get_suite(test_module_list,
                              server,
                              test_client,
                              server_information, test_db_name)
            tests = unittest.TextTestRunner(stream=sys.stderr,
                                            descriptions=True,
                                            verbosity=2).run(suite)

            ran_tests, failed_cases, skipped_cases, passed_cases = \
                get_tests_result(tests)
            test_result[server['name']] = [ran_tests, failed_cases,
                                           skipped_cases, passed_cases]

            # Set empty list for 'passed' parameter for each testRun.
            # So that it will not append same test case name
            unittest.result.TestResult.passed = []

            if len(failed_cases) > 0:
                failure = True

            # Drop the testing database created initially
            if connection:
                test_utils.drop_database(connection, test_db_name)
                connection.close()

            # Delete test server
            test_utils.delete_test_server(test_client)
    except SystemExit:
        if handle_cleanup:
            handle_cleanup()

    print(
        "\n==============================================================="
        "=======",
        file=sys.stderr
    )
    print("Test Result Summary", file=sys.stderr)
    print(
        "==================================================================="
        "===\n", file=sys.stderr
    )

    test_result_json = {}
    for server_res in test_result:
        failed_cases = test_result[server_res][1]
        skipped_cases = test_result[server_res][2]
        passed_cases = test_result[server_res][3]
        skipped_cases, skipped_cases_json = test_utils.get_scenario_name(
            skipped_cases)
        failed_cases, failed_cases_json = test_utils.get_scenario_name(
            failed_cases)

        total_failed = len(dict((key, value) for key, value in
                                failed_cases.items()).values())
        total_skipped = len(dict((key, value) for key, value in
                                 skipped_cases.items()).values())
        total_passed_cases = int(
            test_result[server_res][0]) - total_failed - total_skipped

        print(
            "%s:\n\n\t%s test%s passed\n\t%s test%s failed%s%s"
            "\n\t%s test%s skipped%s%s\n" %
            (server_res, total_passed_cases,
             (total_passed_cases != 1 and "s" or ""),
             total_failed, (total_failed != 1 and "s" or ""),
             (total_failed != 0 and ":\n\t\t" or ""),
             "\n\t\t".join("{0} ({1})".format(key, ",\n\t\t\t\t\t".join(
                 map(str, value))) for key, value in failed_cases.items()),
             total_skipped, (total_skipped != 1 and "s" or ""),
             (total_skipped != 0 and ":\n\t\t" or ""),
             "\n\t\t".join("{0} ({1})".format(key, ",\n\t\t\t\t\t".join(
                 map(str, value))) for key, value in skipped_cases.items())),
            file=sys.stderr)

        temp_dict_for_server = {
            server_res: {
                "tests_passed": [total_passed_cases, passed_cases],
                "tests_failed": [total_failed, failed_cases_json],
                "tests_skipped": [total_skipped, skipped_cases_json]
            }
        }
        test_result_json.update(temp_dict_for_server)

    # Dump test result into json file
    json_file_path = CURRENT_PATH + "/test_result.json"
    with open(json_file_path, 'w') as outfile:
        json.dump(test_result_json, outfile, indent=2)

    print(
        "==================================================================="
        "===\n",
        file=sys.stderr
    )

    # Stop code coverage
    if test_utils.is_coverage_enabled(args):
        cov.stop()
        cov.save()

    # # Print coverage only if coverage args given in command line
    if test_utils.is_coverage_enabled(args):
        test_utils.print_and_store_coverage_report(cov)

    print("Please check output in file: %s/regression.log\n" % CURRENT_PATH)

    # Unset environment variable
    del os.environ["PGADMIN_TESTING_MODE"]

    if failure:
        sys.exit(1)
    else:
        sys.exit(0)
