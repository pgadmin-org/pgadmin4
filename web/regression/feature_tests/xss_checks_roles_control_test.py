##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import secrets

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
    xss_test_role = "<h1>test</h1>"

    def before(self):
        # create role
        self.role = "test_role" + str(secrets.choice(range(10000, 65535)))

        # Some test function is needed for debugger
        test_utils.create_role(self.server, "postgres",
                               self.role)
        test_utils.create_role(self.server, "postgres", self.xss_test_role)
        test_utils.grant_role(self.server, "postgres",
                              self.role, self.xss_test_role)
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
        test_utils.drop_role(self.server, "postgres", self.xss_test_role)

    def _role_node_expandable(self, role):
        retry = 2
        while retry > 0:
            if self.page.expand_server_child_node(
                    "Server", self.server['name'], self.server['db_password'],
                    'Login/Group Roles'):
                retry = 0
            else:
                retry -= 1

        role_node = self.page.check_if_element_exists_with_scroll(
            TreeAreaLocators.role_node(role))
        role_node.click()

    def _check_role_membership_control(self):
        self.page.driver.find_element(
            By.CSS_SELECTOR, NavMenuLocators.object_menu_css).click()
        edit_object = self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, NavMenuLocators.edit_obj_css)))
        edit_object.click()
        membership_tab = WebDriverWait(self.page.driver, 4).until(
            EC.presence_of_element_located((
                By.XPATH, "//span[normalize-space(text())='Membership']")))
        membership_tab.click()

        # Fetch the source code for our custom control
        source_code = self.page.find_by_xpath(
            "//div[contains(@role, 'cell')]//span[contains(@class,'icon-')]"
            "/following-sibling::span"
        ).get_attribute('innerHTML')

        self._check_escaped_characters(
            source_code,
            '&lt;h1&gt;test&lt;/h1&gt;',
            'Role Membership Control'
        )
        self.page.find_by_xpath("//button/span[text()='Close']").click()

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
