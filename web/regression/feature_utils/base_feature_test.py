from selenium import webdriver

import config as app_config
from pgadmin.utils.route import BaseTestGenerator
from regression.feature_utils.app_starter import AppStarter
from regression.feature_utils.pgadmin_page import PgadminPage


class BaseFeatureTest(BaseTestGenerator):
    def setUp(self):
        if app_config.SERVER_MODE:
            self.skipTest("Currently, config is set to start pgadmin in server mode. "
                          "This test doesn't know username and password so doesn't work in server mode")

        driver = webdriver.Chrome()
        self.app_starter = AppStarter(driver, app_config)
        self.page = PgadminPage(driver, app_config)
        self.app_starter.start_app()
        self.page.wait_for_app()

    def failureException(self, *args, **kwargs):
        self.page.driver.save_screenshot('/tmp/feature_test_failure.png')
        return AssertionError(*args, **kwargs)

    def runTest(self):
        pass