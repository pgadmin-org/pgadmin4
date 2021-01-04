##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import random

from selenium.webdriver import ActionChains
from selenium.common.exceptions import TimeoutException
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.feature_utils.tree_area_locators import TreeAreaLocators
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By


class CheckDebuggerForXssFeatureTest(BaseFeatureTest):
    """Tests to check if Debugger is vulnerable to XSS."""

    scenarios = [
        ("Tests to check if Debugger is vulnerable to XSS", dict())
    ]
    function_name = ""

    def before(self):
        with test_utils.Database(self.server) as (connection, _):
            if connection.server_version < 90100:
                self.skipTest(
                    "Functions tree node is not present in pgAdmin below "
                    "PG v9.1"
                )

        # Some test function is needed for debugger
        self.function_name = "a_test_function" + \
                             str(random.randint(10000, 65535))
        test_utils.create_debug_function(
            self.server, self.test_db, self.function_name
        )

        if test_utils.does_function_exist(self.server, self.test_db,
                                          self.function_name) != 'True':
            raise RuntimeError("The required function is not found")

    def runTest(self):
        self.page.wait_for_spinner_to_disappear()
        self.page.add_server(self.server)
        self._function_node_expandable()
        self._debug_function()

    def after(self):
        self.page.remove_server(self.server)
        test_utils.drop_debug_function(self.server, self.test_db,
                                       self.function_name)

    def _function_node_expandable(self):
        self.page.expand_database_node(
            self.server['name'],
            self.server['db_password'], self.test_db)
        self.page.toggle_open_schema_node(self.server['name'],
                                          self.server['db_password'],
                                          self.test_db, 'public')
        self.page.toggle_open_function_node()
        self.page.click_a_tree_node(
            self.function_name + "()",
            TreeAreaLocators.sub_nodes_of_functions_node)

    def _debug_function(self):
        self.page.driver.find_element_by_link_text("Object").click()
        ActionChains(
            self.page.driver
        ).move_to_element(
            self.page.driver.find_element_by_link_text("Debugging")
        ).perform()
        self.page.driver.find_element_by_link_text("Debug").click()

        # We need to check if debugger plugin is installed or not
        try:
            wait = WebDriverWait(self.page.driver, 2)
            is_error = wait.until(EC.presence_of_element_located(
                (By.XPATH, "//div[contains(@class, 'alertify') and "
                           "not(contains(@class, 'ajs-hidden'))]//div["
                           "contains(@class,'ajs-header')]")
            ))

        except TimeoutException:
            is_error = None

        # If debugger plugin is not found
        if is_error and is_error.text == "Debugger Error":
            click = True
            while click:
                try:
                    self.page.click_modal('OK')
                    wait.until(EC.invisibility_of_element(
                        (By.XPATH, "//div[contains(@class, 'alertify') and "
                                   "not(contains(@class, 'ajs-hidden'))]//div["
                                   "contains(@class,'ajs-header')]")
                    ))
                    click = False
                except TimeoutException:
                    pass
            self.skipTest(
                "Please make sure that debugger plugin is properly configured"
            )
        else:
            self.page.driver.switch_to.frame(
                self.page.driver.find_element_by_tag_name('iframe')
            )

            wait.until(EC.presence_of_element_located(
                (By.XPATH, "//span[contains(.,'Hello, pgAdmin4')]"))
            )
            self.page.click_element(
                self.page.driver.find_elements_by_xpath("//button")[2]
            )

            wait.until(EC.presence_of_element_located(
                (By.XPATH, "//td[contains(@class,'test_function') and "
                           "contains(.,'Hello, pgAdmin4')]"))
            )

            # Only this tab is vulnerable rest are BackGrid & Code Mirror
            # control which are already tested in Query tool test case
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
        self.page.driver.switch_to_default_content()
        self.page.click_element(
            self.page.find_by_xpath(
                "//*[@id='dockerContainer']/div/div[3]/div/div[2]/div[1]")
        )

    def _check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        assert source_code.find(string_to_find) != - \
            1, "{0} might be vulnerable to XSS ".format(source)
