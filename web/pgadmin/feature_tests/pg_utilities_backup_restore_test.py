##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import time
import os

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.python_test_utils import test_utils


class PGUtilitiesBackupFeatureTest(BaseFeatureTest):
    """ This class test PG utilities - Backup and Restore test scenarios """

    scenarios = [
        ("Test for PG utilities - Backup and Restore", dict())
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
        test_utils.drop_database(connection, "pg_utility_test_db")

        test_utils.create_database(self.server, "pg_utility_test_db")
        self.page.add_server(self.server)

        self.wait = WebDriverWait(self.page.driver, 20)

    def runTest(self):
        self.page.toggle_open_server(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('pg_utility_test_db')
        self.driver.find_element_by_link_text("Tools").click()

        self.page.find_by_partial_link_text("Backup...").click()

        self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, ".browse_file_input")))

        self.page.find_by_css_selector(
            ".ajs-dialog.pg-el-container .ajs-maximize"
        ).click()

        self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, ".browse_file_input"))).click()

        self.page.fill_input_by_field_name("file", "test_backup")

        self.page.find_by_xpath("//button[contains(@class,'fa-save') "
                                "and contains(.,'Backup')]").click()

        self.page.wait_for_element_to_disappear(
            lambda driver: driver.find_element_by_css_selector(".ajs-modal")
        )

        status = self.page.find_by_css_selector(
            ".pg-bg-bgprocess .bg-success").text

        self.assertEquals(status, "Successfully completed.")

        self.page.find_by_css_selector(
            ".pg-bg-bgprocess .pg-bg-click > span").click()
        command = self.page.find_by_css_selector("p.bg-detailed-desc").text

        self.assertIn(self.server['name'], str(command))
        self.assertIn("from database 'pg_utility_test_db'", str(command))
        self.assertIn("test_backup", str(command))
        self.assertIn("pg_dump", str(command))

        backup_file = None
        if command:
            backup_file = command[int(command.find('--file')) +
                                  8:int(command.find('--host')) - 2]

        self.page.find_by_xpath("//div[contains(@class,'wcFloatingFocus')"
                                "]//div[contains(@class,'fa-close')]").click()

        self.driver.find_element_by_link_text("Tools").click()
        self.page.find_by_partial_link_text("Restore...").click()

        self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, ".browse_file_input")))

        self.page.find_by_xpath(
            "//button[contains(@class,'fa-info') and "
            "contains(@label, 'Restore')]"
        )

        self.wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, ".browse_file_input"))).click()

        self.page.fill_input_by_field_name("file", "test_backup")

        self.page.find_by_xpath("//button[contains(@class,'fa-upload')"
                                " and contains(.,'Restore')]").click()

        self.page.wait_for_element_to_disappear(
            lambda driver: driver.find_element_by_css_selector(".ajs-modal")
        )

        status = self.page.find_by_css_selector(
            ".pg-bg-bgprocess .bg-success").text

        self.assertEquals(status, "Successfully completed.")
        self.page.find_by_css_selector(
            ".pg-bg-bgprocess .pg-bg-click > span").click()
        command = self.page.find_by_css_selector("p.bg-detailed-desc").text

        self.assertIn(self.server['name'], str(command))
        self.assertIn("test_backup", str(command))
        self.assertIn("pg_restore", str(command))

        self.page.find_by_xpath("//div[contains(@class,'wcFloatingFocus')]"
                                "//div[contains(@class,'fa-close')]").click()

        if backup_file is not None:
            if os.path.isfile(backup_file):
                os.remove(backup_file)

    def after(self):
        self.page.remove_server(self.server)
        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        test_utils.drop_database(connection, "pg_utility_test_db")
