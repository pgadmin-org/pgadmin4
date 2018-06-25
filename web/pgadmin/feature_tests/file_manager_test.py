##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from __future__ import print_function
import os
import time
import sys
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest


class CheckFileManagerFeatureTest(BaseFeatureTest):
    """Tests to check file manager for XSS."""

    scenarios = [
        ("File manager feature test",
         dict())
    ]

    def before(self):
        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port']
        )
        test_utils.drop_database(connection, "acceptance_test_db")
        test_utils.create_database(self.server, "acceptance_test_db")
        self.page.add_server(self.server)
        self.wait = WebDriverWait(self.page.driver, 10)
        self.XSS_FILE = '/tmp/<img src=x onmouseover=alert("1")>.sql'
        # Remove any previous file
        if os.path.isfile(self.XSS_FILE):
            os.remove(self.XSS_FILE)

    def after(self):
        self.page.close_query_tool('sql', False)
        self.page.remove_server(self.server)
        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port']
        )
        test_utils.drop_database(connection, "acceptance_test_db")

    def runTest(self):
        print("Tests to check if File manager is vulnerable to XSS... ",
              file=sys.stderr, end="")
        self._navigate_to_query_tool()
        self.page.fill_codemirror_area_with("SELECT 1;")
        self._create_new_file()
        self._open_file_manager_and_check_xss_file()
        print("OK.", file=sys.stderr)

        print("File manager sorting of data", file=sys.stderr)
        self._check_file_sorting()
        print("OK.", file=sys.stderr)

    def _navigate_to_query_tool(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('acceptance_test_db')
        self.page.open_query_tool()

    def _create_new_file(self):
        self.page.find_by_id("btn-save").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.wait.until(EC.presence_of_element_located(
            (
                By.XPATH,
                "//*[contains(string(), 'Show hidden files and folders? ')]"
            )
        ))
        # Set the XSS value in input
        self.page.find_by_id("file-input-path").clear()
        self.page.find_by_id("file-input-path").send_keys(
            self.XSS_FILE
        )
        # Save the file
        self.page.click_modal('Save')
        self.page.wait_for_query_tool_loading_indicator_to_disappear()

    def _open_file_manager_and_check_xss_file(self):
        self.page.find_by_id("btn-load-file").click()
        self.wait.until(EC.presence_of_element_located(
            (
                By.XPATH,
                "//*[contains(string(), 'Show hidden files and folders? ')]"
            )
        ))
        self.page.find_by_id("file-input-path").clear()
        self.page.find_by_id("file-input-path").send_keys(
            '/tmp/'
        )
        self.page.find_by_id("file-input-path").send_keys(
            Keys.RETURN
        )

        if self.page.driver.capabilities['browserName'] == 'firefox':
            table = self.page.wait_for_element_to_reload(
                lambda driver:
                driver.find_element_by_css_selector("table#contents")
            )
        else:
            table = self.page.driver \
                .find_element_by_css_selector("table#contents")

        contents = table.get_attribute('innerHTML')

        self.page.click_modal('Cancel')
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self._check_escaped_characters(
            contents,
            '&lt;img src=x onmouseover=alert("1")&gt;.sql',
            'File manager'
        )

    def _check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        assert source_code.find(
            string_to_find
        ) != -1, "{0} might be vulnerable to XSS ".format(source)

    def _check_file_sorting(self):
        self.page.find_by_id("btn-load-file").click()
        self.wait.until(
            EC.element_to_be_clickable((
                By.CSS_SELECTOR,
                "#contents th[data-column='0']")
            )
        )

        # Added time.sleep so that the element to be clicked.
        time.sleep(0.05)
        self.page.find_by_css_selector("#contents th[data-column='0']").click()
        # Check for sort Ascending
        self.wait.until(
            EC.presence_of_element_located((
                By.CSS_SELECTOR,
                "#contents th[data-column='0'].tablesorter-headerAsc")
            )
        )

        # Click and Check for sort Descending
        self.page.find_by_css_selector("#contents th[data-column='0']").click()
        self.wait.until(
            EC.presence_of_element_located((
                By.CSS_SELECTOR,
                "#contents th[data-column='0'].tablesorter-headerDesc")
            )
        )
