##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest


class CheckFileManagerFeatureTest(BaseFeatureTest):
    """Tests to check file manager for XSS."""

    scenarios = [
        ("Tests to check if File manager is vulnerable to XSS",
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
        self._navigate_to_query_tool()
        self.page.fill_codemirror_area_with("SELECT 1;")
        self._create_new_file()
        self._open_file_manager_and_check_xss_file()

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
        contents = self.page.find_by_id("contents").get_attribute('innerHTML')
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
