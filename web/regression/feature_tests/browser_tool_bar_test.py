##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import secrets

from regression.python_test_utils import test_utils
from regression.feature_utils.locators import BrowserToolBarLocators
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.feature_utils.tree_area_locators import TreeAreaLocators
from selenium.webdriver.common.by import By


class BrowserToolBarFeatureTest(BaseFeatureTest):
    """
        This feature test will test the tool bar on Browser panel.
    """

    scenarios = [
        ("Browser tool bar feature test", dict())
    ]

    test_table_name = ""

    def before(self):
        self.page.wait_for_spinner_to_disappear()
        self.page.add_server(self.server)
        self.test_table_name = "test_table" + str(
            secrets.choice(range(1000, 3000)))
        test_utils.create_table(self.server, self.test_db,
                                self.test_table_name)

    def runTest(self):
        # Check for query tool button
        print("\nQuery Tool ToolBar Button ",
              file=sys.stderr, end="")
        self.test_query_tool_button()
        print("OK.", file=sys.stderr)

        # Check for view data button
        print("\nView Data ToolBar Button ",
              file=sys.stderr, end="")
        self.test_view_data_tool_button()
        print("OK.", file=sys.stderr)

        # Check for filtered rows button
        print("\nFiltered Rows ToolBar Button ",
              file=sys.stderr, end="")
        self.test_filtered_rows_tool_button()
        print("OK.", file=sys.stderr)

    def after(self):
        self.page.remove_server(self.server)
        test_utils.delete_table(self.server, self.test_db,
                                self.test_table_name)

    def test_query_tool_button(self):
        self.assertTrue(self.page.expand_database_node("Servers",
                                                       self.server['name'],
                                                       self.server[
                                                           'db_password'],
                                                       self.test_db),
                        'Tree is not expanded to database node')
        self.assertTrue(self.page.retry_click(
            (By.CSS_SELECTOR,
             BrowserToolBarLocators.open_query_tool_button_css),
            (By.CSS_SELECTOR, BrowserToolBarLocators.query_tool_panel_css)),
            'Query tool did not open on clicking Query Tool button.')

        self.page.close_query_tool(prompt=False)

    def test_view_data_tool_button(self):
        self.assertTrue(
            self.page.expand_tables_node("Servers", self.server['name'],
                                         self.server['db_password'],
                                         self.test_db,
                                         "public"),
            'Tree is not expanded to table node')

        table_node = self.page.check_if_element_exists_with_scroll(
            TreeAreaLocators.table_node(self.test_table_name))
        table_node.click()

        self.assertTrue(self.page.retry_click(
            (By.CSS_SELECTOR,
             BrowserToolBarLocators.view_table_data_button_css),
            (By.CSS_SELECTOR, BrowserToolBarLocators.view_data_panel_css)),
            'View/Edit Data tab did not open after clicking View/Edit button.')
        self.page.close_query_tool(prompt=False)

    def test_filtered_rows_tool_button(self):
        self.assertTrue(self.page.retry_click(
            (By.CSS_SELECTOR,
             BrowserToolBarLocators.filter_data_button_css),
            (By.CSS_SELECTOR, BrowserToolBarLocators.filter_box_css)),
            'Filter dialogue did not open on clicking filter button.')
        self.page.click_modal('Close', docker=True)
        self.page.close_query_tool(prompt=False)
