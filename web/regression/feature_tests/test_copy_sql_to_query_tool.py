##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import secrets
import time
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.python_test_utils import test_utils
from regression.feature_utils.tree_area_locators import TreeAreaLocators
from regression.feature_utils.locators import NavMenuLocators, \
    QueryToolLocators, PreferencesLocaltors
from selenium.webdriver import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC


class CopySQLFeatureTest(BaseFeatureTest):
    """ This class test acceptance test scenarios """

    scenarios = [
        ("Test copy sql to query tool", dict())
    ]

    test_table_name = ""

    def before(self):
        self._update_preferences_setting()
        self.page.add_server(self.server)

    def runTest(self):
        self._create_table()
        sql_query = self._get_sql_query()
        query_tool_result = self._get_query_tool_result()

        self.assertEqual(query_tool_result, sql_query)

    def after(self):
        self.page.close_query_tool(True)
        self.page.remove_server(self.server)
        test_utils.delete_table(
            self.server, self.test_db, self.test_table_name)

    def _get_sql_query(self):
        self.page.click_tab("SQL")
        # Wait till data is displayed in SQL Tab
        self.assertTrue(self.page.check_if_element_exist_by_xpath(
            "//*[contains(@class,'cm-line') and "
            "contains(.,'CREATE TABLE IF NOT EXISTS public.%s')]"
            % self.test_table_name, 10), "No data displayed in SQL tab")

        # Fetch the inner html & check for escaped characters
        sql_query = self.driver.find_element(
            By.CSS_SELECTOR, QueryToolLocators.code_mirror_content
            .format('#id-sql')).text

        return sql_query

    def _get_query_tool_result(self):
        self.page.open_query_tool()
        self.page.wait_for_spinner_to_disappear()

        time.sleep(5)

        self.driver.switch_to.default_content()
        self.driver.switch_to.frame(
            self.driver.find_element(By.TAG_NAME, "iframe"))

        query_tool_result = self.driver.find_element(
            By.CSS_SELECTOR, QueryToolLocators.code_mirror_content
            .format('#id-query')).text

        return query_tool_result

    def _create_table(self):
        self.test_table_name = "test_table" + str(
            secrets.choice(range(1000, 3000)))
        test_utils.create_table(self.server, self.test_db,
                                self.test_table_name)
        self.assertTrue(self.page.expand_tables_node(
            "Server", self.server['name'], self.server['db_password'],
            self.test_db, 'public'),
            'Tree not expanded to the table node.')

        table_node = self.page.check_if_element_exists_with_scroll(
            TreeAreaLocators.table_node(self.test_table_name))
        table_node.click()

    def _update_preferences_setting(self):
        file_menu = self.page.find_by_css_selector(
            NavMenuLocators.file_menu_css)
        file_menu.click()

        pref_menu_item = self.page.find_by_css_selector(
            NavMenuLocators.preference_menu_item_css)
        pref_menu_item.click()

        wait = WebDriverWait(self.page.driver, 10)

        self.page.click_tab("Preferences")

        # Wait till the preference dialogue box is displayed by checking the
        # visibility of Show System Object label
        wait.until(EC.presence_of_element_located(
            (By.XPATH,
             PreferencesLocaltors.show_system_objects_pref_label_xpath))
        )

        option_node = self.page.find_by_xpath(
            "//*[@id='treeContainer']//div//div[text()="
            "'Results grid']//preceding::div[text()='Options'][1]")
        # self.page.check_if_element_exists_with_scroll(option_node)
        self.page.driver.execute_script("arguments[0].scrollIntoView(false)",
                                        option_node)
        option_node.click()

        switch_box_element = \
            self.page.find_by_xpath(NavMenuLocators.
                                    copy_sql_to_query_tool_switch_btn)

        switch_box_element.click()

        # save and close the preference dialog.
        self.page.find_by_css_selector(PreferencesLocaltors.save_btn) \
            .click()
        time.sleep(3)
        self.page.close_active_tab()
