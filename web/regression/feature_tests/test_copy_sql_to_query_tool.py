##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import secrets
import time
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.python_test_utils import test_utils
from regression.feature_utils.tree_area_locators import TreeAreaLocators
from regression.feature_utils.locators import NavMenuLocators, \
    QueryToolLocators
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

        self.page.add_server(self.server)

    def runTest(self):
        self._update_preferences_setting()
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
            "//*[contains(@class,'CodeMirror-lines') and "
            "contains(.,'CREATE TABLE IF NOT EXISTS public.%s')]"
            % self.test_table_name, 10), "No data displayed in SQL tab")

        # Fetch the inner html & check for escaped characters
        source_code = self.driver.find_elements(
            By.XPATH, QueryToolLocators.code_mirror_data_xpath)

        sql_query = ''
        for data in source_code:
            sql_query += data.text
            sql_query += '\n'

        return sql_query

    def _get_query_tool_result(self):
        self.page.open_query_tool()
        self.page.wait_for_spinner_to_disappear()

        time.sleep(5)

        self.driver.switch_to.default_content()
        self.driver.switch_to.frame(
            self.driver.find_element(By.TAG_NAME, "iframe"))

        code_mirror = self.driver.find_elements(
            By.XPATH, QueryToolLocators.code_mirror_data_xpath)
        query_tool_result = ''
        for data in code_mirror:
            query_tool_result += data.text
            query_tool_result += '\n'

        return query_tool_result

    def _create_table(self):
        self.test_table_name = "test_table" + str(
            secrets.choice(range(1000, 3000)))
        test_utils.create_table(self.server, self.test_db,
                                self.test_table_name)
        self.page.expand_tables_node("Server", self.server['name'],
                                     self.server['db_password'], self.test_db,
                                     'public')
        table_node = self.page.check_if_element_exists_with_scroll(
            TreeAreaLocators.table_node(self.test_table_name))
        table_node.click()

    def _update_preferences_setting(self):
        file_menu = self.page.find_by_css_selector(
            NavMenuLocators.file_menu_css)
        file_menu.click()

        self.page.retry_click(
            (By.CSS_SELECTOR, NavMenuLocators.preference_menu_item_css),
            (By.XPATH, NavMenuLocators.specified_preference_tree_node
             .format('Browser'))
        )

        wait = WebDriverWait(self.page.driver, 10)

        self.page.retry_click(
            (By.XPATH,
             NavMenuLocators.specified_sub_node_of_pref_tree_node.
             format('Browser', 'Display')),
            (By.XPATH,
             NavMenuLocators.show_system_objects_pref_label_xpath))

        # Wait till the preference dialogue box is displayed by checking the
        # visibility of Show System Object label
        wait.until(EC.presence_of_element_located(
            (By.XPATH, NavMenuLocators.show_system_objects_pref_label_xpath))
        )
        maximize_button = self.page.find_by_xpath(
            NavMenuLocators.maximize_pref_dialogue_css)
        maximize_button.click()

        specified_preference_tree_node_name = 'Query Tool'
        sql_editor = self.page.find_by_xpath(
            NavMenuLocators.specified_preference_tree_node.format(
                specified_preference_tree_node_name))
        sql_editor.click()
        if self.page.find_by_xpath(
            NavMenuLocators.specified_pref_node_exp_status.
                format(specified_preference_tree_node_name)).get_attribute(
                    'aria-expanded') == 'false':
            ActionChains(self.driver).double_click(sql_editor).perform()

        option_node = self.page.find_by_xpath(
            "//*[@id='treeContainer']//div//span[text()="
            "'Results grid']//preceding::span[text()='Options'][1]")
        # self.page.check_if_element_exists_with_scroll(option_node)
        self.page.driver.execute_script("arguments[0].scrollIntoView(false)",
                                        option_node)
        option_node.click()

        switch_box_element = \
            self.page.find_by_xpath(NavMenuLocators.
                                    copy_sql_to_query_tool_switch_btn)

        switch_box_element.click()

        maximize_button = self.page.find_by_xpath(
            NavMenuLocators.maximize_pref_dialogue_css)
        maximize_button.click()

        # save and close the preference dialog.
        self.page.click_modal('Save')
