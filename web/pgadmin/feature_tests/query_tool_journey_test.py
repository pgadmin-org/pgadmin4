##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import pyperclip
import time

from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys

from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest


class QueryToolJourneyTest(BaseFeatureTest):
    """
    Tests the path through the query tool
    """

    scenarios = [
        ("Tests the path through the query tool", dict())
    ]

    def before(self):
        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")
        test_utils.create_database(self.server, "acceptance_test_db")
        test_utils.create_table(self.server, "acceptance_test_db", "test_table")
        self.page.add_server(self.server)

    def runTest(self):
        self._navigate_to_query_tool()
        self._execute_query("SELECT * FROM test_table ORDER BY value")

        self._test_copies_rows()
        self._test_copies_columns()
        self._test_history_tab()

    def _test_copies_rows(self):
        pyperclip.copy("old clipboard contents")
        time.sleep(5)
        self.page.driver.switch_to.default_content()
        self.page.driver.switch_to_frame(self.page.driver.find_element_by_tag_name("iframe"))
        self.page.find_by_xpath("//*[contains(@class, 'slick-row')]/*[1]").click()
        self.page.find_by_xpath("//*[@id='btn-copy-row']").click()

        self.assertEqual("'Some-Name','6','some info'",
                         pyperclip.paste())

    def _test_copies_columns(self):
        pyperclip.copy("old clipboard contents")

        self.page.driver.switch_to.default_content()
        self.page.driver.switch_to_frame(self.page.driver.find_element_by_tag_name("iframe"))
        self.page.find_by_xpath("//*[@data-test='output-column-header' and contains(., 'some_column')]").click()
        self.page.find_by_xpath("//*[@id='btn-copy-row']").click()

        self.assertTrue("'Some-Name'" in pyperclip.paste())
        self.assertTrue("'Some-Other-Name'" in pyperclip.paste())
        self.assertTrue("'Yet-Another-Name'" in pyperclip.paste())

    def _test_history_tab(self):
        self.__clear_query_tool()

        editor_input = self.page.find_by_id("output-panel")
        self.page.click_element(editor_input)
        self._execute_query("SELECT * FROM shoes")

        self.page.click_tab("History")
        selected_history_entry = self.page.find_by_css_selector("#query_list .selected")
        self.assertIn("SELECT * FROM shoes", selected_history_entry.text)
        ActionChains(self.page.driver) \
            .send_keys(Keys.ARROW_DOWN) \
            .perform()
        selected_history_entry = self.page.find_by_css_selector("#query_list .selected")
        self.assertIn("SELECT * FROM test_table ORDER BY value", selected_history_entry.text)

        selected_history_detail_pane = self.page.find_by_id("query_detail")
        self.assertIn("SELECT * FROM test_table ORDER BY value", selected_history_detail_pane.text)

        newly_selected_history_entry = self.page.find_by_xpath("//*[@id='query_list']/ul/li[1]")
        self.page.click_element(newly_selected_history_entry)
        selected_history_detail_pane = self.page.find_by_id("query_detail")
        self.assertIn("SELECT * FROM shoes", selected_history_detail_pane.text)

        self.__clear_query_tool()

        self.page.click_element(editor_input)
        for _ in range(15):
            self._execute_query("SELECT * FROM hats")

        self.page.click_tab("History")

        query_we_need_to_scroll_to = self.page.find_by_xpath("//*[@id='query_list']/ul/li[17]")

        self.page.click_element(query_we_need_to_scroll_to)
        self._assert_not_clickable_because_out_of_view(query_we_need_to_scroll_to)

        for _ in range(17):
            ActionChains(self.page.driver) \
                .send_keys(Keys.ARROW_DOWN) \
                .perform()

        self._assert_clickable(query_we_need_to_scroll_to)

    def __clear_query_tool(self):
        self.page.click_element(self.page.find_by_xpath("//*[@id='btn-edit']"))
        self.page.click_modal('Yes')

    def _navigate_to_query_tool(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('acceptance_test_db')
        self.page.open_query_tool()
        time.sleep(5)

    def _execute_query(self, query):
        ActionChains(self.page.driver).send_keys(query).perform()
        self.page.driver.switch_to.default_content()
        self.page.driver.switch_to_frame(self.page.driver.find_element_by_tag_name("iframe"))
        self.page.find_by_id("btn-flash").click()

    def _assert_clickable(self, element):
        self.page.click_element(element)

    def _assert_not_clickable_because_out_of_view(self, element):
        self.assertRaises(self.page.click_element(element))

    def after(self):
        self.page.close_query_tool()
        self.page.remove_server(self.server)

        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")
