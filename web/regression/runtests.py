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
import unittest
import logging

from testscenarios.scenarios import generate_scenarios

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))

# Set sys path to current directory so that we can import pgadmin package
root = os.path.dirname(CURRENT_PATH)

if sys.path[0] != root:
    sys.path.insert(0, root)
    os.chdir(root)

from pgadmin import create_app
import config
import test_setup
import regression

# Execute setup.py if test SQLite database doesn't exist.
if os.path.isfile(config.TEST_SQLITE_PATH):
    print("The configuration database already existed at '%s'. "
          "Please remove the database and again run the test suite." %
          config.TEST_SQLITE_PATH)
    sys.exit(1)
else:
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
import test_utils

config.SETTINGS_SCHEMA_VERSION = SCHEMA_VERSION

# Override some other defaults
from logging import WARNING

config.CONSOLE_LOG_LEVEL = WARNING

# Create the app
app = create_app()
app.config['WTF_CSRF_ENABLED'] = False
test_client = app.test_client()


def get_suite(arguments, server, test_app_client):
    """
     This function loads the all modules in the tests directory into testing
     environment.

    :param arguments: this is command line arguments for module name to
    which test suite will run
    :type arguments: str
    :param server: server details
    :type server: dict
    :param test_app_client: test client
    :type test_app_client: pgadmin app object
    :return pgadmin_suite: test suite with test cases
    :rtype: TestSuite
    """

    from pgadmin.utils.route import TestsGeneratorRegistry

    modules = []
    pgadmin_suite = unittest.TestSuite()

    # Load the test modules which are in given package(i.e. in arguments.pkg)
    if arguments['pkg'] is None or arguments['pkg'] == "all":
        TestsGeneratorRegistry.load_generators('pgadmin')
    else:
        TestsGeneratorRegistry.load_generators('pgadmin.%s.tests' %
                                               arguments['pkg'])

    # Sort module list so that test suite executes the test cases sequentially
    module_list = TestsGeneratorRegistry.registry.items()
    module_list = sorted(module_list, key=lambda module_tuple: module_tuple[0])

    # Get the each test module and add into list
    for key, klass in module_list:
        gen = klass
        modules.append(gen)

    # Set the test client to each module & generate the scenarios
    for module in modules:
        obj = module()
        obj.setApp(app)
        obj.setTestClient(test_app_client)
        obj.setTestServer(server)
        scenario = generate_scenarios(obj)
        pgadmin_suite.addTests(scenario)

    return pgadmin_suite


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
    test_utils.drop_objects()


def get_tests_result(tests):
    """This function returns the total ran and total failed test cases count"""
    total_ran = tests.testsRun
    failed_cases_result = []
    if total_ran:
        if tests.failures:
            for failed_case in tests.failures:
                class_name = str(failed_case[0]).split('.')[-1].split()[0].\
                    strip(')')
                failed_cases_result.append(class_name)
        if tests.errors:
            for error_case in tests.errors:
                class_name = str(error_case[0]).split('.')[-1].split()[0].\
                    strip(')')
                if class_name not in failed_cases_result:
                    failed_cases_result.append(class_name)

    return total_ran, failed_cases_result


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
    atexit.register(test_utils.drop_objects)
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

    servers_info = test_utils.get_config_data()
    try:
        for server in servers_info:
            print("\n=============Running the test cases for '%s'============="
                  % server['name'], file=sys.stderr)

            test_utils.create_test_server(server)

            # Login the test client
            test_utils.login_tester_account(test_client)

            suite = get_suite(args, server, test_client)
            tests = unittest.TextTestRunner(stream=sys.stderr,
                                            descriptions=True,
                                            verbosity=2).run(suite)

            ran_tests, failed_cases = get_tests_result(tests)
            test_result[server['name']] = [ran_tests, failed_cases]

            # Logout the test client
            test_utils.logout_tester_account(test_client)

            test_utils.delete_test_server()
    except SystemExit:
        test_utils.drop_objects()

    print("\nTest Result Summary", file=sys.stderr)
    print("============================", file=sys.stderr)
    for server_res in test_result:
        failed_cases = "\n\t".join(test_result[server_res][1])
        total_failed = len(test_result[server_res][1])
        total_passed = int(test_result[server_res][0]) - total_failed

        print("%s: %s test%s passed, %s test%s failed %s%s" %
              (server_res, total_passed, (total_passed != 1 and "s" or ""),
               total_failed, (total_failed != 1 and "s" or ""),
               (total_failed != 0 and ":\n\t" or ""), failed_cases), file=sys.stderr)
    print("============================", file=sys.stderr)

    print("\nPlease check output in file: %s/regression.log " % CURRENT_PATH)
