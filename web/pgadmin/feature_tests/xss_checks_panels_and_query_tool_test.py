##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest


class CheckForXssFeatureTest(BaseFeatureTest):
    """
    Tests to check if pgAdmin4 is vulnerable to XSS.

    Here we will check html source code for escaped characters if we
    found them in the code then we are not vulnerable otherwise we might.

    We will cover,
        1) Browser Tree (aciTree)
        2) Properties Tab (BackFrom)
        3) Dependents Tab (BackGrid)
        4) SQL Tab (Code Mirror)
        5) Query Tool (SlickGrid)
    """

    scenarios = [
        ("Test XSS check for panels and query tool", dict())
    ]
    test_table_name = "<h1>X"

    def before(self):
        test_utils.create_table(
            self.server, self.test_db, self.test_table_name
        )
        # This is needed to test dependents tab (eg: BackGrid)
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
        self._check_xss_in_properties_tab()
        self._check_xss_in_sql_tab()
        self._check_xss_in_dependents_tab()

        # Query tool
        self._check_xss_in_query_tool()
        self.page.close_query_tool()

    def after(self):
        self.page.remove_server(self.server)

    def _tables_node_expandable(self):
        self.page.toggle_open_server(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item(self.test_db)
        self.page.toggle_open_tree_item('Schemas')
        self.page.toggle_open_tree_item('public')
        self.page.toggle_open_tree_item('Tables')
        self.page.select_tree_item(self.test_table_name)

    def _check_xss_in_browser_tree(self):
        # Fetch the inner html & check for escaped characters
        source_code = self.page.find_by_xpath(
            "//*[@id='tree']"
        ).get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            "&lt;h1&gt;X",
            "Browser tree"
        )

    def _check_xss_in_properties_tab(self):
        self.page.click_tab("Properties")
        source_code = self.page.find_by_xpath(
            "//span[contains(@class,'uneditable-input')]"
        ).get_attribute('innerHTML')
        self._check_escaped_characters(
            source_code,
            "&lt;h1&gt;X",
            "Properties tab (Backform Control)"
        )

    def _check_xss_in_sql_tab(self):
        self.page.click_tab("SQL")
        # Fetch the inner html & check for escaped characters
        source_code = self.page.find_by_xpath(
            "//*[contains(@class,'CodeMirror-lines') and "
            "contains(.,'CREATE TABLE')]"
        ).get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            "&lt;h1&gt;X",
            "SQL tab (Code Mirror)"
        )

    # Create any constraint with xss name to test this
    def _check_xss_in_dependents_tab(self):
        self.page.click_tab("Dependents")

        source_code = self.page.find_by_xpath(
            "//*[@id='5']/table/tbody/tr/td/div/div/div[2]/"
            "table/tbody/tr/td[2]"
        ).get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            "public.&lt;h1 onmouseover='console.log(2);'&gt;Y",
            "Dependents tab (BackGrid)"
        )

    def _check_xss_in_query_tool(self):
        self.page.driver.find_element_by_link_text("Tools").click()
        self.page.find_by_partial_link_text("Query Tool").click()
        self.page.click_tab('Query -')
        self.page.fill_codemirror_area_with(
            "select '<img src=\"x\" onerror=\"console.log(1)\">'"
        )
        self.page.find_by_id("btn-flash").click()

        result_row = self.page.find_by_xpath(
            "//*[contains(@class, 'ui-widget-content') and "
            "contains(@style, 'top:0px')]"
        )

        cells = result_row.find_elements_by_tag_name('div')

        # remove first element as it is row number.
        source_code = cells[1].get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            '&lt;img src="x" onerror="console.log(1)"&gt;',
            "Query tool (SlickGrid)"
        )

    def _check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        assert source_code.find(string_to_find) != - \
            1, "{0} might be vulnerable to XSS ".format(source)
