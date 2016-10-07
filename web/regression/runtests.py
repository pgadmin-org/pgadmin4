#############################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################

""" This file collect all modules/files present in tests directory and add
them to TestSuite. """
from __future__ import print_function
import argparse
import os
import sys
import signal
import atexit
import logging
import traceback

if sys.version_info < (2, 7):
    import unittest2 as unittest
else:
    import unittest

logger = logging.getLogger(__name__)
file_name = os.path.basename(__file__)

from testscenarios.scenarios import generate_scenarios

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))

# Set sys path to current directory so that we can import pgadmin package
root = os.path.dirname(CURRENT_PATH)

if sys.path[0] != root:
    sys.path.insert(0, root)
    os.chdir(root)

from pgadmin import create_app
import config
from regression import test_setup

# Delete SQLite db file if exists
if os.path.isfile(config.TEST_SQLITE_PATH):
    os.remove(config.TEST_SQLITE_PATH)

config.TESTING_MODE = True
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
            os.environ['PGADMIN_SETUP_EMAIL'] = pgadmin_credentials[
                'login_username']
            os.environ['PGADMIN_SETUP_PASSWORD'] = pgadmin_credentials[
                'login_password']

# Execute the setup file
exec (open("setup.py").read())

# Get the config database schema version. We store this in pgadmin.model
# as it turns out that putting it in the config files isn't a great idea
from pgadmin.model import SCHEMA_VERSION

# Delay the import test_utils as it needs updated config.SQLITE_PATH
from regression import test_utils

config.SETTINGS_SCHEMA_VERSION = SCHEMA_VERSION

# Override some other defaults
from logging import WARNING

config.CONSOLE_LOG_LEVEL = WARNING

# Create the app
app = create_app()
app.config['WTF_CSRF_ENABLED'] = False
test_client = app.test_client()
drop_objects = test_utils.get_cleanup_handler(test_client)


def get_suite(module_list, test_server, test_app_client):
    """
     This function add the tests to test suite and return modified test suite
      variable.
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
        gen = klass
        modules.append(gen)

    # Set the test client to each module & generate the scenarios
    for module in modules:
        obj = module()
        obj.setApp(app)
        obj.setTestClient(test_app_client)
        obj.setTestServer(test_server)
        scenario = generate_scenarios(obj)
        pgadmin_suite.addTests(scenario)

    return pgadmin_suite


def get_test_modules(arguments):
    """
     This function loads the all modules in the tests directory into testing
     environment.

    :param arguments: this is command line arguments for module name to
    which test suite will run
    :type arguments: str
    :return module list: test module list
    :rtype: list
    """

    from pgadmin.utils.route import TestsGeneratorRegistry

    # Load the test modules which are in given package(i.e. in arguments.pkg)
    if arguments['pkg'] is None or arguments['pkg'] == "all":
        TestsGeneratorRegistry.load_generators('pgadmin')
    else:
        TestsGeneratorRegistry.load_generators('pgadmin.%s.tests' %
                                               arguments['pkg'])

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
    parser.add_argument('--pkg', help='Executes the test cases of particular'
                                      ' package')
    arg = parser.parse_args()

    return arg


def sig_handler(signo, frame):
    drop_objects()


def get_tests_result(test_suite):
    """This function returns the total ran and total failed test cases count"""
    try:
        total_ran = test_suite.testsRun
        failed_cases_result = []
        skipped_cases_result = []
        if total_ran:
            if test_suite.failures:
                for failed_case in test_suite.failures:
                    class_name = str(
                        failed_case[0]).split('.')[-1].split()[0].strip(')')
                    failed_cases_result.append(class_name)
            if test_suite.errors:
                for error_case in test_suite.errors:
                    class_name = str(
                        error_case[0]).split('.')[-1].split()[0].strip(')')
                    if class_name not in failed_cases_result:
                        failed_cases_result.append(class_name)
            if test_suite.skipped:
                for skip_test in test_suite.skipped:
                    class_name = str(
                        skip_test[0]).split('.')[-1].split()[0].strip(')')
                    if class_name not in failed_cases_result:
                        skipped_cases_result.append(class_name)
        return total_ran, failed_cases_result, skipped_cases_result
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
    test_result = dict()
    # Register cleanup function to cleanup on exit
    atexit.register(drop_objects)
    # Set signal handler for cleanup
    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGABRT, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGQUIT, sig_handler)

    # Set basic logging configuration for log file
    logging.basicConfig(level=logging.DEBUG,
                        format='%(asctime)s:%(levelname)s:%(name)s:%(message)s'
                        ,
                        filename=CURRENT_PATH + "/" + "regression.log",
                        filemode='w'
                        )

    # Create logger to write log in the logger file as well as on console
    stderr_logger = logging.getLogger('STDERR')
    sys.stderr = StreamToLogger(stderr_logger, logging.ERROR)
    args = vars(add_arguments())
    # Get test module list
    test_module_list = get_test_modules(args)
    # Login the test client
    test_utils.login_tester_account(test_client)

    servers_info = test_utils.get_config_data()
    node_name = "all"
    if args['pkg'] is not None:
        node_name = args['pkg'].split('.')[-1]
    try:
        for server in servers_info:
            print("\n=============Running the test cases for '%s'============="
                  % server['name'], file=sys.stderr)
            # Create test server
            test_utils.create_parent_server_node(server, node_name)

            suite = get_suite(test_module_list, server, test_client)
            tests = unittest.TextTestRunner(stream=sys.stderr,
                                            descriptions=True,
                                            verbosity=2).run(suite)

            ran_tests, failed_cases, skipped_cases = \
                get_tests_result(tests)
            test_result[server['name']] = [ran_tests, failed_cases,
                                           skipped_cases]
            # Delete test server
            # test_utils.delete_test_server(test_client)
    except SystemExit:
        drop_objects()

    print("\n==============================================================="
          "=======", file=sys.stderr)
    print("Test Result Summary", file=sys.stderr)
    print(
        "==================================================================="
        "===\n", file=sys.stderr)
    for server_res in test_result:
        failed_cases = "\n\t\t".join(test_result[server_res][1])
        skipped_cases = "\n\t\t".join(test_result[server_res][2])
        total_failed = len(test_result[server_res][1])
        total_skipped = len(test_result[server_res][2])
        total_passed_cases = int(
            test_result[server_res][0]) - total_failed - total_skipped

        print(
            "%s:\n\n\t%s test%s passed\n\t%s test%s failed%s%s"
            "\n\t%s test%s skipped%s%s\n" %
            (server_res, total_passed_cases,
             (total_passed_cases != 1 and "s" or ""),
             total_failed, (total_failed != 1 and "s" or ""),
             (total_failed != 0 and ":\n\t\t" or ""), failed_cases,
             total_skipped, (total_skipped != 1 and "s" or ""),
             (total_skipped != 0 and ":\n\t\t" or ""), skipped_cases),
            file=sys.stderr)

    print(
        "==================================================================="
        "===\n", file=sys.stderr)

    print("Please check output in file: %s/regression.log\n" % CURRENT_PATH)
