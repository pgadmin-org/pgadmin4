import config as app_config
from pgadmin.utils.route import BaseTestGenerator
from regression.feature_utils.pgadmin_page import PgadminPage


class BaseFeatureTest(BaseTestGenerator):
    def setUp(self):
        if app_config.SERVER_MODE:
            self.skipTest("Currently, config is set to start pgadmin in server mode. "
                          "This test doesn't know username and password so doesn't work in server mode")

        self.page = PgadminPage(self.driver, app_config)
        self.page.wait_for_app()
        self.page.wait_for_spinner_to_disappear()
        self.page.reset_layout()
        self.page.wait_for_spinner_to_disappear()

    def failureException(self, *args, **kwargs):
        self.page.driver.save_screenshot('/tmp/feature_test_failure.png')
        return AssertionError(*args, **kwargs)

    def runTest(self):
        pass