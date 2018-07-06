##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from __future__ import print_function
import time
import sys

from selenium.common.exceptions import StaleElementReferenceException

import config
from selenium.webdriver import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest


class QueryToolFeatureTest(BaseFeatureTest):
    """
        This feature test will test the different query tool features.
    """

    scenarios = [
        ("Query tool feature test", dict())
    ]

    def before(self):
        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        test_utils.drop_database(connection, "acceptance_test_db")
        test_utils.create_database(self.server, "acceptance_test_db")
        self.page.wait_for_spinner_to_disappear()
        self.page.add_server(self.server)
        self._locate_database_tree_node()
        self.page.open_query_tool()
        self._reset_options()

    def runTest(self):
        # on demand result set on scrolling.
        print("\nOn demand query result... ",
              file=sys.stderr, end="")
        self._on_demand_result()
        self._clear_query_tool()

        # explain query with verbose and cost
        print("Explain query with verbose and cost... ",
              file=sys.stderr, end="")
        if self._supported_server_version():
            self._query_tool_explain_with_verbose_and_cost()
            print("OK.", file=sys.stderr)
            self._clear_query_tool()
        else:
            print("Skipped.", file=sys.stderr)

        # explain analyze query with buffers and timing
        print("Explain analyze query with buffers and timing... ",
              file=sys.stderr, end="")
        if self._supported_server_version():
            self._query_tool_explain_analyze_with_buffers_and_timing()
            print("OK.", file=sys.stderr)
            self._clear_query_tool()
        else:
            print("Skipped.", file=sys.stderr)

        # auto commit disabled.
        print("Auto commit disabled... ", file=sys.stderr, end="")
        self._query_tool_auto_commit_disabled()
        print("OK.", file=sys.stderr)
        self._clear_query_tool()

        # auto commit enabled.
        print("Auto commit enabled... ", file=sys.stderr, end="")
        self._query_tool_auto_commit_enabled()
        print("OK.", file=sys.stderr)
        self._clear_query_tool()

        # auto rollback enabled.
        print("Auto rollback enabled...", file=sys.stderr, end="")
        self._query_tool_auto_rollback_enabled()
        print(" OK.", file=sys.stderr)
        self._clear_query_tool()

        # cancel query.
        print("Cancel query... ", file=sys.stderr, end="")
        self._query_tool_cancel_query()
        print("OK.", file=sys.stderr)
        self._clear_query_tool()

        # Notify Statements.
        print("Capture Notify Statements... ", file=sys.stderr, end="")
        self._query_tool_notify_statements()
        self._clear_query_tool()

        # explain query with JIT stats
        print("Explain query with JIT stats... ",
              file=sys.stderr, end="")
        if self._supported_jit_on_server():
            self._query_tool_explain_check_jit_stats()
            print("OK.", file=sys.stderr)
            self._clear_query_tool()
        else:
            print("Skipped.", file=sys.stderr)

    def after(self):
        self.page.remove_server(self.server)
        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        test_utils.drop_database(connection, "acceptance_test_db")

    def _reset_options(self):
        # this will set focus to correct iframe.
        self.page.fill_codemirror_area_with('')

        query_op = self.page.find_by_id("btn-query-dropdown")
        query_op.click()
        ActionChains(self.driver).move_to_element(
            query_op.find_element_by_xpath(
                "//li[contains(.,'Explain Options')]")).perform()

        # disable Explain options and auto rollback only if they are enabled.
        for op in ('explain-verbose', 'explain-costs',
                   'explain-buffers', 'explain-timing', 'auto-rollback'):
            btn = self.page.find_by_id("btn-{}".format(op))
            check = btn.find_element_by_tag_name('i')
            if 'visibility-hidden' not in check.get_attribute('class'):
                btn.click()

        # enable autocommit only if it's disabled
        btn = self.page.find_by_id("btn-auto-commit")
        check = btn.find_element_by_tag_name('i')
        if 'visibility-hidden' in check.get_attribute('class'):
            btn.click()

        # close menu
        query_op.click()

    def _locate_database_tree_node(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('acceptance_test_db')

    def _clear_query_tool(self):
        self.page.click_element(
            self.page.find_by_xpath("//*[@id='btn-clear-dropdown']")
        )
        ActionChains(self.driver) \
            .move_to_element(self.page.find_by_xpath("//*[@id='btn-clear']")) \
            .perform()
        self.page.click_element(
            self.page.find_by_xpath("//*[@id='btn-clear']")
        )
        self.page.click_modal('Yes')

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
        wait = WebDriverWait(self.page.driver, 10)
        self.page.fill_codemirror_area_with(query)

        self.page.find_by_id("btn-flash").click()

        # self.page.wait_for_query_tool_loading_indicator_to_disappear()

        wait.until(EC.presence_of_element_located(
            (By.XPATH,
             '//span[@data-row="0" and text()="1"]'))
        )

        # scroll to bottom to fetch next chunk of result set.
        self.driver.execute_script(
            "pgAdmin.SqlEditor.jquery('.slick-viewport')"
            ".scrollTop(pgAdmin.SqlEditor.jquery('.grid-canvas').height());"
        )

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas")))

        self._check_ondemand_result(row_id_to_find, canvas)
        print("OK.", file=sys.stderr)

        print("On demand result set on grid select all... ",
              file=sys.stderr, end="")
        self.page.find_by_id("btn-flash").click()

        # self.page.wait_for_query_tool_loading_indicator_to_disappear()

        wait.until(EC.presence_of_element_located(
            (By.XPATH,
             '//span[@data-row="0" and text()="1"]'))
        )

        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, ".slick-header-column"))).click()

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas")))

        self._check_ondemand_result(row_id_to_find, canvas)
        print("OK.", file=sys.stderr)

        print("On demand result set on column select all... ",
              file=sys.stderr, end="")
        self.page.find_by_id("btn-flash").click()

        # self.page.wait_for_query_tool_loading_indicator_to_disappear()

        wait.until(EC.presence_of_element_located(
            (By.XPATH,
             '//span[@data-row="0" and text()="1"]'))
        )

        # click on first data column to select all column.
        wait.until(EC.presence_of_element_located(
            (
                By.XPATH,
                "//span[contains(@class, 'column-name') "
                "and contains(., 'id1')]"))
        ).click()

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas")))

        self._check_ondemand_result(row_id_to_find, canvas)
        print("OK.", file=sys.stderr)

    def _check_ondemand_result(self, row_id_to_find, canvas):
        # scroll to bottom to bring last row of next chunk in viewport.
        self.driver.execute_script(
            "pgAdmin.SqlEditor.jquery('.slick-viewport')"
            ".scrollTop(pgAdmin.SqlEditor.jquery('.grid-canvas').height());"
        )

        canvas.find_element_by_xpath(
            '//span[text()="{}"]'.format(row_id_to_find)
        )

    def _query_tool_explain_with_verbose_and_cost(self):
        query = """-- Explain query with verbose and cost
SELECT generate_series(1, 1000) as id order by id desc"""

        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)
        query_op = self.page.find_by_id("btn-query-dropdown")
        query_op.click()
        ActionChains(self.driver).move_to_element(
            query_op.find_element_by_xpath(
                "//li[contains(.,'Explain Options')]")).perform()

        self.page.find_by_id("btn-explain-verbose").click()

        self.page.find_by_id("btn-explain-costs").click()

        self.page.find_by_id("btn-explain").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab('Data Output')

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )

        # Search for 'Output' word in result (verbose option)
        canvas.find_element_by_xpath("//*[contains(string(), 'Output')]")

        # Search for 'Total Cost' word in result (cost option)
        canvas.find_element_by_xpath("//*[contains(string(),'Total Cost')]")

    def _query_tool_explain_analyze_with_buffers_and_timing(self):
        query = """-- Explain analyze query with buffers and timing
SELECT generate_series(1, 1000) as id order by id desc"""

        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)

        query_op = self.page.find_by_id("btn-query-dropdown")
        query_op.click()

        ActionChains(self.driver).move_to_element(
            query_op.find_element_by_xpath(
                "//li[contains(.,'Explain Options')]")).perform()

        self.page.find_by_id("btn-explain-buffers").click()

        self.page.find_by_id("btn-explain-timing").click()

        self.page.find_by_id("btn-explain-analyze").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab('Data Output')

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )
        # Search for 'Shared Read Blocks' word in result (buffers option)
        canvas.find_element_by_xpath(
            "//*[contains(string(), 'Shared Read Blocks')]"
        )

        # Search for 'Actual Total Time' word in result (timing option)
        canvas.find_element_by_xpath(
            "//*[contains(string(), 'Actual Total Time')]"
        )

    def _query_tool_auto_commit_disabled(self):
        table_name = 'query_tool_auto_commit_disabled_table'
        query = """-- 1. Disable auto commit.
-- 2. Create table in public schema.
-- 3. ROLLBACK transaction.
-- 4. Check if table is *NOT* created.
CREATE TABLE public.{}();""".format(table_name)
        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)

        self.page.find_by_id("btn-query-dropdown").click()

        self.page.find_by_id("btn-auto-commit").click()

        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.page.find_by_xpath(
            '//div[contains(@class, "sql-editor-message") and '
            'contains(string(), "CREATE TABLE")]'
        )

        self._clear_query_tool()
        query = """-- 1. (Done) Disable auto commit.
-- 2. (Done) Create table in public schema.
-- 3. ROLLBACK transaction.
-- 4. Check if table is *NOT* created.
ROLLBACK;"""
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.page.find_by_xpath(
            '//div[contains(@class, "sql-editor-message") and '
            'contains(string(), "ROLLBACK")]'
        )

        self._clear_query_tool()
        query = """-- 1. (Done) Disable auto commit.
-- 2. (Done) Create table in public schema.
-- 3. (Done) ROLLBACK transaction.
-- 4. Check if table is *NOT* created.
SELECT relname FROM pg_class
    WHERE relkind IN ('r','s','t') and relnamespace = 2200::oid;"""
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Data Output')
        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas")))

        el = canvas.find_elements_by_xpath(
            "//div[contains(@class, 'slick-cell') and "
            "contains(text(), '{}')]".format(table_name))

        assert len(el) == 0, "Table '{}' created with auto commit disabled " \
                             "and without any explicit commit.".format(
            table_name
        )

    def _query_tool_auto_commit_enabled(self):

        query = """-- 1. Enable auto commit.
-- 2. END any open transaction.
-- 3. Create table in public schema.
-- 4. ROLLBACK transaction
-- 5. Check if table is created event after ROLLBACK.
END;"""

        self.page.fill_codemirror_area_with(query)

        wait = WebDriverWait(self.page.driver, 10)

        btn_query_dropdown = wait.until(EC.presence_of_element_located(
            (By.ID, "btn-query-dropdown")))

        btn_query_dropdown.click()

        self.page.find_by_id("btn-auto-commit").click()

        self.page.find_by_id("btn-flash").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self._clear_query_tool()

        table_name = 'query_tool_auto_commit_enabled_table'
        query = """-- 1. (Done) END any open transaction.
-- 2. Enable auto commit.
-- 3. Create table in public schema.
-- 4. ROLLBACK transaction
-- 5. Check if table is created event after ROLLBACK.
CREATE TABLE public.{}();""".format(table_name)

        self.page.fill_codemirror_area_with(query)

        self.page.find_by_id("btn-flash").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.page.find_by_xpath(
            '//div[contains(@class, "sql-editor-message") and '
            'contains(string(), "CREATE TABLE")]'
        )

        self._clear_query_tool()
        query = """-- 1. (Done) END any open transaction if any.
-- 2. (Done) Enable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. ROLLBACK transaction
-- 5. Check if table is created event after ROLLBACK.
ROLLBACK;"""
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.page.find_by_xpath(
            '//div[contains(@class, "sql-editor-message") and '
            'contains(string(), "ROLLBACK")]'
        )

        self._clear_query_tool()
        query = """-- 1. (Done) END any open transaction if any.
-- 2. (Done) Enable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. (Done) ROLLBACK transaction
-- 5. Check if table is created event after ROLLBACK.
SELECT relname FROM pg_class
    WHERE relkind IN ('r','s','t') and relnamespace = 2200::oid;"""
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        self.page.click_tab('Data Output')
        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas")))

        el = canvas.find_elements_by_xpath(
            "//div[contains(@class, 'slick-cell') and "
            "contains(text(), '{}')]".format(table_name))

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

        self.page.find_by_id("btn-query-dropdown").click()

        self.page.find_by_id("btn-auto-rollback").click()

        self.page.find_by_id("btn-auto-commit").click()

        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self._clear_query_tool()

        query = """-- 1. (Done) END any open transaction.
-- 2. Enable auto rollback and disable auto commit.
-- 3. Create table in public schema.
-- 4. Generate error in transaction.
-- 5. END transaction.
-- 6. Check if table is *NOT* created after ending transaction.
CREATE TABLE public.{}();""".format(table_name)
        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)

        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.page.find_by_xpath(
            '//div[contains(@class, "sql-editor-message") and '
            'contains(string(), "CREATE TABLE")]'
        )

        self._clear_query_tool()
        query = """-- 1. (Done) END any open transaction.
-- 2. (Done) Enable auto rollback and disable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. Generate error in transaction.
-- 5. END transaction.
-- 6. Check if table is *NOT* created after ending transaction.
SELECT 1/0;"""
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.page.find_by_xpath(
            '//div[contains(@class, "sql-editor-message") and '
            'contains(string(), "division by zero")]'
        )

        self._clear_query_tool()
        query = """-- 1. (Done) END any open transaction.
-- 2. (Done) Enable auto rollback and disable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. (Done) Generate error in transaction.
-- 5. END transaction.
-- 6. Check if table is *NOT* created after ending transaction.
END;"""

        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.page.find_by_xpath(
            '//div[contains(@class, "sql-editor-message") and '
            'contains(string(), "Query returned successfully")]'
        )

        self._clear_query_tool()
        query = """-- 1. (Done) END any open transaction.
-- 2. (Done) Enable auto rollback and disable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. (Done) Generate error in transaction.
-- 5. (Done) END transaction.
-- 6. Check if table is *NOT* created after ending transaction.
SELECT relname FROM pg_class
    WHERE relkind IN ('r','s','t') and relnamespace = 2200::oid;"""
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Data Output')
        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas")))

        el = canvas.find_elements_by_xpath(
            "//div[contains(@class, 'slick-cell') and "
            "contains(text(), '{}')]".format(table_name))

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

        self.page.find_by_id("btn-query-dropdown").click()

        auto_rollback_btn = self.page.find_by_id("btn-auto-rollback")

        auto_rollback_check = auto_rollback_btn.find_element_by_tag_name("i")

        # if auto rollback is enabled then 'i' element will
        # have 'auto-rollback fa fa-check' classes
        # if auto rollback is disabled then 'i' element will
        # have 'auto-rollback fa fa-check visibility-hidden' classes

        if 'auto-rollback fa fa-check' == str(
           auto_rollback_check.get_attribute('class')):
            auto_rollback_btn.click()

        auto_commit_btn = self.page.find_by_id("btn-auto-commit")

        auto_commit_check = auto_commit_btn.find_element_by_tag_name("i")

        # if auto commit is enabled then 'i' element will
        # have 'auto-commit fa fa-check' classes
        # if auto commit is disabled then 'i' element will
        # have 'auto-commit fa fa-check visibility-hidden' classes

        if 'auto-commit fa fa-check visibility-hidden' == str(
           auto_commit_check.get_attribute('class')):
            auto_commit_btn.click()

        self.page.find_by_id("btn-flash").click()
        self.page.find_by_xpath("//*[@id='fetching_data']")
        self.page.find_by_id("btn-cancel-query").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.page.find_by_xpath(
            '//div[contains(@class, "sql-editor-message") and '
            'contains(string(), "canceling statement due to user request")]'
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
        wait = WebDriverWait(self.page.driver, 60)

        print("\n\tListen on an event... ", file=sys.stderr, end="")
        self.page.fill_codemirror_area_with("LISTEN foo;")
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')

        wait.until(EC.text_to_be_present_in_element(
            (By.CSS_SELECTOR, ".sql-editor-message"), "LISTEN")
        )
        print("OK.", file=sys.stderr)
        self._clear_query_tool()

        print("\tNotify event without data... ", file=sys.stderr, end="")
        self.page.fill_codemirror_area_with("NOTIFY foo;")
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Notifications')
        wait.until(EC.text_to_be_present_in_element(
            (By.CSS_SELECTOR, "td.channel"), "foo")
        )
        print("OK.", file=sys.stderr)
        self._clear_query_tool()

        print("\tNotify event with data... ", file=sys.stderr, end="")
        if self._supported_server_version():
            self.page.fill_codemirror_area_with("SELECT pg_notify('foo', "
                                                "'Hello')")
            self.page.find_by_id("btn-flash").click()
            self.page.wait_for_query_tool_loading_indicator_to_disappear()
            self.page.click_tab('Notifications')
            wait.until(WaitForAnyElementWithText(
                (By.CSS_SELECTOR, 'td.payload'), "Hello"))
            print("OK.", file=sys.stderr)
            self._clear_query_tool()
        else:
            print("Skipped.", file=sys.stderr)

    def _supported_jit_on_server(self):
        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )

        pg_cursor = connection.cursor()
        pg_cursor.execute('select version()')
        version_string = pg_cursor.fetchone()

        is_edb = False
        if len(version_string) > 0:
            is_edb = 'EnterpriseDB' in version_string[0]

        connection.close()

        return connection.server_version >= 110000 and not is_edb

    def _query_tool_explain_check_jit_stats(self):
        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with("SET jit_above_cost=10;")
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self._clear_query_tool()

        self.page.fill_codemirror_area_with("SELECT count(*) FROM pg_class;")
        query_op = self.page.find_by_id("btn-query-dropdown")
        query_op.click()
        ActionChains(self.driver).move_to_element(
            query_op.find_element_by_xpath(
                "//li[contains(.,'Explain Options')]")).perform()

        self.page.find_by_id("btn-explain-verbose").click()
        self.page.find_by_id("btn-explain-costs").click()
        self.page.find_by_id("btn-explain-analyze").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Data Output')

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )
        # Search for 'Output' word in result (verbose option)
        canvas.find_element_by_xpath("//*[contains(string(), 'JIT')]")

        self._clear_query_tool()


class WaitForAnyElementWithText(object):
    def __init__(self, locator, text):
        self.locator = locator
        self.text = text

    def __call__(self, driver):
        try:
            elements = EC._find_elements(driver, self.locator)
            for elem in elements:
                if self.text in elem.text:
                    return True
            return False
        except StaleElementReferenceException:
            return False
