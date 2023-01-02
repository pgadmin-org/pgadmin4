##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest
import config
from regression.feature_utils.locators import \
    QueryToolLocators


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
        skip_warning = "Skipped."
        # on demand result set on scrolling.
        print("\nOn demand query result... ",
              file=sys.stderr, end="")
        self._on_demand_result()
        self.page.clear_query_tool()

        # explain query with verbose and cost
        print("Explain query with verbose and cost... ",
              file=sys.stderr, end="")
        if self._supported_server_version():
            self._query_tool_explain_with_verbose_and_cost()
            print("OK.", file=sys.stderr)
            self.page.clear_query_tool()
        else:
            print(skip_warning, file=sys.stderr)

        # explain analyze query with buffers and timing
        print("Explain analyze query with buffers and timing... ",
              file=sys.stderr, end="")
        if self._supported_server_version():
            self._query_tool_explain_analyze_with_buffers_and_timing()
            print("OK.", file=sys.stderr)
            self.page.clear_query_tool()
        else:
            print(skip_warning, file=sys.stderr)

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

    def _on_demand_result(self):
        ON_DEMAND_CHUNKS = 2
        row_id_to_find = config.ON_DEMAND_RECORD_COUNT * ON_DEMAND_CHUNKS

        query = """-- On demand query result on scroll
-- Grid select all
-- Column select all
SELECT generate_series(1, {}) as id1, 'dummy' as id2""".format(
            config.ON_DEMAND_RECORD_COUNT * ON_DEMAND_CHUNKS)

        print("\nOn demand result set on scrolling... ",
              file=sys.stderr, end="")
        self.page.execute_query(query)

        # wait for header of the table to be visible
        self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, QueryToolLocators.query_output_canvas_css)))

        self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR,
             QueryToolLocators.query_output_cells)))

        self.page.find_by_css_selector(
            QueryToolLocators.query_output_canvas_css)

        self._check_ondemand_result(row_id_to_find)
        print("OK.", file=sys.stderr)

        print("On demand result set on grid select all... ",
              file=sys.stderr, end="")
        self.page.click_execute_query_button()

        # wait for header of the table to be visible
        self.page.find_by_css_selector(
            QueryToolLocators.query_output_canvas_css)

        # wait for the rows in the table to be displayed
        self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR,
             QueryToolLocators.query_output_cells))
        )

        # Select all rows in a table
        multiple_check = True
        while multiple_check:
            try:
                select_all = self.wait.until(EC.element_to_be_clickable(
                    (By.XPATH, QueryToolLocators.select_all_column)))
                select_all.click()
                multiple_check = False
            except (StaleElementReferenceException,
                    ElementClickInterceptedException):
                pass

        self._check_ondemand_result(row_id_to_find)
        print("OK.", file=sys.stderr)

        print("On demand result set on column select all... ",
              file=sys.stderr, end="")
        self.page.click_execute_query_button()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        # wait for header of the table to be visible
        self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, QueryToolLocators.query_output_canvas_css)))

        # wait for the rows in the table to be displayed
        self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR,
             QueryToolLocators.query_output_cells))
        )

        self.wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, QueryToolLocators.query_output_canvas_css)))

        self._check_ondemand_result(row_id_to_find)
        print("OK.", file=sys.stderr)

    def _check_ondemand_result(self, row_id_to_find):
        # scroll to bottom to bring last row of next chunk in viewport.
        scroll = 10
        status = False
        while scroll:
            # click on first data column to select all column.
            column_1 = \
                self.page.find_by_css_selector(
                    QueryToolLocators.output_column_header_css.format('id1'))
            column_1.click()
            grid = self.page.find_by_css_selector('.rdg')
            scrolling_height = grid.size['height']
            self.driver.execute_script(
                "document.querySelector('.rdg').scrollTop="
                "document.querySelector('.rdg').scrollHeight"
            )
            # Table height takes some time to update, for which their is no
            # particular way
            time.sleep(2)
            if grid.size['height'] == scrolling_height and \
                self.page.check_if_element_exist_by_xpath(
                    QueryToolLocators.output_column_data_xpath.format(
                        row_id_to_find)):
                status = True
                break
            else:
                scroll -= 1

        self.assertTrue(
            status, "Element is not loaded to the rows id: "
                    "{}".format(row_id_to_find))

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

        self.page.click_tab(self.data_output_tab_id, rc_dock=True)

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

        self.page.click_tab(self.data_output_tab_id, rc_dock=True)

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
        self.page.click_tab('id-messages', rc_dock=True)

        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.format('CREATE TABLE')),
            self.table_creation_fail_error)

        # do the ROLLBACK and check if the table is present or not
        self.page.clear_query_tool()
        query = """-- 1. (Done) Disable auto commit.
-- 2. (Done) Create table in public schema.
-- 3. ROLLBACK transaction.
-- 4. Check if table is *NOT* created.
ROLLBACK;"""
        self.page.execute_query(query)
        self.page.click_tab('id-messages', rc_dock=True)
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
        self.page.click_tab(self.data_output_tab_id, rc_dock=True)
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
        self.page.click_tab('id-messages', rc_dock=True)
        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.format('CREATE TABLE')),
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
        self.page.click_tab('id-messages', rc_dock=True)
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
        self.page.click_tab(self.data_output_tab_id, rc_dock=True)
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
        self.page.click_tab('id-messages', rc_dock=True)
        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.format('CREATE TABLE')),
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
        self.page.click_tab('id-messages', rc_dock=True)
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
        self.page.click_tab('id-messages', rc_dock=True)
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
        self.page.click_tab(self.data_output_tab_id, rc_dock=True)
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
            time.sleep(0.5)

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
        self.page.click_tab('id-messages', rc_dock=True)
        self.assertTrue(
            self.page.check_if_element_exist_by_xpath(
                QueryToolLocators.sql_editor_message
                .format('canceling statement due to user request')) or
            self.page.check_if_element_exist_by_xpath(
                QueryToolLocators.sql_editor_message
                .format('Execution Cancelled!'))
        )

    def _supported_server_version(self):
        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        return connection.server_version > 90100

    def _query_tool_notify_statements(self):
        print("\n\tListen on an event... ", file=sys.stderr, end="")
        self.page.execute_query("LISTEN foo;")
        self.page.click_tab('id-messages', rc_dock=True)

        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            QueryToolLocators.sql_editor_message.format('LISTEN')),
            "LISTEN message does not displayed")
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("\tNotify event without data... ", file=sys.stderr, end="")
        self.page.execute_query("NOTIFY foo;")
        self.page.click_tab('id-notifications', rc_dock=True)
        self.wait.until(EC.text_to_be_present_in_element(
            (By.CSS_SELECTOR, "td[data-label='channel']"), "foo")
        )
        print("OK.", file=sys.stderr)

        print("\tNotify event with data... ", file=sys.stderr, end="")
        if self._supported_server_version():
            self.page.clear_query_tool()
            self.page.execute_query("SELECT pg_notify('foo', 'Hello')")
            self.page.click_tab('id-notifications', rc_dock=True)
            self.wait.until(WaitForAnyElementWithText(
                (By.CSS_SELECTOR, "td[data-label='payload']"), "Hello"))
            print("OK.", file=sys.stderr)
        else:
            print("Skipped.", file=sys.stderr)


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
