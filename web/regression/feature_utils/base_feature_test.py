##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import errno
import sys
import os

from datetime import datetime

from copy import deepcopy

import config as app_config
from pgadmin.utils.route import BaseTestGenerator
from regression.feature_utils.pgadmin_page import PgadminPage
from regression.python_test_utils import test_utils


class BaseFeatureTest(BaseTestGenerator):
    CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))

    def setUp(self):
        self.server = deepcopy(self.server)
        self.server['name'] += ' Feature Tests'
        if app_config.SERVER_MODE:
            self.skipTest(
                "Currently, config is set to start pgadmin in server mode. "
                "This test doesn't know username and password so doesn't work "
                "in server mode"
            )

        self.page = PgadminPage(self.driver, app_config)
        try:
            test_utils.reset_layout_db()
            self.page.driver.switch_to.default_content()
            self.page.wait_for_app()
            self.page.wait_for_spinner_to_disappear()
            self.page.refresh_page()
            self.page.wait_for_spinner_to_disappear()
            self.before()
        except Exception:
            self._screenshot()
            raise

    def runTest(self):
        # To be implemented by child classes
        pass

    def before(self):
        # To be implemented by child classes
        pass

    def after(self):
        # To be implemented by child classes
        pass

    def tearDown(self):
        python2_failures = hasattr(
            self, "_resultForDoCleanups") and self.current_test_failed()

        python3_failures = hasattr(self, '_outcome') and self.any_step_failed()

        if python2_failures or python3_failures:
            self._screenshot()

        self.after()

    def any_step_failed(self):
        for step in self._outcome.errors:
            if step[1] is not None:
                return True
        return False

    def current_test_failed(self):
        all_failures = self._resultForDoCleanups.errors + \
            self._resultForDoCleanups.failures
        for failure in all_failures:
            if failure[0] == self:
                return True
        return False

    def _screenshot(self):
        screenshots_directory = '{0}/../screenshots'.format(self.CURRENT_PATH)
        screenshots_server_directory = '{0}/{1}'.format(
            screenshots_directory,
            self.server["name"].replace(" ", "_")
        )

        self.ensure_directory_exists(screenshots_directory)
        self.ensure_directory_exists(screenshots_server_directory)

        date = datetime.now().strftime("%Y.%m.%d_%H.%M.%S")
        python_version = sys.version.split(" ")[0]

        self.page.driver.save_screenshot(
            '{0}/{1}-{2}-Python-{3}.png'.format(
                screenshots_server_directory,
                self.__class__.__name__,
                date,
                python_version
            )
        )

    def ensure_directory_exists(self, path):
        try:
            os.mkdir(path)
        except OSError as e:
            if e.errno != errno.EEXIST:
                raise
