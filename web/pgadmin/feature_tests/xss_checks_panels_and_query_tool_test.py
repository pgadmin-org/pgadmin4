##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from selenium.webdriver import ActionChains
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest
import time

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

    def before(self):
        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")
        test_utils.create_database(self.server, "acceptance_test_db")
        test_utils.create_table(self.server, "acceptance_test_db",
                                "<h1>X")

        # This is needed to test dependents tab (eg: BackGrid)
        test_utils.create_constraint(self.server, "acceptance_test_db",
                                     "<h1>X",
                                     "unique", "<h1 onmouseover='console.log(2);'>Y")

    def runTest(self):
        self.page.wait_for_spinner_to_disappear()
        self._connects_to_server()
        self._tables_node_expandable()
        self._check_xss_in_browser_tree()
        self._check_xss_in_properties_tab()
        self._check_xss_in_sql_tab()
        self._check_xss_in_dependents_tab()

        # Query tool
        self._check_xss_in_query_tool()
        self._close_query_tool()

    def after(self):
        time.sleep(1)
        self.page.remove_server(self.server)
        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")

    def _connects_to_server(self):
        self.page.find_by_xpath("//*[@class='aciTreeText' and .='Servers']").click()
        self.page.driver.find_element_by_link_text("Object").click()
        ActionChains(self.page.driver) \
            .move_to_element(self.page.driver.find_element_by_link_text("Create")) \
            .perform()
        self.page.find_by_partial_link_text("Server...").click()

        server_config = self.server
        self.page.fill_input_by_field_name("name", server_config['name'])
        self.page.find_by_partial_link_text("Connection").click()
        self.page.fill_input_by_field_name("host", server_config['host'])
        self.page.fill_input_by_field_name("port", server_config['port'])
        self.page.fill_input_by_field_name("username", server_config['username'])
        self.page.fill_input_by_field_name("password", server_config['db_password'])
        self.page.find_by_xpath("//button[contains(.,'Save')]").click()

    def _tables_node_expandable(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('acceptance_test_db')
        self.page.toggle_open_tree_item('Schemas')
        self.page.toggle_open_tree_item('public')
        self.page.toggle_open_tree_item('Tables')
        self.page.select_tree_item("<h1>X")

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
            "//*[contains(@class,'CodeMirror-lines') and contains(.,'CREATE TABLE')]"
        ).get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            "&lt;h1&gt;X",
            "SQL tab (Code Mirror)"
        )

    def _check_xss_in_dependents_tab(self): # Create any constraint with xss name to test this
        self.page.click_tab("Dependents")

        source_code = self.page.find_by_xpath(
            "//*[@id='5']/table/tbody/tr/td/div/div/div[2]/table/tbody/tr/td[2]"
        ).get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            "public.&lt;h1 onmouseover='console.log(2);'&gt;Y",
            "Dependents tab (BackGrid)"
        )

    def _check_xss_in_query_tool(self):
        self.page.driver.find_element_by_link_text("Tools").click()
        self.page.find_by_partial_link_text("Query Tool").click()
        time.sleep(3)
        self.page.driver.switch_to.frame(self.page.driver.find_element_by_tag_name('iframe'))
        self.page.fill_codemirror_area_with("select '<img src=\"x\" onerror=\"console.log(1)\">'")
        time.sleep(1)
        self.page.find_by_id("btn-flash").click()
        time.sleep(2)

        source_code = self.page.find_by_xpath(
            "//*[@id='0']//*[@id='datagrid']/div[5]/div/div[1]/div[2]"
        ).get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            '&lt;img src="x" onerror="console.log(1)"&gt;',
            "Query tool (SlickGrid)"
        )

    def _close_query_tool(self):
        self.page.driver.switch_to_default_content()
        self.page.click_element(
            self.page.find_by_xpath("//*[@id='dockerContainer']/div/div[3]/div/div[2]/div[1]")
        )
        time.sleep(0.5)
        self.page.driver.switch_to.frame(self.page.driver.find_element_by_tag_name('iframe'))
        time.sleep(1)
        self.page.click_element(self.page.find_by_xpath("//button[contains(.,'Yes')]"))
        time.sleep(0.5)
        self.page.driver.switch_to_default_content()


    def _check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        if source_code.find(string_to_find) == -1:
            # No escaped characters found
            assert False, "{0} might be vulnerable to XSS ".format(source)
        else:
            # escaped characters found
            assert True
