##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
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
        config.MFA_ENABLED = True
        init_dummy_auth_class()

    @classmethod
    def tearDownClass(cls):
        config.MFA_ENABLED = False
        config.MFA_SUPPORTED_METHODS = []

    def setUp(self):
        config.MFA_SUPPORTED_METHODS = ['tests.utils']

        start = getattr(self, 'start', None)
        if start is not None:
            start(self)

        super().setUp()

    def tearDown(self):

        finish = getattr(self, 'finish', None)
        if finish is not None:
            finish(self)

        config.MFA_SUPPORTED_METHODS = []
        super().tearDown()

    def runTest(self):
        self.check(self)
