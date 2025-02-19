##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys
import time
import tempfile

from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import StaleElementReferenceException, \
    TimeoutException
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.feature_utils.locators import QueryToolLocators


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
        filename = self.server_information['type'] + \
            str(self.server_information['server_version'])
        self.XSS_FILE = '<img src=x ' + filename + '=alert("1")>.sql'
        self.tmpDir = os.path.join(tempfile.gettempdir(), 'pga4_test')

        # Create temp directory
        if not os.path.exists(self.tmpDir):
            os.makedirs(self.tmpDir)

        if self.parallel_ui_tests:
            xss_file_path = self.XSS_FILE
        else:
            xss_file_path = os.path.join(self.tmpDir, self.XSS_FILE)
        # Remove any previous file
        if os.path.isfile(xss_file_path):
            os.remove(xss_file_path)

    def after(self):
        self.page.close_query_tool(False)
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
        self.page.expand_database_node("Server", self.server['name'],
                                       self.server['db_password'],
                                       self.test_db)
        self.page.open_query_tool()

    def _create_new_file(self):
        self.page.find_by_css_selector(QueryToolLocators.btn_save_file) \
            .click()
        # Set the XSS value in input
        WebDriverWait(self.driver, 15).until(EC.presence_of_element_located(
            (By.XPATH, QueryToolLocators.change_file_types_dd_xpath)))
        # Save the file
        if not self.parallel_ui_tests:
            self.page.fill_input_by_css_selector(
                QueryToolLocators.folder_path_css, '',
                key_after_input=Keys.ENTER)
            self.page.fill_input_by_css_selector(
                QueryToolLocators.folder_path_css,
                self.tmpDir, input_keys=True, key_after_input=Keys.ENTER)
            self.page.find_by_css_selector(
                QueryToolLocators.folder_path_css).send_keys(Keys.ENTER)
        input_file_path_ele = \
            self.page.find_by_xpath(QueryToolLocators.save_file_path_xpath)
        input_file_path_ele.send_keys(self.XSS_FILE)
        self.page.click_modal('Save')
        self.page.wait_for_query_tool_loading_indicator_to_disappear()

    def _open_file_manager_and_check_xss_file(self):
        load_file = self.page.find_by_css_selector(
            QueryToolLocators.btn_load_file_css)
        load_file.click()
        WebDriverWait(self.driver, 15).until(EC.presence_of_element_located(
            (By.XPATH, QueryToolLocators.change_file_types_dd_xpath)))
        # Open the file
        if not self.parallel_ui_tests:
            self.page.fill_input_by_css_selector(
                QueryToolLocators.folder_path_css, '',
                key_after_input=Keys.ENTER)
            self.page.fill_input_by_css_selector(
                QueryToolLocators.folder_path_css,
                self.tmpDir, key_after_input=Keys.ENTER)
            self.page.find_by_css_selector(
                QueryToolLocators.folder_path_css).send_keys(Keys.ENTER)
            time.sleep(2)

        self.page.fill_input_by_css_selector(
            QueryToolLocators.search_file_edit_box_css, self.XSS_FILE,
            input_keys=True)

        self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, QueryToolLocators.select_file_content_css)))

        table = self.page.driver.find_element(
            By.CSS_SELECTOR, QueryToolLocators.select_file_content_css)

        retry_count = 0
        while retry_count < 5:
            try:
                contents = table.get_attribute('innerHTML')
                break
            except (StaleElementReferenceException, TimeoutException):
                retry_count += 1

        self.page.click_modal('Cancel')
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        filename = self.server_information['type'] + \
            str(self.server_information['server_version'])
        self._check_escaped_characters(
            contents,
            '&lt;img src=x ' + filename +
            '=alert("1")&gt;.sql', 'File manager'
        )

    def _check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        assert source_code.find(
            string_to_find
        ) != -1, "{0} might be vulnerable to XSS, source code is: {1}".format(
            source, source_code)

    def _check_file_sorting(self):
        load_file = self.page.find_by_css_selector(
            QueryToolLocators.btn_load_file_css)
        load_file.click()
        WebDriverWait(self.driver, 15).until(EC.presence_of_element_located(
            (By.XPATH, QueryToolLocators.change_file_types_dd_xpath)))

        # Intermittently facing issue on first click it is not successful
        # so tried couple of times.
        success = self.page.retry_click(
            (By.CSS_SELECTOR,
             "div [role='grid'] div[role='columnheader'][aria-colindex='1']"),
            (By.CSS_SELECTOR,
             "div [role='grid'] div[role='columnheader']"
             "[aria-colindex='1'][aria-sort='ascending']"))

        if not success:
            raise RuntimeError("Unable to sort in ascending order while "
                               "clicked on 'Name' column")
        # Added time.sleep so that the element to be clicked.
        time.sleep(0.05)

        # Click and Check for sort Descending
        # Intermittently facing issue on first click it is not successful
        # so tried couple of times.
        success = self.page.retry_click(
            (By.CSS_SELECTOR,
             "div [role='grid'] div[role='columnheader'][aria-colindex='1']"),
            (By.CSS_SELECTOR,
             "div [role='grid'] div[role='columnheader']"
             "[aria-colindex='1'][aria-sort='descending']"))

        if not success:
            raise RuntimeError("Unable to sort in descending order while "
                               "clicked on 'Name' column")

        self.page.click_modal('Cancel')
