##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import time

from selenium.common.exceptions import StaleElementReferenceException, \
    ElementClickInterceptedException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from regression.feature_utils.base_feature_test import BaseFeatureTest
import config
from regression.feature_utils.locators import \
    QueryToolLocators

DATA_OUTPUT_STR = "Data Output"
CREATE_TABLE_STR = 'CREATE TABLE'


class QueryToolFeatureTest(BaseFeatureTest):
    """
        This feature test will test the different query tool features.
    """

    scenarios = [
        ("Query tool feature test", dict())
    ]
    data_output_tab_id = 'id-dataoutput'
    table_creation_fail_error = '"CREATE TABLE message does not displayed"'

    def before(self):
        self.page.wait_for_spinner_to_disappear()
        self.page.add_server(self.server)
        self.page.expand_database_node("Server", self.server['name'],
                                       self.server['db_password'],
                                       self.test_db)
        self.page.open_query_tool()
        self.page.wait_for_spinner_to_disappear()
        self.wait = WebDriverWait(self.page.driver, 10)

    def runTest(self):
        self._reset_options()
        # pagination result on page change.
        print("\nPagination query result... ",
              file=sys.stderr, end="")
        self._pagination_result()
        self.page.clear_query_tool()

        # explain query with verbose and cost
        print("Explain query with verbose and cost... ",
              file=sys.stderr, end="")
        self._query_tool_explain_with_verbose_and_cost()
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        # explain analyze query with buffers and timing
        print("Explain analyze query with buffers and timing... ",
              file=sys.stderr, end="")
        self._query_tool_explain_analyze_with_buffers_and_timing()
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        # auto commit disabled.
        print("Auto commit disabled... ", file=sys.stderr, end="")
        self._query_tool_auto_commit_disabled()
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        # auto commit enabled.
        print("Auto commit enabled... ", file=sys.stderr, end="")
        self._query_tool_auto_commit_enabled()
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        # auto rollback enabled.
        print("Auto rollback enabled...", file=sys.stderr, end="")
        self._query_tool_auto_rollback_enabled()
        print(" OK.", file=sys.stderr)
        self.page.clear_query_tool()

        # cancel query.
        print("Cancel query... ", file=sys.stderr, end="")
        self._query_tool_cancel_query()
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        # Notify Statements.
        print("Capture Notify Statements... ", file=sys.stderr, end="")
        self._query_tool_notify_statements()
        self.page.clear_query_tool()

    def after(self):
        self.page.close_query_tool(False)
        self.page.remove_server(self.server)

    def _reset_options(self):
        # this will set focus to correct iframe.
        self.page.fill_codemirror_area_with('')

        self.assertTrue(self.page.open_explain_options(),
                        'Unable to open Explain Options dropdown')

        # disable Explain options and auto rollback only if they are enabled.
        for op in (QueryToolLocators.btn_explain_verbose,
                   QueryToolLocators.btn_explain_costs,
                   QueryToolLocators.btn_explain_buffers,
                   QueryToolLocators.btn_explain_timing):
            btn = self.page.find_by_css_selector(op)
            if btn.get_attribute('data-checked') == 'true':
                btn.click()

        query_op = self.page.find_by_css_selector(
            QueryToolLocators.btn_query_dropdown)
        query_op.click()

        # disable auto rollback only if they are enabled
        self.page.uncheck_execute_option('auto_rollback')

        # enable autocommit only if it's disabled
        self.page.check_execute_option('auto_commit')

        # close menu
        query_op.click()

    def _pagination_result(self):
        query = """-- Pagination result
SELECT generate_series(1, {}) as id1, 'dummy' as id2""".format(
            config.DATA_RESULT_ROWS_PER_PAGE * 2.5)

        print("\nPagination result... ", file=sys.stderr, end="")
        self.page.execute_query(query)

        # wait for header of the table to be visible
        self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, QueryToolLocators.query_output_canvas_css)))

        self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR,
             QueryToolLocators.query_output_cells)))

        for i, page in enumerate([
            {'page_info': '1 to 1000', 'cell_rownum': '1'},
            {'page_info': '1001 to 2000', 'cell_rownum': '1001'},
            {'page_info': '2001 to 2500', 'cell_rownum': '2001'}
        ]):
            page_info = self.page.find_by_css_selector(
                QueryToolLocators.pagination_inputs + ' span:nth-of-type(1)')

            self.assertEqual(page_info.text,
                             f"Showing rows: {page['page_info']}")

            page_info = self.page.find_by_css_selector(
                QueryToolLocators.pagination_inputs + ' span:nth-of-type(3)')

            self.assertEqual(page_info.text, "of 3")

            cell_rownum = self.page.find_by_css_selector(
                QueryToolLocators.query_output_cells + ':nth-of-type(1)')

            self.assertEqual(cell_rownum.text, page['cell_rownum'])

            if i < 2:
                self.page.find_by_css_selector(
                    QueryToolLocators.pagination_inputs +
                    ' button[aria-label="Next Page"]').click()

            self.page.wait_for_query_tool_loading_indicator_to_disappear()

    def _query_tool_explain_with_verbose_and_cost(self):
        query = """-- Explain query with verbose and cost
SELECT generate_series(1, 1000) as id order by id desc"""

        self.page.fill_codemirror_area_with(query)
        time.sleep(0.5)
        self.assertTrue(self.page.open_explain_options(),
                        'Unable to open Explain Options dropdown')

        # disable Explain options and auto rollback only if they are enabled.
        for op in (QueryToolLocators.btn_explain_verbose,
                   QueryToolLocators.btn_explain_costs):
            self.page.find_by_css_selector(op).click()

        self.page.find_by_css_selector(
            QueryToolLocators.btn_explain).click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab(DATA_OUTPUT_STR)

        canvas = self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, QueryToolLocators.query_output_canvas_css))
        )

        self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR,
             QueryToolLocators.query_output_cells)))

        # Search for 'Output' word in result (verbose option)
        canvas.find_element(By.XPATH, "//*[contains(string(), 'Output')]")

        # Search for 'Total Cost' word in result (cost option)
        canvas.find_element(By.XPATH, "//*[contains(string(),'Total Cost')]")

    def _query_tool_explain_analyze_with_buffers_and_timing(self):
        query = """-- Explain analyze query with buffers and timing
SELECT generate_series(1, 1000) as id order by id desc"""

        self.page.fill_codemirror_area_with(query)

        self.assertTrue(self.page.open_explain_options(),
                        'Unable to open Explain Options')

        # disable Explain options and auto rollback only if they are enabled.
        for op in (QueryToolLocators.btn_explain_buffers,
                   QueryToolLocators.btn_explain_timing):
            self.page.find_by_css_selector(op).click()

        self.page.find_by_css_selector(
            QueryToolLocators.btn_explain_analyze).click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab(DATA_OUTPUT_STR)

        self.wait.until(EC.presence_of_element_located(
            (By.XPATH, QueryToolLocators.output_cell_xpath.format(2, 2)))
        )

        result = self.page.find_by_xpath(
            QueryToolLocators.output_cell_xpath.format(2, 2))

        # Search for 'Shared Read Blocks' word in result (buffers option)
        self.assertIn('Shared Read Blocks', result.text)

        # Search for 'Actual Total Time' word in result (timing option)
        self.assertIn('Actual Total Time', result.text)

    def _query_tool_auto_commit_disabled(self):
        table_name = 'query_tool_auto_commit_disabled_table'
        query = """-- 1. Disable auto commit.
-- 2. Create table in public schema.
-- 3. ROLLBACK transaction.
-- 4. Check if table is *NOT* created.
CREATE TABLE public.{}();""".format(table_name)

        self.page.fill_codemirror_area_with(query)

        # disable auto commit option
        query_op = self.page.find_by_css_selector(
            QueryToolLocators.btn_query_dropdown)
        query_op.click()
        self.page.uncheck_execute_option('auto_commit')
        # close option
        query_op.click()

        # execute query
        self.page.click_execute_query_button()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')

        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.format(CREATE_TABLE_STR)),
            self.table_creation_fail_error)

        # do the ROLLBACK and check if the table is present or not
        self.page.clear_query_tool()
        query = """-- 1. (Done) Disable auto commit.
-- 2. (Done) Create table in public schema.
-- 3. ROLLBACK transaction.
-- 4. Check if table is *NOT* created.
ROLLBACK;"""
        self.page.execute_query(query)
        self.page.click_tab('Messages')
        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.format('ROLLBACK')),
            "ROLLBACK message does not displayed")

        self.page.clear_query_tool()
        query = """-- 1. (Done) Disable auto commit.
-- 2. (Done) Create table in public schema.
-- 3. (Done) ROLLBACK transaction.
-- 4. Check if table is *NOT* created.
SELECT relname FROM pg_catalog.pg_class
    WHERE relkind IN ('r','s','t') and relnamespace = 2200::oid;"""

        self.page.execute_query(query)
        self.page.click_tab(DATA_OUTPUT_STR)
        canvas = self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, QueryToolLocators.query_output_canvas_css)))

        el = canvas.find_elements(By.XPATH, QueryToolLocators.
                                  output_column_data_xpath.format(table_name))

        assert len(el) == 0, "Table '{}' created with auto commit disabled " \
                             "and without any explicit commit.".format(
            table_name
        )
        # again roll back so that the auto commit drop down is enabled
        query = """-- 1. (Done) Disable auto commit.
        -- 2. (Done) Create table in public schema.
        -- 3. ROLLBACK transaction.
        -- 4. Check if table is *NOT* created.
        ROLLBACK;"""
        self.page.execute_query(query)

    def _query_tool_auto_commit_enabled(self):
        query = """-- 1. Enable auto commit.
-- 2. END any open transaction.
-- 3. Create table in public schema.
-- 4. ROLLBACK transaction
-- 5. Check if table is created event after ROLLBACK.
END;"""

        self.page.fill_codemirror_area_with(query)

        query_op = self.page.find_by_css_selector(
            QueryToolLocators.btn_query_dropdown)
        query_op.click()

        # Enable auto_commit if it is disabled
        self.page.check_execute_option('auto_commit')

        query_op.click()

        self.page.click_execute_query_button()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.clear_query_tool()

        table_name = 'query_tool_auto_commit_enabled_table'
        query = """-- 1. (Done) END any open transaction.
-- 2. Enable auto commit.
-- 3. Create table in public schema.
-- 4. ROLLBACK transaction
-- 5. Check if table is created event after ROLLBACK.
CREATE TABLE public.{}();""".format(table_name)

        self.page.execute_query(query)
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.format(CREATE_TABLE_STR)),
            self.table_creation_fail_error)

        self.page.clear_query_tool()
        query = """-- 1. (Done) END any open transaction if any.
-- 2. (Done) Enable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. ROLLBACK transaction
-- 5. Check if table is created event after ROLLBACK.
ROLLBACK;"""

        self.page.execute_query(query)
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.format('ROLLBACK')),
            "ROLLBACK message does not displayed")

        self.page.clear_query_tool()
        query = """-- 1. (Done) END any open transaction if any.
-- 2. (Done) Enable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. (Done) ROLLBACK transaction
-- 5. Check if table is created event after ROLLBACK.
SELECT relname FROM pg_catalog.pg_class
    WHERE relkind IN ('r','s','t') and relnamespace = 2200::oid;"""

        self.page.execute_query(query)
        self.page.click_tab(DATA_OUTPUT_STR)
        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        canvas = self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, QueryToolLocators.query_output_canvas_css)))

        el = canvas.find_elements(
            By.XPATH, QueryToolLocators.output_column_data_xpath.format(
                table_name))

        assert len(el) != 0, "Table '{}' is not created with auto " \
                             "commit enabled.".format(table_name)

    def _query_tool_auto_rollback_enabled(self):
        table_name = 'query_tool_auto_rollback_enabled_table'
        query = """-- 1. Enable auto rollback and disable auto commit.
-- 2. END any open transaction.
-- 3. Create table in public schema.
-- 4. Generate error in transaction.
-- 5. END transaction.
-- 6. Check if table is *NOT* created after ending transaction.
END;"""

        self.page.fill_codemirror_area_with(query)

        query_op = self.page.find_by_css_selector(
            QueryToolLocators.btn_query_dropdown)
        query_op.click()

        # uncheck auto commit and check auto-rollback
        self.page.uncheck_execute_option('auto_commit')
        self.page.check_execute_option('auto_rollback')

        query_op.click()

        self.page.click_execute_query_button()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.clear_query_tool()

        query = """-- 1. (Done) END any open transaction.
-- 2. Enable auto rollback and disable auto commit.
-- 3. Create table in public schema.
-- 4. Generate error in transaction.
-- 5. END transaction.
-- 6. Check if table is *NOT* created after ending transaction.
CREATE TABLE public.{}();""".format(table_name)
        self.page.execute_query(query)
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.format(CREATE_TABLE_STR)),
            self.table_creation_fail_error)
        self.page.clear_query_tool()

        query = """-- 1. (Done) END any open transaction.
-- 2. (Done) Enable auto rollback and disable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. Generate error in transaction.
-- 5. END transaction.
-- 6. Check if table is *NOT* created after ending transaction.
SELECT 1/0;"""
        self.page.execute_query(query)
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.format('division by zero')),
            "division by zero message does not displayed")
        self.page.clear_query_tool()

        query = """-- 1. (Done) END any open transaction.
-- 2. (Done) Enable auto rollback and disable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. (Done) Generate error in transaction.
-- 5. END transaction.
-- 6. Check if table is *NOT* created after ending transaction.
END;"""
        self.page.execute_query(query)
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.
            format('Query returned successfully')),
            "Query returned successfully message does not displayed")
        self.page.clear_query_tool()

        query = """-- 1. (Done) END any open transaction.
-- 2. (Done) Enable auto rollback and disable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. (Done) Generate error in transaction.
-- 5. (Done) END transaction.
-- 6. Check if table is *NOT* created after ending transaction.
SELECT relname FROM pg_catalog.pg_class
    WHERE relkind IN ('r','s','t') and relnamespace = 2200::oid;"""
        self.page.execute_query(query)
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab(DATA_OUTPUT_STR)
        canvas = self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, QueryToolLocators.query_output_canvas_css)))

        el = canvas.find_elements(
            By.XPATH, QueryToolLocators.output_column_data_xpath.format(
                table_name))

        assert len(el) == 0, "Table '{}' created even after ROLLBACK due to " \
                             "sql error.".format(table_name)

    def _query_tool_cancel_query(self):
        query = """-- 1. END any open transaction.
-- 2. Enable auto commit and Disable auto rollback.
-- 3. Execute long running query.
-- 4. Cancel long running query execution.
END;
SELECT 1, pg_sleep(300)"""

        self.page.fill_codemirror_area_with(query)

        # query_button drop can be disabled so enable
        commit_button = self.page.find_by_css_selector(
            QueryToolLocators.btn_commit)
        if not commit_button.get_attribute('disabled'):
            commit_button.click()
            time.sleep(2)

        # enable auto-commit and disable auto-rollback
        self.page.check_execute_option('auto_commit')
        self.page.uncheck_execute_option('auto_rollback')

        # Execute query
        self.page.find_by_css_selector(
            QueryToolLocators.btn_execute_query_css).click()

        # Providing a second of sleep since clicks on the execute and stop
        # query button is too quick that the query is not able run properly
        time.sleep(1)

        self.page.find_by_css_selector(
            QueryToolLocators.btn_cancel_query).click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.assertTrue(
            self.page.check_if_element_exist_by_xpath(
                QueryToolLocators.sql_editor_message
                .format('canceling statement due to user request')) or
            self.page.check_if_element_exist_by_xpath(
                QueryToolLocators.sql_editor_message
                .format('Execution Cancelled!'))
        )

    def _query_tool_notify_statements(self):
        print("\n\tListen on an event... ", file=sys.stderr, end="")
        self.page.execute_query("LISTEN foo;")
        self.page.click_tab('Messages')

        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.format('LISTEN')),
            "LISTEN message does not displayed")
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("\tNotify event without data... ", file=sys.stderr, end="")
        self.page.execute_query("NOTIFY foo;")
        self.page.click_tab('Notifications')
        self.wait.until(EC.text_to_be_present_in_element(
            (By.CSS_SELECTOR, "td[data-label='channel']"), "foo")
        )
        print("OK.", file=sys.stderr)

        print("\tNotify event with data... ", file=sys.stderr, end="")
        self.page.clear_query_tool()
        self.page.execute_query("SELECT pg_notify('foo', 'Hello')")
        self.page.click_tab('Notifications')
        self.wait.until(WaitForAnyElementWithText(
            (By.CSS_SELECTOR, "td[data-label='payload']"), "Hello"))
        print("OK.", file=sys.stderr)


class WaitForAnyElementWithText():
    def __init__(self, locator, text):
        self.locator = locator
        self.text = text

    def __call__(self, driver):
        try:
            elements = driver.find_elements(*self.locator)
            for elem in elements:
                if self.text in elem.text:
                    return True
            return False
        except StaleElementReferenceException:
            return False
