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
from regression.feature_utils.base_feature_test import BaseFeatureTest
from selenium.webdriver import ActionChains
from selenium.common.exceptions import StaleElementReferenceException, \
    WebDriverException
from selenium.webdriver.common.by import By
from regression.feature_utils.locators import QueryToolLocators
from regression.feature_utils.tree_area_locators import TreeAreaLocators


class CheckForXssFeatureTest(BaseFeatureTest):
    """
    Tests to check if pgAdmin4 is vulnerable to XSS.

    Here we will check html source code for escaped characters if we
    found them in the code then we are not vulnerable otherwise we might.

    We will cover,
        1) Browser Tree
        2) Properties Tab
        3) Dependents Tab
        4) SQL Tab (Code Mirror)
        5) Query Tool (Result Grid)
    """

    scenarios = [
        ("Test XSS check for panels and query tool", dict())
    ]
    test_type_name = '"<script>alert(1)</script>"'
    check_xss_chars = '&lt;h1&gt;X'
    check_xss_chars_set2 = '&lt;script&gt;alert(1)&lt;/script&gt;'

    def before(self):
        self.test_table_name = "<h1>X" + str(secrets.choice(range(1000, 3000)))

        test_utils.create_type(
            self.server, self.test_db, self.test_type_name,
            ['"<script>alert(1)</script>" "char"',
             '"1<script>alert(1)</script>" "char"']
        )
        test_utils.create_table(
            self.server, self.test_db, self.test_table_name,
            ['"<script>alert(1)</script>" char',
             'typcol ' + self.test_type_name]
        )
        # This is needed to test dependents tab
        test_utils.create_constraint(
            self.server, self.test_db,
            self.test_table_name,
            "unique", "<h1 onmouseover='console.log(2);'>Y"
        )

    def runTest(self):
        self.page.wait_for_spinner_to_disappear()
        self.page.add_server(self.server)
        self._tables_node_expandable()
        self._check_xss_in_browser_tree()
        self._check_xss_in_sql_tab()
        self._check_xss_in_dependents_tab()
        # sometime the tab for dependent does not show info, so refreshing
        # the page and then again collapsing until the table node
        # retry = 2
        # while retry > 0:
        #     try:
        #         self.page.refresh_page()
        #         self.page.wait_for_spinner_to_disappear()
        #         self._tables_node_expandable()
        #         self._check_xss_in_dependents_tab()
        #         retry = 0
        #     except WebDriverException as e:
        #         print("Exception in dependent check {0}".format(retry),
        #               file=sys.stderr)
        #         if retry == 1:
        #             raise e
        #         retry -= 1

        # Query tool
        self.page.open_query_tool()
        self._check_xss_in_query_tool()
        self._check_xss_in_query_tool_history()
        self.page.close_query_tool()
        # Query tool view/edit data
        self.page.open_view_data(self.test_db)
        self._check_xss_view_data()
        self.page.close_data_grid()

        # Explain module
        self.page.open_query_tool()
        self._check_xss_in_explain_module()
        self.page.close_query_tool()

    def after(self):
        self.page.remove_server(self.server)
        test_utils.delete_table(
            self.server, self.test_db, self.test_table_name)

    def _tables_node_expandable(self):
        self.page.expand_tables_node("Server", self.server['name'],
                                     self.server['db_password'], self.test_db,
                                     'public')

        table_node = self.page.check_if_element_exists_with_scroll(
            TreeAreaLocators.table_node(self.test_table_name))

        self.assertTrue(bool(table_node),
                        self.test_table_name + ' table node not found.')

        table_node.click()

    def _check_xss_in_browser_tree(self):
        print(
            "\n\tChecking the Browser tree for XSS vulnerabilities",
            file=sys.stderr, end=""
        )
        # Fetch the inner html & check for escaped characters
        source_code = self.page.find_by_xpath(
            "//*[@id='tree']"
        ).get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            self.check_xss_chars,
            "Browser tree"
        )

    def _check_xss_in_sql_tab(self):
        print(
            "\n\tChecking the SQL tab for for XSS vulnerabilities",
            file=sys.stderr, end=""
        )
        self.page.click_tab("SQL")

        # Wait till data is displayed in SQL Tab
        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            "//*[contains(@class,'CodeMirror-lines') and "
            "contains(.,'CREATE TABLE')]", 10), "No data displayed in SQL tab")

        # Fetch the inner html & check for escaped characters
        source_code = self.page.find_by_xpath(
            "//*[contains(@class,'CodeMirror-lines') and "
            "contains(.,'CREATE TABLE')]"
        ).get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            self.check_xss_chars,
            "SQL tab (Code Mirror)"
        )

    # Create any constraint with xss name to test this
    def _check_xss_in_dependents_tab(self):

        print(
            "\n\tChecking the Dependents tab for XSS vulnerabilities",
            file=sys.stderr, end=""
        )

        retry = 2
        while retry > 0:
            try:
                self.page.click_tab("Dependents")
                source_code = \
                    self.page.find_by_xpath(
                        "//*[@id='5']/table/tbody/tr/td/div/div/div[2]/div"
                        "/div[2]/div[1]/div/div/div/div/"
                        "div/div[2]").get_attribute('innerHTML')
                retry = 0
            except WebDriverException as e:
                print("Exception in dependent tab {0}".format(retry),
                      file=sys.stderr)
                self.page.click_tab("Dependencies")
                if retry == 1:
                    self.page.click_tab("Dependents")
                    raise e
                retry -= 1

        self._check_escaped_characters(
            source_code,
            "public.&lt;h1 onmouseover='console.log(2);'&gt;Y",
            "Dependents tab"
        )

    def _check_xss_in_query_tool(self):
        print(
            "\n\tChecking the Result Grid cell for XSS vulnerabilities",
            file=sys.stderr, end=""
        )
        self.page.fill_codemirror_area_with(
            "select '<img src=\"x\" onerror=\"console.log(1)\">'"
        )
        self.page.find_by_css_selector(
            QueryToolLocators.btn_execute_query_css).click()

        source_code = self.page\
            .find_by_xpath(QueryToolLocators.output_cell_xpath.format(2, 2))\
            .get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            '&lt;img src="x" onerror="console.log(1)"&gt;',
            "Query tool (Result Grid)"
        )

    def _check_xss_in_query_tool_history(self):
        print(
            "\n\tChecking the Query Tool history for XSS vulnerabilities... ",
            file=sys.stderr, end=""
        )
        self.page.fill_codemirror_area_with(
            "select '<script>alert(1)</script>"
        )
        self.page.find_by_css_selector(
            QueryToolLocators.btn_execute_query_css).click()

        self.page.click_tab('id-history', rc_dock=True)

        # Check for history entry
        history_ele = self.page\
            .find_by_css_selector(
                QueryToolLocators.query_history_specific_entry.format(2))

        source_code = history_ele.get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            self.check_xss_chars_set2,
            "Query tool (History Entry)"
        )

        retry = 2
        while retry > 0:
            try:
                history_ele = self.driver \
                    .find_element(By.CSS_SELECTOR,
                                  QueryToolLocators.query_history_detail)
                source_code = history_ele.get_attribute('innerHTML')
                break
            except StaleElementReferenceException:
                retry -= 1

        self._check_escaped_characters(
            source_code,
            self.check_xss_chars_set2,
            "Query tool (History Details-Message)"
        )

        self.page.click_tab('id-query', rc_dock=True)

    def _check_xss_view_data(self):
        print(
            "\n\tChecking the Result Grid cell for XSS vulnerabilities",
            file=sys.stderr, end=""
        )

        # remove first element as it is row number.
        # currently 4th col
        source_code = self.page \
            .find_by_xpath(QueryToolLocators.output_cell_xpath.format(1, 5)) \
            .get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            self.check_xss_chars_set2,
            "View Data (Result Grid)"
        )

    def _check_xss_in_explain_module(self):
        print(
            "\n\tChecking the Graphical Explain plan for XSS vulnerabilities",
            file=sys.stderr, end=""
        )
        self.page.fill_codemirror_area_with(
            'select * from "{0}"'.format(self.test_table_name)
        )

        self.page.find_by_css_selector(
            QueryToolLocators.btn_explain).click()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        self.page.click_tab('id-explain', rc_dock=True)

        for idx in range(3):
            # Re-try logic
            try:
                ActionChains(self.driver).move_to_element(
                    self.driver.find_element(
                        By.CSS_SELECTOR,
                        'div#id-explain svg > g > g > image')
                ).click().perform()
                break
            except Exception:
                if idx != 2:
                    continue
                else:
                    print(
                        "\n\tUnable to locate the explain container to check"
                        " the image tooltip for XSS",
                        file=sys.stderr, end=""
                    )
                    raise

        source_code = self.driver.find_element(
            By.CSS_SELECTOR, QueryToolLocators.explain_details)\
            .get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            self.check_xss_chars,
            "Explain tab (Graphical explain plan)"
        )

    def _check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        assert source_code.find(string_to_find) != - \
            1, "{0} might be vulnerable to XSS ".format(source)
