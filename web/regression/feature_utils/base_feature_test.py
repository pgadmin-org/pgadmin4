import errno
import sys
import os

from datetime import datetime

import config as app_config
from pgadmin.utils.route import BaseTestGenerator
from regression.feature_utils.pgadmin_page import PgadminPage


class BaseFeatureTest(BaseTestGenerator):
    CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))

    def setUp(self):
        if app_config.SERVER_MODE:
            self.skipTest("Currently, config is set to start pgadmin in server mode. "
                          "This test doesn't know username and password so doesn't work in server mode")

        self.page = PgadminPage(self.driver, app_config)
        try:
            self.page.wait_for_app()
            self.page.wait_for_spinner_to_disappear()
            self.page.reset_layout()
            self.page.wait_for_spinner_to_disappear()
            self.before()
        except:
            self._screenshot()
            raise

    def runTest(self):
        pass

    def before(self):
        pass

    def after(self):
        pass

    def tearDown(self):
        python2_failures = hasattr(self, "_resultForDoCleanups") and self.current_test_failed()

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
        all_failures = self._resultForDoCleanups.errors + self._resultForDoCleanups.failures
        for failure in all_failures:
            if failure[0] == self:
                return True
        return False

    def _screenshot(self):
        path = '{0}/../screenshots/{1}'.format(self.CURRENT_PATH, self.server["name"].replace(" ", "_"))

        try:
            os.mkdir(path)
        except OSError as e:
            if e.errno == errno.EEXIST:
                pass
            else:
                raise

        date = datetime.now().strftime("%Y.%m.%d_%H.%M.%S")
        python_version = sys.version.split(" ")[0]

        self.page.driver.save_screenshot(
            '{0}/{1}-{2}-Python-{3}.png'.format(path, self.__class__.__name__, date, python_version))
