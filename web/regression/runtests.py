##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" This file collect all modules/files present in tests directory and add
them to TestSuite. """

import argparse
import atexit
import logging
import os
import signal
import sys
import traceback
import json
import secrets
import threading
import time
import unittest

if sys.version_info < (3, 4):
    raise RuntimeError('The test suite must be run under Python 3.4 or later.')

import builtins

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
if pgadmin_credentials and \
    'pgAdmin4_login_credentials' in pgadmin_credentials and \
        all(item in pgadmin_credentials['pgAdmin4_login_credentials']
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
from pgadmin.utils.constants import LDAP

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

# Authentication sources
app.PGADMIN_EXTERNAL_AUTH_SOURCE = LDAP

app.test_client_class = TestClient
test_client = app.test_client()
test_client.setApp(app)


class CaptureMail:
    # A hack Mail service that simply captures what would be sent.
    def __init__(self, app):
        app.extensions["mail"] = self
        self.sent = []
        self.ascii_attachments = []

    def send(self, msg):
        self.sent.append(msg.body)

    def pop(self):
        if len(self.sent):
            return self.sent.pop(0)
        return None


CaptureMail(app)

setattr(unittest.result.TestResult, "passed", [])

unittest.runner.TextTestResult.addSuccess = test_utils.add_success

# Override apply_scenario method as we need custom test description/name
scenarios.apply_scenario = test_utils.apply_scenario


def get_suite(module_list, test_server, test_app_client, server_information,
              test_db_name, driver_passed, parallel_ui_test):
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
    :param driver_passed: driver object to run selenium tests
    :type driver_passed: webdriver object
    :param parallel_ui_test: whether ui tests to be run in parallel
    :type parallel_ui_test: boolan
    :param test_db_name: database name
    :type test_db_name: string
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
        obj.setDriver(driver_passed)
        obj.setParallelUI_tests(parallel_ui_test)
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
            "browser.tests.test_ldap_login",
            "browser.tests.test_ldap_with_mocking",
        ])
    if arguments['exclude'] is not None:
        exclude_pkgs += arguments['exclude'].split(',')

    if 'feature_tests' not in exclude_pkgs and \
        (arguments['pkg'] is None or arguments['pkg'] == "all" or
         arguments['pkg'] == "feature_tests"):

        if arguments['pkg'] == "feature_tests":
            exclude_pkgs.extend(['resql'])

        if not test_utils.is_parallel_ui_tests(args):
            driver = setup_webdriver_specification(arguments)
            app_starter = AppStarter(driver, config)
            app_starter.start_app()

    handle_cleanup = test_utils.get_cleanup_handler(test_client, app_starter)
    # Register cleanup function to cleanup on exit
    atexit.register(handle_cleanup)

    # Load Test modules
    module_list = load_modules(arguments, exclude_pkgs)
    return module_list


def setup_webdriver_specification(arguments):
    """
    Method return web-driver object set up according to values passed
    in arguments
    :param arguments:
    :return: webdriver object
    """
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.desired_capabilities import \
        DesiredCapabilities

    default_browser = 'chrome'

    # Check default browser provided through command line. If provided
    # then use that browser as default browser else check for the
    # setting provided in test_config.json file.
    if (
        'default_browser' in arguments and
        arguments['default_browser'] is not None
    ):
        default_browser = arguments['default_browser'].lower()
    elif (
        test_setup.config_data and
        "default_browser" in test_setup.config_data
    ):
        default_browser = test_setup.config_data[
            'default_browser'].lower()

    if default_browser == 'firefox':
        cap = DesiredCapabilities.FIREFOX
        cap['requireWindowFocus'] = True
        cap['enablePersistentHover'] = False
        profile = webdriver.FirefoxProfile()
        profile.set_preference("dom.disable_beforeunload", True)
        driver_local = webdriver.Firefox(capabilities=cap,
                                         firefox_profile=profile)
        driver_local.implicitly_wait(1)
    else:
        options = Options()
        if test_setup.config_data and \
            'headless_chrome' in test_setup.config_data and \
                test_setup.config_data['headless_chrome']:
            options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-setuid-sandbox")
        options.add_argument("--window-size=1790,1080")
        options.add_argument("--disable-infobars")
        # options.add_experimental_option('w3c', False)
        driver_local = webdriver.Chrome(options=options)

    # maximize browser window
    driver_local.maximize_window()
    return driver_local


def load_modules(arguments, exclude_pkgs):
    """
    Method returns list of modules which is formed by removing packages from
    exclude_pkgs arguments.
    :param arguments:
    :param exclude_pkgs:
    :return:
    """
    from pgadmin.utils.route import TestsGeneratorRegistry
    # Load the test modules which are in given package(i.e. in arguments.pkg)
    for_modules = []
    if arguments['modules'] is not None:
        for_modules = arguments['modules'].split(',')

    if arguments['pkg'] is None or arguments['pkg'] == "all":
        TestsGeneratorRegistry.load_generators(arguments['pkg'],
                                               'pgadmin', exclude_pkgs)
    elif arguments['pkg'] is not None and arguments['pkg'] == "resql":
        # Load the reverse engineering sql test module
        TestsGeneratorRegistry.load_generators(arguments['pkg'],
                                               'pgadmin', exclude_pkgs,
                                               for_modules, is_resql_only=True)
    elif arguments['pkg'] is not None and arguments['pkg'] == "feature_tests":
        # Load the feature test module
        TestsGeneratorRegistry.load_generators(arguments['pkg'],
                                               'regression.%s' %
                                               arguments['pkg'],
                                               exclude_pkgs,
                                               for_modules)
    else:
        TestsGeneratorRegistry.load_generators(arguments['pkg'],
                                               'pgadmin.%s' %
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
    parser.add_argument(
        '--default_browser',
        help='Executes the feature test in specific browser'
    )
    parser.add_argument(
        '--modules',
        help='Executes the feature test for specific modules in pkg'
    )
    parser.add_argument('--parallel', nargs='?', const=True,
                        type=bool, default=False,
                        help='Enable parallel Feature Tests')
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


class StreamToLogger():
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
        # Function required to be implemented for logger
        pass


def execute_test(test_module_list_passed, server_passed, driver_passed,
                 parallel_ui_test=False):
    """
    Function executes actually test
    :param test_module_list_passed: test modules
    :param server_passed: serve details
    :param driver_passed: webdriver object
    :param parallel_ui_test: parallel ui tests
    :return:
    """
    try:
        print("\n=============Running the test cases for '%s' ============="
              % server_passed['name'], file=sys.stderr)
        # Create test server
        server_information = \
            test_utils.create_parent_server_node(server_passed)

        # Create test database with random number to avoid conflict in
        # parallel execution on different platforms. This database will be
        # used across all feature tests.
        test_db_name = "acceptance_test_db" + \
                       str(secrets.choice(range(10000, 65535)))
        connection = test_utils.get_db_connection(
            server_passed['db'],
            server_passed['username'],
            server_passed['db_password'],
            server_passed['host'],
            server_passed['port'],
            server_passed['sslmode']
        )

        # Add the server version in server information
        server_information['server_version'] = connection.server_version
        server_information['type'] = server_passed['type']

        # Drop the database if already exists.
        test_utils.drop_database(connection, test_db_name)

        # Create database
        test_utils.create_database(server_passed, test_db_name)

        # Configure preferences for the test cases
        test_utils.configure_preferences(
            default_binary_path=server_passed['default_binary_paths'])

        # Create user to run selenoid tests in parallel
        if parallel_ui_test:
            server_passed['login_details'] = \
                test_utils.create_users_for_parallel_tests(test_client)

        # Get unit test suit
        suite = get_suite(test_module_list_passed,
                          server_passed,
                          test_client,
                          server_information, test_db_name, driver_passed,
                          parallel_ui_test=parallel_ui_test)

        # Run unit test suit created
        tests = unittest.TextTestRunner(stream=sys.stderr,
                                        descriptions=True,
                                        verbosity=2).run(suite)

        # processing results
        ran_tests, failed_cases, skipped_cases, passed_cases = \
            get_tests_result(tests)

        # This is required when some tests are running parallel
        # & some sequential in case of parallel ui tests
        if threading.current_thread().getName() == "sequential_tests":
            try:
                if test_result[server_passed['name']][0] is not None:
                    ran_tests = test_result[server_passed['name']][0] + \
                        ran_tests
                    failed_cases.update(test_result[server_passed['name']][1])
                    skipped_cases.update(test_result[server_passed['name']][2])
                    passed_cases.update(test_result[server_passed['name']][3])
                test_result[server_passed['name']] = [ran_tests, failed_cases,
                                                      skipped_cases,
                                                      passed_cases]
            except KeyError:
                pass

        # Add final results server wise in test_result dict
        test_result[server_passed['name']] = [ran_tests, failed_cases,
                                              skipped_cases, passed_cases]

        # Set empty list for 'passed' parameter for each testRun.
        # So that it will not append same test case name
        # unittest.result.TestResult.passed = []

        # Drop the testing database created initially
        if connection:
            test_utils.drop_database(connection, test_db_name)
            connection.close()
        # Delete test server
        # test_utils.delete_test_server(test_client)
        test_utils.delete_server(test_client, server_information)
    except Exception as exc:
        traceback.print_exc(file=sys.stderr)
        print(str(exc))
        print("Exception in {0} {1}".format(
            threading.current_thread().ident,
            threading.current_thread().getName()))
        # Mark failure as true
        global failure
        failure = True
    finally:
        # Delete web-driver instance
        thread_name = "parallel_tests" + server_passed['name']
        if threading.current_thread().getName() == thread_name:
            test_utils.quit_webdriver(driver_passed)
            time.sleep(20)

        # Print info about completed tests
        print(
            "\n=============Completed the test cases for '%s'============="
            % server_passed['name'], file=sys.stderr)


def run_parallel_tests(url_client, servers_details, parallel_tests_lists,
                       name_of_browser, version_of_browser, max_thread_count):
    """
    Function used to run tests in parallel
    :param url_client:
    :param servers_details:
    :param parallel_tests_lists:
    :param name_of_browser:
    :param version_of_browser:
    :param max_thread_count:
    """
    driver_object = None
    try:
        # Thread list
        threads_list = []
        # Create thread for each server
        for ser in servers_details:
            while True:
                # If active thread count <= max_thread_count, add new thread
                if threading.active_count() <= max_thread_count:
                    # Get remote web-driver instance at server level
                    driver_object = \
                        test_utils.get_remote_webdriver(hub_url,
                                                        name_of_browser,
                                                        version_of_browser,
                                                        ser['name'],
                                                        url_client)
                    # Launch client url in browser
                    test_utils.launch_url_in_browser(
                        driver_object, url_client, timeout=60)

                    # Add name for thread
                    thread_name = "parallel_tests" + ser['name']

                    # Start thread
                    t = threading.Thread(target=execute_test, name=thread_name,
                                         args=(parallel_tests_lists, ser,
                                               driver_object, True))
                    threads_list.append(t)
                    t.start()
                    time.sleep(10)
                    break
                # else sleep for 10 seconds
                else:
                    time.sleep(10)

        # Start threads in parallel
        for t in threads_list:
            t.join()

    except Exception as exc:
        # Print exception stack trace
        traceback.print_exc(file=sys.stderr)
        print('Exception before starting tests for ' + ser['name'],
              file=sys.stderr)
        print(str(exc), file=sys.stderr)

        # Mark failure as true
        global failure
        failure = True

        # Clean driver object created
        if driver_object is not None:
            driver_object.quit()


def run_sequential_tests(url_client, servers_details, sequential_tests_lists,
                         name_of_browser, version_of_browser):
    """
    Function is used to execute tests that needs to be run in sequential
    manner.
    :param url_client:
    :param servers_details:
    :param sequential_tests_lists:
    :param name_of_browser:
    :param version_of_browser:
    :return:
    """
    driver_object = None
    try:
        # Get remote web-driver instance
        driver_object = test_utils.get_remote_webdriver(hub_url,
                                                        name_of_browser,
                                                        version_of_browser,
                                                        "Sequential_Tests",
                                                        url_client)

        # Launch client url in browser
        test_utils.launch_url_in_browser(driver_object, url_client)

        # Add name for thread
        thread_name = "sequential_tests"

        # Start thread
        for ser in servers_details:
            t = threading.Thread(target=execute_test,
                                 name=thread_name,
                                 args=(sequential_tests_lists, ser,
                                       driver_object, True))
            t.start()
            t.join()
    except Exception as exc:
        # Print exception stack trace
        traceback.print_exc(file=sys.stderr)
        print(str(exc))
    finally:
        # Clean driver object created
        test_utils.quit_webdriver(driver_object)


def print_test_results():
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

        total_failed = sum(list((len(value)) for key, value in
                                failed_cases.items()))
        total_skipped = sum(list((len(value)) for key, value in
                                 skipped_cases.items()))

        total_passed_cases = int(
            test_result[server_res][0]) - total_failed - total_skipped

        if len(failed_cases) > 0:
            global failure
            failure = True

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
    fh.setFormatter(logging.Formatter('[%(thread)d] ' +
                                      config.FILE_LOG_FORMAT))

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

    is_parallel_ui_tests = test_utils.is_parallel_ui_tests(args)
    # Check if feature tests included & parallel tests switch passed
    if test_utils.is_feature_test_included(args) and is_parallel_ui_tests:
        if config.SERVER_MODE:
            try:
                # Get selenium config dict
                selenoid_config = test_setup.config_data['selenoid_config']

                # Set DEFAULT_SERVER value
                default_server = selenoid_config['pgAdmin_default_server']
                os.environ["PGADMIN_CONFIG_DEFAULT_SERVER"] = str(
                    default_server)
                config.DEFAULT_SERVER = str(default_server)

                # Get hub url
                hub_url = selenoid_config['selenoid_url']

                # Get selenium grid status & list of available browser
                # out of passed
                selenium_grid_status, list_of_browsers = test_utils.\
                    get_selenium_grid_status_and_browser_list(hub_url, args)

                # Execute tests if selenium-grid is up
                if selenium_grid_status and len(list_of_browsers) > 0:
                    app_starter_local = None
                    # run across browsers
                    for browser_info in list_of_browsers:
                        try:
                            # browser info
                            browser_name, browser_version = \
                                test_utils.get_browser_details(browser_info,
                                                               hub_url)

                            # test lists can be executed in
                            # parallel & sequentially
                            parallel_tests, sequential_tests = \
                                test_utils.get_parallel_sequential_module_list(
                                    test_module_list)

                            # Print test summary
                            test_utils.print_test_summary(
                                test_module_list, parallel_tests,
                                sequential_tests,
                                browser_name, browser_version)

                            # Create app form source code
                            app_starter_local = AppStarter(None, config)
                            client_url = app_starter_local.start_app()

                            if config.DEBUG:
                                pgAdmin_wait_time = \
                                    selenoid_config['pgAdmin_max_up_time']
                                print('pgAdmin is launched with DEBUG=True, '
                                      'hence sleeping for %s seconds.',
                                      pgAdmin_wait_time,
                                      file=sys.stderr)

                                time.sleep(int(pgAdmin_wait_time))

                            # Running Parallel tests
                            if len(parallel_tests) > 0:
                                parallel_sessions = \
                                    int(selenoid_config[
                                        'max_parallel_sessions'])

                                run_parallel_tests(
                                    client_url, servers_info, parallel_tests,
                                    browser_name, browser_version,
                                    parallel_sessions)

                            # Sequential Tests
                            if len(sequential_tests) > 0:
                                run_sequential_tests(
                                    client_url, servers_info, sequential_tests,
                                    browser_name, browser_version)

                            # Clean up environment
                            if app_starter_local:
                                app_starter_local.stop_app()

                            # Pause before printing result in order
                            # not to mix output
                            time.sleep(5)

                            print(
                                "\n============= Test execution with {0} is "
                                "completed.=============".format(browser_name),
                                file=sys.stderr)
                            print_test_results()

                        except SystemExit:
                            if app_starter_local:
                                app_starter_local.stop_app()
                            if handle_cleanup:
                                handle_cleanup()
                            raise
                else:
                    print(
                        "\n============= Either Selenium Grid is NOT up OR"
                        " browser list is 0 =============", file=sys.stderr)
                    failure = True
            except Exception as exc:
                # Print exception stack trace
                traceback.print_exc(file=sys.stderr)
                print(str(exc))
                failure = True
            del os.environ["PGADMIN_CONFIG_DEFAULT_SERVER"]
        else:
            print(
                "\n============= Please Turn on Server Mode to run selenoid "
                "tests =============", file=sys.stderr)
            failure = True
    else:
        try:
            for server in servers_info:
                thread = threading.Thread(target=execute_test, args=(
                    test_module_list, server, driver))
                thread.start()
                thread.join()
        except SystemExit:
            if handle_cleanup:
                handle_cleanup()
            raise
        print_test_results()

    print("Please check output in file: %s/regression.log\n" % CURRENT_PATH)

    # Unset environment variable
    del os.environ["PGADMIN_TESTING_MODE"]

    if failure:
        sys.exit(1)
    else:
        sys.exit(0)
