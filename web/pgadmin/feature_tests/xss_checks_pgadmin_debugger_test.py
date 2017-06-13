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

class CheckDebuggerForXssFeatureTest(BaseFeatureTest):
    """Tests to check if Debugger is vulnerable to XSS."""

    scenarios = [
        ("Tests to check if Debugger is vulnerable to XSS", dict())
    ]

    def before(self):
        with test_utils.Database(self.server) as (connection, _):
            if connection.server_version < 90100:
                self.skipTest("Functions tree node is not present in pgAdmin below PG v9.1")

        # Some test function is needed for debugger
        test_utils.create_debug_function(self.server, "postgres",
                                   "test_function")

    def runTest(self):
        self.page.wait_for_spinner_to_disappear()
        self._connects_to_server()
        self._function_node_expandable()
        self._debug_function()

    def after(self):
        time.sleep(0.5)
        test_utils.drop_debug_function(self.server, "postgres",
                                   "test_function")
        self.page.remove_server(self.server)

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

    def _function_node_expandable(self):
        self.page.toggle_open_server(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('postgres')
        self.page.toggle_open_tree_item('Schemas')
        self.page.toggle_open_tree_item('public')
        self.page.toggle_open_tree_item('Functions')
        self.page.select_tree_item("test_function()")

    def _debug_function(self):
        self.page.driver.find_element_by_link_text("Object").click()
        ActionChains(self.page.driver) \
            .move_to_element(self.page.driver.find_element_by_link_text("Debugging")) \
            .perform()
        self.page.driver.find_element_by_link_text("Debug").click()
        time.sleep(0.5)
        # We need to check if debugger plugin is installed or not
        try:
            is_error = self.page.find_by_xpath(
                "//div[contains(@class,'ajs-header')]"
            ).text
        except Exception as e:
            is_error = None

        # If debugger plugin is not found
        if is_error and is_error == "Debugger Error":
            self.page.click_modal('OK')
            self.skipTest("Please make sure that debugger plugin is properly configured")
        else:
            time.sleep(2)
            self.page.driver.switch_to.frame(self.page.driver.find_element_by_tag_name('iframe'))
            self.page.click_element(self.page.driver.find_elements_by_xpath("//button")[2])
            time.sleep(2)

            # Only this tab is vulnerable rest are BackGrid & Code Mirror control
            # which are already tested in Query tool test case
            self.page.click_tab("Messages")
            source_code = self.page.find_by_xpath(
                "//*[@id='messages']"
            ).get_attribute('innerHTML')

            self._check_escaped_characters(
                source_code,
                'NOTICE:  &lt;img src="x" onerror="console.log(1)"&gt;',
                'Debugger'
            )
            self._close_debugger()

    def _close_debugger(self):
        time.sleep(0.5)
        self.page.driver.switch_to_default_content()
        time.sleep(0.5)
        self.page.click_element(
            self.page.find_by_xpath("//*[@id='dockerContainer']/div/div[3]/div/div[2]/div[1]")
        )

    def _check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        if source_code.find(string_to_find) == -1:
            # No escaped characters found
            assert False, "{0} might be vulnerable to XSS ".format(source)
        else:
            # escaped characters found
            assert True
