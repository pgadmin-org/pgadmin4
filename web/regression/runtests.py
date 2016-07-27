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

import argparse
import os
import sys
import unittest
import logging

from testscenarios.scenarios import generate_scenarios

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))

# Set sys path to current directory so that we can import pgadmin package
root = os.path.dirname(CURRENT_PATH)

if sys.path[0] != root:
    sys.path.insert(0, root)

from pgadmin import create_app
import config

# Get the config database schema version. We store this in pgadmin.model
# as it turns out that putting it in the config files isn't a great idea
from pgadmin.model import SCHEMA_VERSION
from test_utils import login_tester_account, logout_tester_account

config.SETTINGS_SCHEMA_VERSION = SCHEMA_VERSION

# Override some other defaults
from logging import WARNING
config.CONSOLE_LOG_LEVEL = WARNING

# Create the app
app = create_app()
app.config['WTF_CSRF_ENABLED'] = False
test_client = app.test_client()
# Login the test client
login_tester_account(test_client)


def get_suite(arguments, test_app_client):
    """
     This function loads the all modules in the tests directory into testing
     environment.

    :param arguments: this is command line arguments for module name to
    which test suite will run
    :type arguments: str
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
        TestsGeneratorRegistry.load_generators('pgadmin.{}.tests'.format(
            arguments['pkg']))

    # Get the each test module and add into list
    for key, klass in TestsGeneratorRegistry.registry.items():
        gen = klass
        modules.append(gen)

    # Set the test client to each module & generate the scenarios
    for module in modules:
        obj = module()
        obj.setTestClient(test_app_client)
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
    suite = get_suite(args, test_client)
    tests = unittest.TextTestRunner(stream=sys.stderr, descriptions=True,
                                    verbosity=2).run(suite)

    # Logout the test client
    logout_tester_account(test_client)

    print("Please check output in file: %s/regression.log " % CURRENT_PATH)
