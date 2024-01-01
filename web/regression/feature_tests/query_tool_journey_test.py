##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import secrets
import traceback

from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.feature_utils.locators import QueryToolLocators
import time
from selenium.webdriver.support import expected_conditions as EC


class QueryToolJourneyTest(BaseFeatureTest):
    """
    Tests the path through the query tool
    """

    scenarios = [
        ("Tests the path through the query tool", dict())
    ]

    test_table_name = ""
    test_editable_table_name = ""
    invalid_table_name = ""

    select_query = "SELECT * FROM %s"
    query_history_tab_name = "Query History"
    query_history_tab_id = "id-history"
    query_editor_tab_name = "Query Editor"
    query_editor_tab_id = "id-query"
    query_tool_opened = False

    def before(self):
        self.test_table_name = "test_table" + str(
            secrets.choice(range(1000, 3000)))
        self.invalid_table_name = \
            "table_that_doesnt_exist_" + str(secrets.choice(range(1000, 3000)))
        test_utils.create_table(
            self.server, self.test_db, self.test_table_name)

        self.test_editable_table_name = "test_editable_table" + \
                                        str(secrets.choice(range(1000, 3000)))
        create_sql = '''
                             CREATE TABLE "%s" (
                                 pk_column NUMERIC PRIMARY KEY,
                                 normal_column NUMERIC
                             );
                             ''' % self.test_editable_table_name
        test_utils.create_table_with_query(
            self.server, self.test_db, create_sql)

        self.page.add_server(self.server)

        driver_version = test_utils.get_driver_version()
        self.driver_version = float('.'.join(driver_version.split('.')[:2]))
        self.wait = WebDriverWait(self.page.driver, 10)

    def runTest(self):
        try:
            self._navigate_to_query_tool()
            self.page.execute_query(
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

            self._insert_data_into_test_editable_table()

            print("History query source icons and generated queries toggle...",
                  file=sys.stderr, end="")
            self._test_query_sources_and_generated_queries()
            print(" OK.", file=sys.stderr)

            print("Updatable result sets...", file=sys.stderr, end="")
            self._test_updatable_resultset()
            print(" OK.", file=sys.stderr)

            print("Is editable column header icons...",
                  file=sys.stderr, end="")
            self._test_is_editable_columns_icons()
            print(" OK.", file=sys.stderr)
        except Exception as e:
            traceback.print_exc()
            self.assertTrue(False, 'Exception occurred in run test Tests the '
                                   'path through the query tool data' + str(e))

    def _test_copies_rows(self):
        self.page.driver.switch_to.default_content()
        self.page.driver.switch_to.frame(
            self.page.driver.find_element(By.TAG_NAME, "iframe"))

        # row index starts with 2
        select_row = self.page.find_by_css_selector(
            QueryToolLocators.output_row_col.format('2', '1'))

        select_row.click()

        copy_row = self.page.find_by_css_selector(
            QueryToolLocators.copy_button_css)
        copy_row.click()

        self.page.driver.switch_to.default_content()
        self.page.driver.switch_to.frame(
            self.page.driver.find_element(By.TAG_NAME, "iframe"))

        scratch_pad_ele = self.page.find_by_css_selector(
            QueryToolLocators.scratch_pad_css)
        self.page.paste_values(scratch_pad_ele)
        clipboard_text = scratch_pad_ele.get_attribute("value")

        self.assertEqual('"Some-Name"\t6\t"some info"',
                         clipboard_text)

        scratch_pad_ele.clear()

    def _test_copies_columns(self):
        self.page.driver.switch_to.default_content()
        self.page.driver.switch_to.frame(
            self.page.driver.find_element(By.TAG_NAME, "iframe"))

        column_header = self.page.find_by_css_selector(
            QueryToolLocators.output_column_header_css.format('some_column'))
        column_header.click()

        copy_btn = self.page.find_by_css_selector(
            QueryToolLocators.copy_button_css)
        copy_btn.click()

        scratch_pad_ele = self.page.find_by_css_selector(
            QueryToolLocators.scratch_pad_css)
        self.page.paste_values(scratch_pad_ele)

        clipboard_text = scratch_pad_ele.get_attribute("value")

        self.assertTrue('"Some-Name"' in clipboard_text)
        self.assertTrue('"Some-Other-Name"' in clipboard_text)
        self.assertTrue('"Yet-Another-Name"' in clipboard_text)
        scratch_pad_ele.clear()

    def _test_history_tab(self):
        self.page.driver.switch_to.default_content()
        self.page.driver.switch_to.frame(
            self.page.driver.find_element(By.TAG_NAME, "iframe"))
        self.page.clear_query_tool()

        editor_input = self.page.find_by_css_selector(
            QueryToolLocators.query_editor_panel)
        self.page.click_element(editor_input)
        self.page.execute_query(self.select_query % self.invalid_table_name)

        self.page.click_tab("Query History")
        self.page.wait_for_query_tool_loading_indicator_to_disappear(
            container_id="id-history")
        selected_history_entry = self.page.find_by_css_selector(
            QueryToolLocators.query_history_selected)
        self.assertIn(self.select_query % self.invalid_table_name,
                      selected_history_entry.text)

        failed_history_detail_pane = self.page.find_by_css_selector(
            QueryToolLocators.query_history_detail)

        self.assertIn(
            "ERROR:  relation \"%s\" does not exist"
            % self.invalid_table_name,
            failed_history_detail_pane.text
        )
        self.page.wait_for_elements(
            lambda driver: driver.find_elements(
                By.CSS_SELECTOR, QueryToolLocators.query_history_entries))

        # get the query history rows and click the previous query row which
        # was executed and verify it
        history_rows = self.driver.find_elements(
            By.CSS_SELECTOR, QueryToolLocators.query_history_entries)
        history_rows[1].click()

        selected_history_entry = self.page.find_by_css_selector(
            QueryToolLocators.query_history_selected)
        self.assertIn(("SELECT * FROM %s ORDER BY value" %
                       self.test_table_name),
                      selected_history_entry.text)

        # check second(invalid) query also exist in the history tab with error
        newly_selected_history_entry = history_rows[0]
        self.page.click_element(newly_selected_history_entry)

        invalid_history_entry = self.page.find_by_css_selector(
            QueryToolLocators.invalid_query_history_entry_css)

        self.assertIn(self.select_query % self.invalid_table_name,
                      invalid_history_entry.text)

        self.page.click_tab("Query")
        self.page.clear_query_tool()
        self.page.click_element(editor_input)

        # Check if 15 more query executed then the history should contain 17
        # entries.
        self.page.fill_codemirror_area_with("SELECT * FROM hats")
        for _ in range(15):
            self.page.find_by_css_selector(
                QueryToolLocators.btn_execute_query_css).click()
            self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab("Query History")

        query_list = self.page.wait_for_elements(
            lambda driver: driver.find_elements(
                By.CSS_SELECTOR, QueryToolLocators.query_history_entries))

        self.assertTrue(17, len(query_list))

    def _test_query_sources_and_generated_queries(self):
        self.__clear_query_history()
        self._test_history_query_sources()
        self._test_toggle_generated_queries()

    def _test_history_query_sources(self):
        self.page.click_tab("Query")
        self._execute_sources_test_queries()

        self.page.click_tab("Query History")

        history_entries_icons = [
            'CommitIcon',
            'SaveDataIcon',
            'SaveDataIcon',
            'ExecuteIcon',
            'ExplainAnalyzeIcon',
            'ExplainIcon',
        ]

        history_entries_queries = [
            "BEGIN;",
            "UPDATE public.%s SET normal_column = '10'::numeric "
            "WHERE pk_column = '1';" % self.test_editable_table_name,
            "COMMIT;",
            self.select_query % self.test_editable_table_name,
            self.select_query % self.test_editable_table_name,
            self.select_query % self.test_editable_table_name
        ]

        self._check_history_queries_and_icons(history_entries_queries,
                                              history_entries_icons)

    def _test_toggle_generated_queries(self):
        xpath = "//li[@data-label='history-entry'][@data-pgadmin='true']"
        self.assertTrue(self.page.check_if_element_exist_by_xpath(xpath))
        self.page.set_switch_box_status(
            QueryToolLocators.show_query_internally_btn, 'No')
        self.assertFalse(self.page.check_if_element_exist_by_xpath(xpath))
        self.page.set_switch_box_status(
            QueryToolLocators.show_query_internally_btn, 'Yes')
        self.assertTrue(self.page.check_if_element_exist_by_xpath(xpath))

    def _test_updatable_resultset(self):
        self.page.click_tab("Query")

        # Select all data
        # (contains the primary key -> all columns should be editable)
        self.page.clear_query_tool()
        query = "SELECT pk_column, normal_column FROM %s" \
                % self.test_editable_table_name
        self._check_query_results_editable(query, [True, True])

        # Select data without primary keys -> should not be editable
        self.page.clear_query_tool()
        query = "SELECT normal_column FROM %s" % self.test_editable_table_name
        self._check_query_results_editable(query, [False],
                                           discard_changes_modal=True)

        # Select all data in addition to duplicate, renamed, and out-of-table
        # columns
        self.page.clear_query_tool()
        query = """
                SELECT pk_column, normal_column, normal_column,
                normal_column as pk_column,
                (normal_column::text || normal_column::text)::int
                FROM %s
                """ % self.test_editable_table_name
        self._check_query_results_editable(query,
                                           [True, True, False, False, False])

        # discard edits
        self.page.execute_query('SELECT 1')
        self.page.click_modal('Yes')

    def _test_is_editable_columns_icons(self):
        if self.driver_version < 2.8:
            return
        self.page.click_tab("Query")

        self.page.clear_query_tool()
        query = "SELECT pk_column FROM %s" % self.test_editable_table_name
        self.page.execute_query(query)

        icon_exists = self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.editable_column_icon_xpath
        )
        self.assertTrue(icon_exists)

        self.page.clear_query_tool()
        query = "SELECT normal_column FROM %s" % self.test_editable_table_name
        self.page.execute_query(query)
        icon_exists = self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.read_only_column_icon_xpath
        )
        self.assertTrue(icon_exists)

    def _execute_sources_test_queries(self):
        self.page.clear_query_tool()

        self._explain_query(
            self.select_query
            % self.test_editable_table_name
        )
        self._explain_analyze_query(
            self.select_query
            % self.test_editable_table_name
        )
        self.page.execute_query(
            self.select_query
            % self.test_editable_table_name
        )

        # Turn off autocommit
        query_options = self.page.find_by_css_selector(
            QueryToolLocators.btn_query_dropdown)
        query_options.click()
        self.page.uncheck_execute_option("auto_commit")

        self._update_numeric_cell(10)
        time.sleep(0.5)

        self._commit_transaction()
        self.page.wait_for_spinner_to_disappear()
        self.page.check_execute_option("auto_commit")

    def _check_history_queries_and_icons(self, history_queries, history_icons):
        # Select first query history entry
        self.page.find_by_css_selector(
            QueryToolLocators.query_history_specific_entry.format(2)).click()
        for icon, query in zip(history_icons, history_queries):
            # Check query
            query_history_selected_item = self.page.find_by_css_selector(
                QueryToolLocators.query_history_selected
            )
            query_history_selected_item = \
                query_history_selected_item.text.split('\n')[0]
            self.assertTrue(query_history_selected_item in history_queries)
            # Check source icon
            query_history_selected_icon = self.page.find_by_css_selector(
                QueryToolLocators.query_history_selected_icon)
            self.assertTrue(
                icon == query_history_selected_icon.get_attribute(
                    'data-label'))
            # Move to next entry
            ActionChains(self.page.driver) \
                .send_keys(Keys.ARROW_DOWN) \
                .perform()

    def _update_numeric_cell(self, value):
        """
            Updates a numeric cell in the first row of the resultset
        """
        retry = 3
        while retry > 0:
            cell_el = self.page.find_by_css_selector(
                QueryToolLocators.output_row_col.format(2, 3))
            cell_el.click()
            time.sleep(0.2)
            ActionChains(self.driver).double_click(cell_el).perform()
            ActionChains(self.driver).send_keys(value). \
                send_keys(Keys.ENTER).perform()
            try:
                save_btn = WebDriverWait(self.driver, 2).until(
                    EC.element_to_be_clickable(
                        (By.CSS_SELECTOR, QueryToolLocators.btn_save_data)))
                save_btn.click()
                break
            except Exception:
                print('Exception occurred')
                retry -= 1

    def _insert_data_into_test_editable_table(self):
        self.page.click_tab("Query")
        self.page.clear_query_tool()
        self.page.execute_query(
            "INSERT INTO %s VALUES (1, 1), (2, 2);"
            % self.test_editable_table_name
        )

    def __clear_query_history(self):
        self.page.click_tab("Query History")
        self.page.wait_for_query_tool_loading_indicator_to_disappear(
            container_id="id-history")
        self.page.click_element(
            self.page.find_by_css_selector(
                QueryToolLocators.btn_history_remove_all)
        )
        self.page.click_modal('Yes')

    def _navigate_to_query_tool(self):
        self.assertTrue(
            self.page.expand_database_node("Server", self.server['name'],
                                           self.server['db_password'],
                                           self.test_db),
            'Tree is not expanded to database node')
        self.query_tool_opened = self.page.open_query_tool()
        self.page.wait_for_spinner_to_disappear()

    def _explain_query(self, query):
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_css_selector(
            QueryToolLocators.btn_explain).click()

    def _explain_analyze_query(self, query):
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_css_selector(
            QueryToolLocators.btn_explain_analyze).click()

    def _commit_transaction(self):
        self.page.find_by_css_selector(
            QueryToolLocators.btn_commit).click()

    def _assert_clickable(self, element):
        self.page.click_element(element)

    def _check_query_results_editable(self, query, cols_should_be_editable,
                                      discard_changes_modal=False):
        self.page.execute_query(query)
        if discard_changes_modal:
            self.page.click_modal('Yes')

        # first column is rownum
        enumerated_should_be_editable = enumerate(cols_should_be_editable, 2)

        for column_index, should_be_editable in enumerated_should_be_editable:
            is_editable = self._check_cell_editable(column_index)
            self.assertEqual(is_editable, should_be_editable)

    def _check_cell_editable(self, cell_index):
        """Checks if a cell in the first row of the resultset is editable"""
        retry = 2
        while retry > 0:
            try:
                cell_el = self.page.find_by_xpath(
                    QueryToolLocators.output_cell_xpath.format(2, cell_index))
                # Get existing value
                cell_value = int(cell_el.text)
                new_value = cell_value + 1
                # Try to update value
                ActionChains(self.driver).double_click(cell_el).perform()
                cell_el = self.page.find_by_xpath(
                    QueryToolLocators.output_cell_xpath.format(2, cell_index))
                if cell_el.get_attribute('aria-selected') and \
                        cell_el.text == '':
                    ActionChains(self.driver).send_keys(new_value).perform()
                    ActionChains(self.driver).send_keys(Keys.ENTER).perform()
                    # Check if the value was updated
                    # Finding element again to avoid stale element
                    # reference exception
                    cell_el = self.page. \
                        find_by_xpath(QueryToolLocators.
                                      output_cell_xpath.format(2, cell_index))
                    return int(cell_el.text) == new_value
                else:
                    print('Double click not succeeded in try- ' + str(
                        retry), file=sys.stderr)
                    retry -= 1
                    if retry == 0:
                        return False
            except Exception as e:
                print('Exception while reading cell value in try ' +
                      str(retry), file=sys.stderr)
                retry -= 1
                if retry == 0:
                    raise TimeoutError(e)

    def _check_can_add_row(self):
        return self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.new_row_xpath)

    def after(self):
        if self.query_tool_opened:
            self.page.close_query_tool()
        test_utils.delete_table(
            self.server, self.test_db, self.test_table_name)
        test_utils.delete_table(
            self.server, self.test_db, self.test_editable_table_name)
        self.page.remove_server(self.server)
