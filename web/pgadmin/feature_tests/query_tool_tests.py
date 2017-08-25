##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from __future__ import print_function
import time
import sys
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
        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'],
                                                  self.server['sslmode'])
        test_utils.drop_database(connection, "acceptance_test_db")
        test_utils.create_database(self.server, "acceptance_test_db")
        self.page.wait_for_spinner_to_disappear()
        self._connects_to_server()
        self._locate_database_tree_node()
        self.page.open_query_tool()

    def runTest(self):
        # on demand result set on scrolling.
        print("\nOn demand result set on scrolling... ",
              file=sys.stderr, end="")
        self._on_demand_result()
        print("OK.",
              file=sys.stderr)
        self._clear_query_tool()

        # on demand result set on grid select all.
        print("On demand result set on grid select all... ",
              file=sys.stderr, end="")
        self._on_demand_result_select_all_grid()
        print("OK.",
              file=sys.stderr)
        self._clear_query_tool()

        # on demand result set on column select all.
        print("On demand result set on column select all... ",
              file=sys.stderr, end="")
        self._on_demand_result_select_all_column()
        print("OK.",
              file=sys.stderr)
        self._clear_query_tool()

        # explain query
        print("Explain query... ", file=sys.stderr, end="")
        self._query_tool_explain()
        print("OK.", file=sys.stderr)
        self._clear_query_tool()

        # explain query with verbose
        print("Explain query with verbose... ", file=sys.stderr, end="")
        self._query_tool_explain_verbose()
        print("OK.", file=sys.stderr)
        self._clear_query_tool()

        # explain query with costs
        print("Explain query with costs... ", file=sys.stderr, end="")
        self._query_tool_explain_cost()
        print("OK.", file=sys.stderr)
        self._clear_query_tool()

        # explain analyze query
        print("Explain analyze query... ", file=sys.stderr, end="")
        self._query_tool_explain_analyze()
        print("OK.", file=sys.stderr)
        self._clear_query_tool()

        # explain analyze query with buffers
        print("Explain analyze query with buffers... ", file=sys.stderr, end="")
        self._query_tool_explain_analyze_buffers()
        print("OK.", file=sys.stderr)
        self._clear_query_tool()

        # explain analyze query with timing
        print("Explain analyze query with timing... ", file=sys.stderr, end="")
        self._query_tool_explain_analyze_timing()
        print("OK.", file=sys.stderr)
        self._clear_query_tool()

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

    def after(self):
        self.page.remove_server(self.server)
        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'],
                                                  self.server['sslmode'])
        test_utils.drop_database(connection, "acceptance_test_db")

    def _connects_to_server(self):
        self.page.find_by_xpath(
            "//*[@class='aciTreeText' and .='Servers']").click()
        time.sleep(2)
        self.page.driver.find_element_by_link_text("Object").click()
        ActionChains(self.page.driver) \
            .move_to_element(
            self.page.driver.find_element_by_link_text("Create"))\
            .perform()
        self.page.find_by_partial_link_text("Server...").click()

        server_config = self.server
        self.page.fill_input_by_field_name("name", server_config['name'])
        self.page.find_by_partial_link_text("Connection").click()
        self.page.fill_input_by_field_name("host", server_config['host'])
        self.page.fill_input_by_field_name("port", server_config['port'])
        self.page.fill_input_by_field_name(
            "username",
            server_config['username']
        )
        self.page.fill_input_by_field_name(
            "password",
            server_config['db_password']
        )
        self.page.find_by_xpath("//button[contains(.,'Save')]").click()

    def _locate_database_tree_node(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('acceptance_test_db')

    def _clear_query_tool(self):
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

    def _on_demand_result(self):
        ON_DEMAND_CHUNKS = 2
        query = """-- On demand query result on scroll
SELECT generate_series(1, {}) as id""".format(
            config.ON_DEMAND_RECORD_COUNT * ON_DEMAND_CHUNKS)

        wait = WebDriverWait(self.page.driver, 10)
        time.sleep(1)
        self.page.fill_codemirror_area_with(query)

        self.page.find_by_id("btn-flash").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas")))

        # scroll to bottom to fetch next chunk of result set.
        self.driver.execute_script(
            "pgAdmin.SqlEditor.jquery('.slick-viewport').scrollTop(pgAdmin.SqlEditor.jquery('.grid-canvas').height());"
        )
        # wait for ajax to complete.
        time.sleep(1)

        # again scroll to bottom to bring last row of next chunk in
        # viewport.
        self.driver.execute_script(
            "pgAdmin.SqlEditor.jquery('.slick-viewport').scrollTop(pgAdmin.SqlEditor.jquery('.grid-canvas').height());"
        )

        row_id_to_find = config.ON_DEMAND_RECORD_COUNT * ON_DEMAND_CHUNKS

        canvas.find_element_by_xpath(
            '//span[text()="{}"]'.format(row_id_to_find)
        )

    def _on_demand_result_select_all_grid(self):
        ON_DEMAND_CHUNKS = 3
        query = """-- On demand query result on grid select all
SELECT generate_series(1, {}) as id""".format(
            config.ON_DEMAND_RECORD_COUNT * ON_DEMAND_CHUNKS)

        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)

        self.page.find_by_id("btn-flash").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, ".slick-header-column"))).click()

        # wait for until all records are fetched and selected.
        time.sleep(1)
        # scroll to bottom to bring last row of next chunk in
        # viewport.
        self.driver.execute_script(
            "pgAdmin.SqlEditor.jquery('.slick-viewport').scrollTop(pgAdmin.SqlEditor.jquery('.grid-canvas').height());"
        )

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )

        row_id_to_find = config.ON_DEMAND_RECORD_COUNT * ON_DEMAND_CHUNKS

        canvas.find_element_by_xpath(
            '//span[text()="{}"]'.format(row_id_to_find)
        )

    def _on_demand_result_select_all_column(self):
        ON_DEMAND_CHUNKS = 4
        query = """-- On demand query result on column select all
SELECT generate_series(1, {}) as id1, 'dummy' as id2""".format(
            config.ON_DEMAND_RECORD_COUNT * ON_DEMAND_CHUNKS)

        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)

        self.page.find_by_id("btn-flash").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        # click on first data column to select all column.

        wait.until(EC.presence_of_element_located(
          (
            By.XPATH,
            "//span[contains(@class, 'column-name') and contains(., 'id1')]"))
        ).click()

        # wait for until all records are fetched and selected.
        time.sleep(1)
        # scroll to bottom to bring last row of next chunk in
        # viewport.
        self.driver.execute_script(
            "pgAdmin.SqlEditor.jquery('.slick-viewport').scrollTop(pgAdmin.SqlEditor.jquery('.grid-canvas').height());"
        )

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )

        row_id_to_find = config.ON_DEMAND_RECORD_COUNT * ON_DEMAND_CHUNKS

        canvas.find_element_by_xpath(
            '//span[text()="{}"]'.format(row_id_to_find)
        )

    def _query_tool_explain(self):
        query = """-- Explain query
SELECT generate_series(1, 1000) as id order by id desc"""

        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-query-dropdown").click()
        self.page.find_by_id("btn-explain").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab('Data Output')

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )
        # Search for Plan word in result
        canvas.find_element_by_xpath("//*[contains(string(),'Plan')]")

    def _query_tool_explain_verbose(self):
        query = """-- Explain query with verbose
SELECT generate_series(1, 1000) as id order by id desc"""

        wait = WebDriverWait(self.page.driver, 10)
        self.page.fill_codemirror_area_with(query)
        query_op = self.page.find_by_id("btn-query-dropdown")
        query_op.click()
        ActionChains(self.driver).move_to_element(
            query_op.find_element_by_xpath(
                "//li[contains(.,'Explain Options')]")).perform()
        self.page.find_by_id("btn-explain-verbose").click()
        self.page.find_by_id("btn-explain").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Data Output')
        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )
        # Search for 'Output' word in result
        canvas.find_element_by_xpath("//*[contains(string(), 'Output')]")

    def _query_tool_explain_cost(self):
        query = """-- Explain query with costs
SELECT generate_series(1, 1000) as id order by id desc"""

        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)
        query_op = self.page.find_by_id("btn-query-dropdown")
        query_op.click()

        ActionChains(self.driver).move_to_element(
            query_op.find_element_by_xpath(
                "//li[contains(.,'Explain Options')]")).perform()

        self.page.find_by_id("btn-explain-costs").click()

        self.page.find_by_id("btn-explain").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab('Data Output')

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )
        # Search for 'Total Cost word in result
        canvas.find_element_by_xpath("//*[contains(string(),'Total Cost')]")

    def _query_tool_explain_analyze(self):
        query = """-- Explain analyze query
SELECT generate_series(1, 1000) as id order by id desc"""

        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)

        self.page.find_by_id("btn-query-dropdown").click()
        self.page.find_by_id("btn-explain-analyze").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab('Data Output')

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )
        # Search for Actual Rows word in result
        canvas.find_element_by_xpath("//*[contains(string(),'Actual Rows')]")

    def _query_tool_explain_analyze_buffers(self):
        query = """-- Explain analyze query with buffers
SELECT generate_series(1, 1000) as id order by id desc"""

        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)

        query_op = self.page.find_by_id("btn-query-dropdown")
        query_op.click()

        ActionChains(self.driver).move_to_element(
            query_op.find_element_by_xpath(
                "//li[contains(.,'Explain Options')]")).perform()

        self.page.find_by_id("btn-explain-buffers").click()

        self.page.find_by_id("btn-explain-analyze").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab('Data Output')

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )
        # Search for 'Shared Read Blocks' word in result
        canvas.find_element_by_xpath("//*[contains(string(), 'Shared Read Blocks')]")

    def _query_tool_explain_analyze_timing(self):
        query = """-- Explain analyze query with timing
SELECT generate_series(1, 1000) as id order by id desc"""

        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)
        query_op = self.page.find_by_id("btn-query-dropdown")
        query_op.click()

        ActionChains(self.driver).move_to_element(
            query_op.find_element_by_xpath(
                "//li[contains(.,'Explain Options')]")).perform()

        self.page.find_by_id("btn-explain-timing").click()

        self.page.find_by_id("btn-explain-analyze").click()

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab('Data Output')

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )
        # Search for 'Actual Total Time' word in result
        canvas.find_element_by_xpath("//*[contains(string(), 'Actual Total Time')]")

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

        auto_commit_btn = self.page.find_by_id("btn-auto-commit")

        auto_commit_check = auto_commit_btn.find_element_by_tag_name("i")

        # if auto commit is enabled then 'i' element will
        # have 'auto-commit fa fa-check' classes
        # if auto commit is disabled then 'i' element will
        # have 'auto-commit fa fa-check visibility-hidden' classes

        if 'auto-commit fa fa-check' == str(auto_commit_check.get_attribute(
                'class')):
            auto_commit_btn.click()

        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.driver.find_element_by_xpath(
            '//div[contains(@class, "sql-editor-message") and contains(string(), "CREATE TABLE")]'
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
        self.driver.find_element_by_xpath(
            '//div[contains(@class, "sql-editor-message") and contains(string(), "ROLLBACK")]'
        )

        self._clear_query_tool()
        query = """-- 1. (Done) Disable auto commit.
-- 2. (Done) Create table in public schema.
-- 3. (Done) ROLLBACK transaction.
-- 4. Check if table is *NOT* created.
SELECT relname FROM pg_class WHERE relkind IN ('r','s','t') and relnamespace = 2200::oid;"""
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Data Output')
        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas")))

        el = canvas.find_elements_by_xpath("//div[contains(@class, 'slick-cell') and contains(text(), '{}')]".format(table_name))

        assert len(el) == 0, "Table '{}' created with auto commit disabled and without any explicit commit.".format(table_name)

    def _query_tool_auto_commit_enabled(self):
        table_name = 'query_tool_auto_commit_enabled_table'
        query = """-- 1. END any open transaction.
-- 2. Enable auto commit.
-- 3. Create table in public schema.
-- 4. ROLLBACK transaction
-- 5. Check if table is created event after ROLLBACK.
END;
CREATE TABLE public.{}();""".format(table_name)
        wait = WebDriverWait(self.page.driver, 10)

        self.page.fill_codemirror_area_with(query)

        self.page.find_by_id("btn-query-dropdown").click()

        auto_commit_btn = self.page.find_by_id("btn-auto-commit")

        auto_commit_check = auto_commit_btn.find_element_by_tag_name("i")

        # if auto commit is enabled then 'i' element will
        # have 'auto-commit fa fa-check' classes
        # if auto commit is disabled then 'i' element will
        # have 'auto-commit fa fa-check visibility-hidden' classes

        if 'auto-commit fa fa-check visibility-hidden' == str(auto_commit_check.get_attribute(
                'class')):
            auto_commit_btn.click()
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.driver.find_element_by_xpath(
            '//div[contains(@class, "sql-editor-message") and contains(string(), "CREATE TABLE")]'
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
        self.driver.find_element_by_xpath(
            '//div[contains(@class, "sql-editor-message") and contains(string(), "ROLLBACK")]'
        )

        self._clear_query_tool()
        query = """-- 1. (Done) END any open transaction if any.
-- 2. (Done) Enable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. (Done) ROLLBACK transaction
-- 5. Check if table is created event after ROLLBACK.
SELECT relname FROM pg_class WHERE relkind IN ('r','s','t') and relnamespace = 2200::oid;"""
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        self.page.click_tab('Data Output')
        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas")))

        el = canvas.find_elements_by_xpath("//div[contains(@class, 'slick-cell') and contains(text(), '{}')]".format(table_name))

        assert len(el) != 0, "Table '{}' is not created with auto commit enabled.".format(table_name)

    def _query_tool_auto_rollback_enabled(self):
        table_name = 'query_tool_auto_rollback_enabled_table'
        query = """-- 1. END any open transaction.
-- 2. Enable auto rollback and disable auto commit.
-- 3. Create table in public schema.
-- 4. Generate error in transaction.
-- 5. END transaction.
-- 6. Check if table is *NOT* created after ending transaction.
END;"""
        self.page.fill_codemirror_area_with(query)

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

        self.page.find_by_id("btn-query-dropdown").click()

        auto_rollback_btn = self.page.find_by_id("btn-auto-rollback")

        auto_rollback_check = auto_rollback_btn.find_element_by_tag_name("i")

        # if auto rollback is enabled then 'i' element will
        # have 'auto-rollback fa fa-check' classes
        # if auto rollback is disabled then 'i' element will
        # have 'auto-rollback fa fa-check visibility-hidden' classes

        if 'auto-rollback fa fa-check visibility-hidden' == str(auto_rollback_check.get_attribute(
                'class')):
            auto_rollback_btn.click()

        auto_commit_btn = self.page.find_by_id("btn-auto-commit")

        auto_commit_check = auto_commit_btn.find_element_by_tag_name("i")

        # if auto commit is enabled then 'i' element will
        # have 'auto-commit fa fa-check' classes
        # if auto commit is disabled then 'i' element will
        # have 'auto-commit fa fa-check visibility-hidden' classes

        if 'auto-commit fa fa-check' == str(auto_commit_check.get_attribute(
                'class')):
            auto_commit_btn.click()

        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.driver.find_element_by_xpath(
            '//div[contains(@class, "sql-editor-message") and contains(string(), "CREATE TABLE")]'
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
            '//div[contains(@class, "sql-editor-message") and contains(string(), "division by zero")]'
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
            '//div[contains(@class, "sql-editor-message") and contains(string(), "Query returned successfully")]'
        )

        self._clear_query_tool()
        query = """-- 1. (Done) END any open transaction.
-- 2. (Done) Enable auto rollback and disable auto commit.
-- 3. (Done) Create table in public schema.
-- 4. (Done) Generate error in transaction.
-- 5. (Done) END transaction.
-- 6. Check if table is *NOT* created after ending transaction.
SELECT relname FROM pg_class WHERE relkind IN ('r','s','t') and relnamespace = 2200::oid;"""
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Data Output')
        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas")))

        el = canvas.find_elements_by_xpath("//div[contains(@class, 'slick-cell') and contains(text(), '{}')]".format(table_name))

        assert len(el) == 0, "Table '{}' created even after ROLLBACK due to sql error.".format(table_name)

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

        if 'auto-rollback fa fa-check' == str(auto_rollback_check.get_attribute(
                'class')):
            auto_rollback_btn.click()

        auto_commit_btn = self.page.find_by_id("btn-auto-commit")

        auto_commit_check = auto_commit_btn.find_element_by_tag_name("i")

        # if auto commit is enabled then 'i' element will
        # have 'auto-commit fa fa-check' classes
        # if auto commit is disabled then 'i' element will
        # have 'auto-commit fa fa-check visibility-hidden' classes

        if 'auto-commit fa fa-check visibility-hidden' == str(auto_commit_check.get_attribute(
                'class')):
            auto_commit_btn.click()

        self.page.find_by_id("btn-flash").click()
        self.page.find_by_xpath("//*[@id='fetching_data']")
        self.page.find_by_id("btn-cancel-query").click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('Messages')
        self.page.find_by_xpath(
            '//div[contains(@class, "sql-editor-message") and contains(string(), "canceling statement due to user request")]'
        )
