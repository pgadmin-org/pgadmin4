##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import random

from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.feature_utils.locators import NavMenuLocators
from regression.feature_utils.tree_area_locators import TreeAreaLocators
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


class CheckRoleMembershipControlFeatureTest(BaseFeatureTest):
    """Tests to check role membership control for xss."""

    scenarios = [
        ("Tests to check if Role membership control is vulnerable to XSS",
         dict())
    ]

    role = ""

    def before(self):
        with test_utils.Database(self.server) as (connection, _):
            if connection.server_version < 90100:
                self.skipTest(
                    "Membership is not present in Postgres below PG v9.1")

        # create role
        self.role = "test_role" + str(random.randint(10000, 65535))

        # Some test function is needed for debugger
        test_utils.create_role(self.server, "postgres",
                               self.role)
        test_utils.create_role(self.server, "postgres",
                               "<h1>test</h1>")
        self.wait = WebDriverWait(self.page.driver, 20)

    def runTest(self):
        self.page.wait_for_spinner_to_disappear()
        self.page.add_server(self.server)
        self._role_node_expandable(self.role)
        self._check_role_membership_control()

    def after(self):
        self.page.remove_server(self.server)
        test_utils.drop_role(self.server, "postgres",
                             self.role)
        test_utils.drop_role(self.server, "postgres",
                             "<h1>test</h1>")

    def _role_node_expandable(self, role):
        self.page.expand_server_node(
            self.server['name'], self.server['db_password'])
        self.page.toggle_open_tree_item('Login/Group Roles')
        self.page.click_a_tree_node(
            role, TreeAreaLocators.sub_nodes_of_login_group_node)

    def _check_role_membership_control(self):
        self.page.driver.find_element_by_link_text(
            NavMenuLocators.object_menu_link_text).click()
        property_object = self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, NavMenuLocators.properties_obj_css)))
        property_object.click()
        WebDriverWait(self.page.driver, 4).until(
            EC.presence_of_element_located((
                By.XPATH, "//a[normalize-space(text())='Membership']")))
        self.click_membership_tab()
        # Fetch the source code for our custom control
        source_code = self.page.find_by_xpath(
            "//div[contains(@class,'rolmembership')]"
        ).get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            '&lt;h1&gt;test&lt;/h1&gt;',
            'Role Membership Control'
        )
        self.page.find_by_xpath(
            "//button[contains(@type, 'cancel') and "
            "contains(.,'Cancel')]"
        ).click()

    def _check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        assert source_code.find(string_to_find) != - \
            1, "{0} might be vulnerable to XSS ".format(source)

    def click_membership_tab(self):
        """This will click and open membership tab of role"""

        self.page.retry_click(
            (By.LINK_TEXT,
             "Membership"),
            (By.XPATH, "//input[@placeholder='Select members']"))
