##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import pyperclip
import random

from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys

from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest
from .locators import QueryToolLocatorsCss


class QueryToolJourneyTest(BaseFeatureTest):
    """
    Tests the path through the query tool
    """

    scenarios = [
        ("Tests the path through the query tool", dict())
    ]

    test_table_name = ""
    test_editable_table_name = ""

    def before(self):
        self.test_table_name = "test_table" + str(random.randint(1000, 3000))
        test_utils.create_table(
            self.server, self.test_db, self.test_table_name)

        self.test_editable_table_name = "test_editable_table" + \
                                        str(random.randint(1000, 3000))
        create_sql = '''
                             CREATE TABLE "%s" (
                                 pk_column NUMERIC PRIMARY KEY,
                                 normal_column NUMERIC
                             );
                             ''' % self.test_editable_table_name
        test_utils.create_table_with_query(
            self.server, self.test_db, create_sql)

        self.page.add_server(self.server)

    def runTest(self):
        self._navigate_to_query_tool()
        self._execute_query(
            "SELECT * FROM %s ORDER BY value " % self.test_table_name)

        print("Copy rows...", file=sys.stderr, end="")
        self._test_copies_rows()
        print(" OK.", file=sys.stderr)

        print("Copy columns...", file=sys.stderr, end="")
        self._test_copies_columns()
        print(" OK.", file=sys.stderr)

        print("History tab...", file=sys.stderr, end="")
        self._test_history_tab()
        print(" OK.", file=sys.stderr)

        print("Updatable resultsets...", file=sys.stderr, end="")
        self._test_updatable_resultset()
        print(" OK.", file=sys.stderr)

    def _test_copies_rows(self):
        pyperclip.copy("old clipboard contents")
        self.page.driver.switch_to.default_content()
        self.page.driver.switch_to_frame(
            self.page.driver.find_element_by_tag_name("iframe"))
        self.page.find_by_xpath(
            "//*[contains(@class, 'slick-row')]/*[1]").click()
        self.page.find_by_xpath("//*[@id='btn-copy-row']").click()

        self.assertEqual('"Some-Name"\t"6"\t"some info"',
                         pyperclip.paste())

    def _test_copies_columns(self):
        pyperclip.copy("old clipboard contents")

        self.page.driver.switch_to.default_content()
        self.page.driver.switch_to_frame(
            self.page.driver.find_element_by_tag_name("iframe"))
        self.page.find_by_xpath(
            "//*[@data-test='output-column-header' and "
            "contains(., 'some_column')]"
        ).click()
        self.page.find_by_xpath("//*[@id='btn-copy-row']").click()

        self.assertTrue('"Some-Name"' in pyperclip.paste())
        self.assertTrue('"Some-Other-Name"' in pyperclip.paste())
        self.assertTrue('"Yet-Another-Name"' in pyperclip.paste())

    def _test_history_tab(self):
        self.__clear_query_tool()
        editor_input = self.page.find_by_css_selector(
            QueryToolLocatorsCss.query_editor_panel)
        self.page.click_element(editor_input)
        self._execute_query("SELECT * FROM table_that_doesnt_exist")

        self.page.click_tab("Query History")
        selected_history_entry = self.page.find_by_css_selector(
            QueryToolLocatorsCss.query_history_selected)
        self.assertIn("SELECT * FROM table_that_doesnt_exist",
                      selected_history_entry.text)

        failed_history_detail_pane = self.page.find_by_css_selector(
            QueryToolLocatorsCss.query_history_detail)

        self.assertIn(
            "Error Message relation \"table_that_doesnt_exist\" "
            "does not exist", failed_history_detail_pane.text
        )
        self.page.wait_for_element(lambda driver: driver
                                   .find_element_by_css_selector(
                                       "#query_list> .query-group>ul>li"))

        # get the query history rows and click the previous query row which
        # was executed and verify it
        history_rows = self.driver.find_elements_by_css_selector(
            "#query_list> .query-group>ul>li")
        history_rows[1].click()

        selected_history_entry = self.page.find_by_css_selector(
            "#query_list .selected")
        self.assertIn(("SELECT * FROM %s ORDER BY value" %
                       self.test_table_name),
                      selected_history_entry.text)

        # check second(invalid) query also exist in the history tab with error
        newly_selected_history_entry = self.page.find_by_xpath(
            "//*[@id='query_list']/div/ul/li[1]")
        self.page.click_element(newly_selected_history_entry)

        selected_invalid_history_entry = self.page.find_by_css_selector(
            "#query_list .selected .entry.error .query")

        self.assertIn("SELECT * FROM table_that_doesnt_exist",
                      selected_invalid_history_entry.text)

        self.page.click_tab("Query Editor")
        self.__clear_query_tool()
        self.page.click_element(editor_input)

        self.page.fill_codemirror_area_with("SELECT * FROM hats")
        for _ in range(15):
            self.page.find_by_css_selector(
                QueryToolLocatorsCss.btn_execute_query).click()
            self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab("Query History")

        query_we_need_to_scroll_to = self.page.find_by_xpath(
            "//*[@id='query_list']/div/ul/li[17]")

        self.page.click_element(query_we_need_to_scroll_to)

        for _ in range(17):
            ActionChains(self.page.driver) \
                .send_keys(Keys.ARROW_DOWN) \
                .perform()

        self._assert_clickable(query_we_need_to_scroll_to)

        self.page.click_tab("Query Editor")
        self.__clear_query_tool()
        self.page.click_element(editor_input)
        self.page.fill_codemirror_area_with("SELECT * FROM hats")
        for _ in range(15):
            self.page.find_by_css_selector(
                QueryToolLocatorsCss.btn_execute_query).click()
            self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab("History")
        query_we_need_to_scroll_to = self.page.find_by_xpath(
            "//*[@id='query_list']/div/ul/li[17]"
        )
        for _ in range(17):
            ActionChains(self.page.driver) \
                .send_keys(Keys.ARROW_DOWN) \
                .perform()
        self._assert_clickable(query_we_need_to_scroll_to)

    def _test_updatable_resultset(self):
        self.page.click_tab("Query Editor")

        # Insert data into test table
        self.__clear_query_tool()
        self._execute_query(
            "INSERT INTO %s VALUES (1, 1), (2, 2);"
            % self.test_editable_table_name
        )

        # Select all data (contains the primary key -> should be editable)
        self.__clear_query_tool()
        query = "SELECT pk_column, normal_column FROM %s" \
                % self.test_editable_table_name
        self._check_query_results_editable(query, True)

        # Select data without primary keys -> should not be editable
        self.__clear_query_tool()
        query = "SELECT normal_column FROM %s" % self.test_editable_table_name
        self._check_query_results_editable(query, False)

    def __clear_query_tool(self):
        self.page.click_element(
            self.page.find_by_xpath("//*[@id='btn-clear-dropdown']")
        )
        ActionChains(self.driver)\
            .move_to_element(self.page.find_by_xpath("//*[@id='btn-clear']"))\
            .perform()
        self.page.click_element(
            self.page.find_by_xpath("//*[@id='btn-clear']")
        )
        self.page.click_modal('Yes')

    def _navigate_to_query_tool(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item(self.test_db)
        self.page.open_query_tool()
        self.page.wait_for_spinner_to_disappear()

    def _execute_query(self, query):
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_css_selector(
            QueryToolLocatorsCss.btn_execute_query).click()

    def _assert_clickable(self, element):
        self.page.click_element(element)

    def _check_query_results_editable(self, query, should_be_editable):
        self._execute_query(query)
        self.page.wait_for_spinner_to_disappear()

        # Check if the first cell in the first row is editable
        is_editable = self._check_cell_editable(1)
        self.assertEqual(is_editable, should_be_editable)
        # Check that new rows cannot be added
        can_add_rows = self._check_can_add_row()
        self.assertEqual(can_add_rows, should_be_editable)

    def _check_cell_editable(self, cell_index):
        xpath = '//div[contains(@class, "slick-cell") and ' \
                'contains(@class, "r' + str(cell_index) + '")]'
        cell_el = self.page.find_by_xpath(xpath)
        cell_classes = cell_el.get_attribute('class')
        cell_classes = cell_classes.split(" ")
        self.assertFalse('editable' in cell_classes)
        ActionChains(self.driver).double_click(cell_el).perform()
        cell_classes = cell_el.get_attribute('class')
        cell_classes = cell_classes.split(" ")
        return 'editable' in cell_classes

    def _check_can_add_row(self):
        return self.page.check_if_element_exist_by_xpath(
            '//div[contains(@class, "new-row")]')

    def after(self):
        self.page.close_query_tool()
        self.page.remove_server(self.server)
