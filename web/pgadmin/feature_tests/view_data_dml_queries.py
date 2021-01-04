##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import os
import time

from selenium.webdriver import ActionChains
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from regression.feature_utils.locators import QueryToolLocators, \
    NavMenuLocators
from regression.feature_utils.tree_area_locators import TreeAreaLocators

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))

config_data = config_data_json = {}
# try:
with open(CURRENT_PATH + '/test_data.json') as data_file:
    config_data_json = json.load(data_file)


class CheckForViewDataTest(BaseFeatureTest):
    """
    Test cases to validate insert, update operations in table
    with input test data

    First of all, the test data is inserted/updated into table and then
    inserted data is compared with original data to check if expected data
    is returned from table or not.

    We will cover test cases for,
        1) Insert with default values
        2) Update with null values
        3) Update with blank string
        4) Copy/Paste row
    """

    scenarios = [
        ("Validate Insert, Update operations in View/Edit data with "
         "given test data",
         dict())
    ]

    TIMEOUT_STRING = "Timed out waiting for div element to appear"

    # query for creating 'defaults_text' table
    defaults_query = """
CREATE TABLE public.defaults_{0}
(
    {1} serial NOT NULL,
    number_defaults numeric(100) DEFAULT 1,
    number_null numeric(100),
    text_defaults text COLLATE pg_catalog."default"
        DEFAULT 'Hello World'::text,
    text_null1 text COLLATE pg_catalog."default",
    text_null2 text COLLATE pg_catalog."default",
    text_null3 text COLLATE pg_catalog."default",
    text_null4 text COLLATE pg_catalog."default",
    json_defaults json DEFAULT '[51, 52]'::json,
    json_null json,
    boolean_true boolean DEFAULT true,
    boolean_null boolean,
    boolean_false boolean,
    text_arr text[],
    text_arr_empty text[],
    text_arr_null text[],
    int_arr integer[],
    int_arr_empty integer[],
    boolean_arr boolean[],
    boolean_arr_null boolean[],
    CONSTRAINT defaults_pkey_{0} PRIMARY KEY ({1})
)
"""
    non_int_pkey_table = """
CREATE TABLE public.nonintpkey
(
    charid text COLLATE pg_catalog."default" NOT NULL,
    col1 text,
    col2 numeric(100),
    CONSTRAINT nonintpkey_pkey PRIMARY KEY (charid)
)
    """

    def before(self):
        with test_utils.Database(self.server) as (connection, _):
            if connection.server_version < 90100:
                self.skipTest(
                    "COLLATE is not present in PG versions below v9.1"
                )

        # Create pre-requisite table
        for k, v in {1: 'id', 2: '"ID"'}.items():
            test_utils.create_table_with_query(
                self.server,
                self.test_db,
                CheckForViewDataTest.defaults_query.format(k, v))

        test_utils.create_table_with_query(
            self.server,
            self.test_db,
            CheckForViewDataTest.non_int_pkey_table
        )

        # Initialize an instance of WebDriverWait with timeout of 3 seconds
        self.wait = WebDriverWait(self.driver, 3)

        # close the db connection
        connection.close()

    def runTest(self):
        self.page.wait_for_spinner_to_disappear()
        self.page.add_server(self.server)

        self.page.expand_database_node(
            self.server['name'],
            self.server['db_password'], self.test_db)
        self.page.toggle_open_tables_node(self.server['name'],
                                          self.server['db_password'],
                                          self.test_db, 'public')

        self._load_config_data('table_insert_update_cases')
        data_local = config_data
        # iterate on both tables
        for cnt in (1, 2):
            self._perform_test_for_table('defaults_{0}'.format(str(cnt)),
                                         data_local)
        # test nonint pkey table
        self._load_config_data('table_insert_update_nonint')
        data_local = config_data
        self._perform_test_for_table('nonintpkey', data_local)

    def after(self):
        self.page.remove_server(self.server)
        for cnt in (1, 2):
            test_utils.delete_table(
                self.server, self.test_db, 'defaults_{0}'.format(str(cnt)))
        test_utils.delete_table(self.server, self.test_db, 'nonintpkey')

    @staticmethod
    def _get_cell_xpath(cell, row):

        if row == 1:
            xpath_grid_row = "//*[contains(@class, 'ui-widget-content') " \
                             "and contains(@style, 'top:0px')]"
        else:
            xpath_grid_row = "//*[contains(@class, 'ui-widget-content') " \
                             "and contains(@style, 'top:25px')]"

        xpath_row_cell = '//div[contains(@class, "' + cell + '")]'

        xpath_cell = '{0}{1}'.format(xpath_grid_row, xpath_row_cell)

        return xpath_cell

    @staticmethod
    def _load_config_data(config_key):
        global config_data
        config_data = config_data_json[config_key]

    def _perform_test_for_table(self, table_name, config_data_local):
        self.page.click_a_tree_node(
            table_name,
            TreeAreaLocators.sub_nodes_of_tables_node)
        # Open Object -> View/Edit data
        self._view_data_grid(table_name)

        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        # Run test to insert a new row in table with default values
        self._add_row(config_data_local)
        self._verify_row_data(row_height=0,
                              config_check_data=config_data_local['add'])

        # Run test to copy/paste a row
        self._copy_paste_row(config_data_local)

        self._update_row(config_data_local)
        self.page.click_tab("Messages")
        self._verify_messsages("")
        self.page.click_tab("Data Output")
        updated_row_data = {
            i: config_data_local['update'][i] if i in config_data_local[
                'update'] else val
            for i, val in config_data_local['add'].items()
        }
        self._verify_row_data(row_height=0,
                              config_check_data=updated_row_data)

        self.page.close_data_grid()

    def _compare_cell_value(self, xpath, value):
        # Initialize an instance of WebDriverWait with timeout of 5 seconds
        wait = WebDriverWait(self.driver, 5)
        try:
            wait.until(EC.text_to_be_present_in_element(
                (By.XPATH, xpath + "//span"), str(value)),
                CheckForViewDataTest.TIMEOUT_STRING
            )
        except Exception:
            wait.until(EC.text_to_be_present_in_element(
                (By.XPATH, xpath), str(value)),
                CheckForViewDataTest.TIMEOUT_STRING
            )

    def _update_cell(self, xpath, data):
        """
        This function updates the given cell(xpath) with
        given value
        Args:
            xpath: xpath of cell element
            data: list with cell related data

        Returns: None

        """
        self.wait.until(EC.visibility_of_element_located(
            (By.XPATH, xpath)), CheckForViewDataTest.TIMEOUT_STRING
        )
        cell_el = self.page.find_by_xpath(xpath)
        self.page.driver.execute_script("arguments[0].scrollIntoView(false)",
                                        cell_el)
        ActionChains(self.driver).move_to_element(cell_el).double_click(
            cell_el
        ).perform()
        cell_type = data[2]
        value = data[0]

        if cell_type in ['int', 'int[]']:
            if value == 'clear':
                cell_el.find_element_by_css_selector('input').clear()
            else:
                ActionChains(self.driver).send_keys(value). \
                    send_keys(Keys.ENTER).perform()
        elif cell_type in ['text', 'json', 'text[]', 'boolean[]']:
            text_area_ele = self.page.find_by_css_selector(
                QueryToolLocators.row_editor_text_area_css)
            text_area_ele.clear()
            text_area_ele.click()
            text_area_ele.send_keys(value)

            # Click on editor's Save button
            self.page.find_by_css_selector(
                QueryToolLocators.text_editor_ok_btn_css).click()
        else:
            # Boolean editor test for to True click
            if data[1] == 'true':
                checkbox_el = cell_el.find_element_by_xpath(
                    ".//*[contains(@class, 'multi-checkbox')]")
                checkbox_el.click()
            # Boolean editor test for to False click
            elif data[1] == 'false':
                checkbox_el = cell_el.find_element_by_xpath(
                    ".//*[contains(@class, 'multi-checkbox')]")
                # Sets true
                checkbox_el.click()
                # Sets false
                ActionChains(self.driver).click(checkbox_el).perform()

    def _view_data_grid(self, table_name):
        self.page.driver.find_element_by_link_text("Object").click()
        ActionChains(
            self.page.driver
        ).move_to_element(
            self.page.driver.find_element_by_link_text(
                NavMenuLocators.view_data_link_text)
        ).perform()
        self.page.find_by_partial_link_text("All Rows").click()

        # wait until datagrid frame is loaded.
        self.page.wait_for_query_tool_loading_indicator_to_appear()
        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        self.page.click_tab(table_name)

        self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, 'iframe')
            ), CheckForViewDataTest.TIMEOUT_STRING
        )
        self.page.driver.switch_to.frame(
            self.page.driver.find_element_by_tag_name('iframe')
        )

    def _copy_paste_row(self, config_data_l):
        row0_cell0_xpath = CheckForViewDataTest._get_cell_xpath("r0", 1)

        self.page.find_by_xpath(row0_cell0_xpath).click()
        self.page.find_by_css_selector(
            QueryToolLocators.copy_button_css).click()
        self.page.find_by_css_selector(
            QueryToolLocators.paste_button_css).click()

        # Update primary key of copied cell
        self._add_update_save_row(config_data_l['copy'], row=2)

        # Verify row 1 and row 2 data
        updated_row_data = {
            i: config_data_l['copy'][i] if i in config_data_l['copy'] else val
            for i, val in config_data_l['add'].items()
        }
        self._verify_row_data(row_height=25,
                              config_check_data=updated_row_data)

    def _add_update_save_row(self, data, row=1):
        items = list(data.keys())
        for item in range(0, len(items)):
            items[item] = int(items[item])
        items.sort(reverse=False)
        for idx in items:
            cell_xpath = CheckForViewDataTest._get_cell_xpath(
                'r' + str(idx), row
            )
            time.sleep(0.2)
            self._update_cell(cell_xpath, data[str(idx)])
        self.page.find_by_css_selector(
            QueryToolLocators.btn_save_data).click()
        # There should be some delay after save button is clicked, as it
        # takes some time to complete save ajax call otherwise discard unsaved
        # changes dialog will appear if we try to execute query before previous
        # save ajax is completed.
        time.sleep(2)

    def _add_row(self, config_data_l):
        self._add_update_save_row(config_data_l['add'], 1)

    def _update_row(self, config_data_l):
        self._add_update_save_row(config_data_l['update'], 1)

    def _verify_messsages(self, text):
        messages_ele = self.page.find_by_css_selector(
            QueryToolLocators.query_messages_panel)
        self.assertEqual(text, messages_ele.text)

    def _verify_row_data(self, row_height, config_check_data):
        self.page.click_execute_query_button()

        xpath = "//*[contains(@class, 'ui-widget-content') and " \
                "contains(@style, 'top:" + str(row_height) + "px')]"
        scroll_on_arg_for_js = "arguments[0].scrollIntoView(false)"

        self.page.wait_for_query_tool_loading_indicator_to_disappear()

        # Verify the List of actual values with the expected list
        actual_list = list(config_check_data.keys())
        for value in range(0, len(actual_list)):
            actual_list[value] = int(actual_list[value])
        actual_list.sort(reverse=False)
        retry = 5
        for idx in actual_list:
            while retry > 0:
                try:
                    result_row = self.page.find_by_xpath(xpath)
                    element = \
                        result_row.find_element_by_class_name("r" + str(idx))
                    self.page.driver.execute_script(
                        scroll_on_arg_for_js, element)
                    break
                except Exception:
                    print("stale reference exception at id:", idx)
                    retry -= 1
            time.sleep(0.4)
            self.assertEqual(element.text, config_check_data[str(idx)][1])

        # scroll browser back to the left
        # to reset position so other assertions can succeed
        list_item = list(config_check_data.keys())
        for item in range(0, len(list_item)):
            list_item[item] = int(list_item[item])
        list_item.sort(reverse=True)
        for idx in list_item:
            time.sleep(0.4)
            element = result_row.find_element_by_class_name("r" + str(idx))
            self.page.driver.execute_script(
                scroll_on_arg_for_js, element)
