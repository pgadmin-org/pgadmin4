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

import os
import sys
import unittest

from testscenarios.scenarios import generate_scenarios

# We need to include the root directory in sys.path to ensure that we can
# find everything we need when running in the standalone runtime.
current_path = os.path.dirname(os.path.realpath(__file__))
root = os.path.dirname(current_path)

if sys.path[0] != root:
    sys.path.insert(0, root)

from pgadmin import create_app
import config

# Get the config database schema version. We store this in pgadmin.model
# as it turns out that putting it in the config files isn't a great idea
from pgadmin.model import SCHEMA_VERSION
config.SETTINGS_SCHEMA_VERSION = SCHEMA_VERSION

# Create the app!
app = create_app()

# Disabling Cross-site request forgery(CSRF token) for testing purpose.
# CSRF prevent session against malicious Web site, or end users who wants to
# execute unwanted actions.
app.config['WTF_CSRF_ENABLED'] = False

from pgadmin.utils.route import TestsGeneratorRegistry

# Registry will load all the testcases/modules from pgadmin path those are
# register as BaseTestGenerator.
TestsGeneratorRegistry.load_generators('pgadmin')

# Create test client
# werkzeug provides a test client which gives a simple interface to the
# application. We can trigger test request to the application.
test_client = app.test_client()


def suite():
    """ Defining test suite which will execute all the testcases present in
    tests directory according to set priority."""

    pgadmin_suite = unittest.TestSuite()

    modules = []

    for key, klass in TestsGeneratorRegistry.registry.items():
        gen = klass

        modules.insert(gen.priority, gen)

    for m in modules:
        obj = m()
        obj.setTestClient(test_client)
        scenario = generate_scenarios(obj)
        pgadmin_suite.addTests(scenario)

    return pgadmin_suite


if __name__ == '__main__':
    suite = suite()
    tests = unittest.TextTestRunner(descriptions=True, verbosity=2).run(suite)
