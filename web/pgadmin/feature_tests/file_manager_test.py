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
from regression.feature_utils.base_feature_test import BaseFeatureTest


class CheckFileManagerFeatureTest(BaseFeatureTest):
    """Tests to check file manager for XSS."""

    scenarios = [
        ("File manager feature test",
         dict())
    ]

    def before(self):
        if os.name == 'nt':
            self.skipTest("This test is skipped for Windows. As Windows "
                          "does not allow the '<' and '>' character while "
                          "specifying the file name.")

        self.page.add_server(self.server)
        self.wait = WebDriverWait(self.page.driver, 10)
        self.XSS_FILE = '/tmp/<img src=x onmouseover=alert("1")>.sql'
        # Remove any previous file
        if os.path.isfile(self.XSS_FILE):
            os.remove(self.XSS_FILE)

    def after(self):
        self.page.close_query_tool('sql', False)
        self.page.remove_server(self.server)

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
        self.page.toggle_open_tree_item(self.test_db)
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

        # Intermittently facing issue on first click it is not successful
        # so tried couple of times.
        iteration = 0
        success = False
        while not success and iteration < 4:
            self.page.find_by_xpath("//th[@data-column='0']"
                                    "/div/span[text()='Name']").click()
            # Check for sort Ascending
            try:
                self.wait.until(
                    EC.presence_of_element_located((
                        By.CSS_SELECTOR,
                        "#contents th[data-column='0'].tablesorter-headerAsc")
                    ))
                success = True
            except Exception as e:
                iteration += 1

        if not success:
            raise Exception("Unable to sort in ascending order while clicked "
                            "on 'Name' column")

        time.sleep(0.05)

        # Click and Check for sort Descending
        # Intermittently facing issue on first click it is not successful
        # so tried couple of times.
        iteration = 0
        success = False
        while not success and iteration < 4:
            self.page.find_by_xpath("//th[@data-column='0']"
                                    "/div/span[text()='Name']").click()
            try:
                self.wait.until(
                    EC.presence_of_element_located((
                        By.CSS_SELECTOR,
                        "#contents th[data-column='0'].tablesorter-headerDesc")
                    ))
                success = True
            except Exception as e:
                iteration += 1

        if not success:
            raise Exception("Unable to sort in descending order while clicked "
                            "on 'Name' column")
