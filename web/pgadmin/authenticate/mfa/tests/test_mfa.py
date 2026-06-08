##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
import unittest

from pgadmin.utils.route import BaseTestGenerator
import config
from .test_config import config_scenarios
from .test_user_execution import user_execution_scenarios
from .test_mfa_view import validation_view_scenarios
from .utils import init_dummy_auth_class


test_scenarios = list()
test_scenarios += config_scenarios
test_scenarios += user_execution_scenarios
test_scenarios += validation_view_scenarios


class TestMFATests(BaseTestGenerator):

    scenarios = test_scenarios

    @classmethod
    def setUpClass(cls):
        # MFA only initialises its blueprint and short-circuits its
        # mfa_enabled() ternary when SERVER_MODE is True; the scenarios
        # in this suite all assume that state. Save and force it here
        # so test_config.json (which defaults to DESKTOP mode) does not
        # make every scenario take the "disabled" path.
        cls._original_server_mode = getattr(config, 'SERVER_MODE', False)
        config.SERVER_MODE = True
        config.MFA_ENABLED = True
        init_dummy_auth_class()

    @classmethod
    def tearDownClass(cls):
        config.MFA_ENABLED = False
        config.MFA_SUPPORTED_METHODS = []
        config.SERVER_MODE = cls._original_server_mode

    def setUp(self):
        config.MFA_SUPPORTED_METHODS = ['tests.utils']

        start = getattr(self, 'start', None)
        if start is not None:
            start(self)

        # MFA scenarios run against a dummy Flask app (set up by the
        # 'start' callback) or pure mocks; they do not need -- and the
        # dummy app cannot provide -- a real PostgreSQL connection.
        # Skip BaseTestGenerator.setUp which would POST to
        # /browser/server/connect/... and fail the assertion against
        # the dummy app's 404 response.
        unittest.TestCase.setUp(self)

    def tearDown(self):

        finish = getattr(self, 'finish', None)
        if finish is not None:
            finish(self)

        config.MFA_SUPPORTED_METHODS = []
        unittest.TestCase.tearDown(self)

    def runTest(self):
        self.check(self)
