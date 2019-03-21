##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import os

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.python_test_utils import test_utils
from regression.python_test_utils import test_gui_helper


class PGUtilitiesBackupFeatureTest(BaseFeatureTest):
    """ This class test PG utilities - Backup and Restore test scenarios """

    scenarios = [
        ("Test for PG utilities - Backup and Restore", dict(
            database_name="pg_utility_test_db",
            is_xss_check=False,
        )),
        ("Test for XSS in Backup and Restore", dict(
            database_name="<h1>test_me</h1>",
            is_xss_check=True,
        )),
    ]

    def before(self):
        if self.server['default_binary_paths'] is None:
            self.skipTest(
                "default_binary_paths is not set for the server {0}".format(
                    self.server['name']
                )
            )

        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        test_utils.drop_database(connection, self.database_name)

        test_utils.create_database(self.server, self.database_name)
        self.page.add_server(self.server)

        self.wait = WebDriverWait(self.page.driver, 20)

    def runTest(self):
        self.page.toggle_open_server(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item(self.database_name)

        # Backup
        self.driver.find_element_by_link_text("Tools").click()

        self.page.find_by_partial_link_text("Backup...").click()

        self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, ".file [name='file']")))

        self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, ".file [name='file']"))).click()
        # .input-group-append >button
        self.page.fill_input_by_field_name(
            "file", "test_backup", loose_focus=True)

        self.page.find_by_xpath("//button[contains(@class,'fa-save') "
                                "and contains(.,'Backup')]").click()

        self.page.find_by_css_selector('.ajs-bg-bgprocess')

        # status = self.page.find_by_css_selector(
        #     ".pg-bg-status .bg-success-light .pg-bg-status-text").text

        status = self.page.find_by_css_selector(
            ".pg-bg-status-text").text

        print("Debug: .pg-bg-status-text %s"%status)

        #.pg-bg-status-text
        self.assertEquals(status, "Successfully completed.")

        self.page.find_by_css_selector(
            ".pg-bg-more-details").click()

        backup_file = None
        # Check for XSS in Backup details
        if self.is_xss_check:
            self._check_detailed_window_for_xss('Backup')
        else:
            command = self.page.find_by_css_selector(
                ".bg-process-details .bg-detailed-desc").text

            self.assertIn(self.server['name'], str(command))
            self.assertIn("from database 'pg_utility_test_db'", str(command))

            # On windows a modified path may be shown so skip this test
            if os.name is not 'nt':
                self.assertIn("test_backup", str(command))

            self.assertIn("pg_dump", str(command))

            if command:
                backup_file = command[int(command.find('--file')) +
                                      8:int(command.find('--host')) - 2]

        self.page.find_by_xpath("//div[contains(@class,'wcFloatingFocus')"
                                "]//div[contains(@class,'fa-close')]").click()

        # Restore
        self.driver.find_element_by_link_text("Tools").click()
        self.page.find_by_partial_link_text("Restore...").click()

        self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, ".file [name='file']")))

        self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, ".file [name='file']"))).click()

        self.page.fill_input_by_field_name(
            "file", "test_backup", loose_focus=True)

        self.page.find_by_xpath("//button[contains(@class,'fa-upload')"
                                " and contains(.,'Restore')]").click()

        self.page.find_by_css_selector('.ajs-bg-bgprocess')

        status = self.page.find_by_css_selector(
            ".pg-bg-status-text").text
        self.assertEquals(status, "Successfully completed.")

        self.page.find_by_css_selector(
            ".pg-bg-more-details").click()

        # Check for XSS in Restore details
        if self.is_xss_check:
            self._check_detailed_window_for_xss('Restore')
        else:
            command = self.page.find_by_css_selector(
                ".bg-process-details .bg-detailed-desc").text

            self.assertIn(self.server['name'], str(command))
            if os.name is not 'nt':
                self.assertIn("test_backup", str(command))

            self.assertIn("pg_restore", str(command))

        self.page.find_by_xpath("//div[contains(@class,'wcFloatingFocus')]"
                                "//div[contains(@class,'fa-close')]").click()

        if backup_file is not None:
            if os.path.isfile(backup_file):
                os.remove(backup_file)

    def after(self):
        test_gui_helper.close_bgprocess_popup(self)
        self.page.remove_server(self.server)
        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        test_utils.drop_database(connection, self.database_name)

    def _check_detailed_window_for_xss(self, tool_name):
        source_code = self.page.find_by_css_selector(
            ".bg-process-details .bg-detailed-desc"
        ).get_attribute('innerHTML')
        self._check_escaped_characters(
            source_code,
            '&lt;h1&gt;test_me&lt;/h1&gt;',
            '{0} detailed window'.format(tool_name)
        )

    def _check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        assert source_code.find(string_to_find) != - \
            1, "{0} might be vulnerable to XSS ".format(source)
