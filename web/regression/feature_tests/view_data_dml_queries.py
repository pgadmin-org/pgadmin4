##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import os
import sys
import time
import traceback

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

    TIMEOUT_STRING = "5"

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

    def runTest(self):
        try:
            self.page.wait_for_spinner_to_disappear()
            self.page.add_server(self.server)
            self.page.expand_tables_node("Server", self.server['name'],
                                         self.server['db_password'],
                                         self.test_db,
                                         'public')

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
        except Exception:
            traceback.print_exc()
            self.assertTrue(False, 'Exception occurred in run test '
                                   'Validate Insert, Update operations in '
                                   'View/Edit data with given test data')

    def after(self):
        self.page.remove_server(self.server)
        for cnt in (1, 2):
            test_utils.delete_table(
                self.server, self.test_db, 'defaults_{0}'.format(str(cnt)))
        test_utils.delete_table(self.server, self.test_db, 'nonintpkey')

    @staticmethod
    def _get_cell_xpath(cell, row):
        return QueryToolLocators.output_cell_xpath.format(row, cell)

    @staticmethod
    def _load_config_data(config_key):
        global config_data
        config_data = config_data_json[config_key]

    def _perform_test_for_table(self, table_name, config_data_local):
        table_node = self.page.check_if_element_exists_with_scroll(
            TreeAreaLocators.table_node(table_name))
        table_node.click()

        # Open Object -> View/Edit data
        self._view_data_grid(table_name)

        time.sleep(3)
        self.page.wait_for_query_tool_loading_indicator_to_disappear()
        # Run test to insert a new row in table with default values
        self._add_row(config_data_local)
        self._verify_row_data(row=1,
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
        self._verify_row_data(row=1,
                              config_check_data=updated_row_data)

        self.page.close_query_tool(prompt=False)

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
        cell_type = data[2]
        value = data[0]
        retry = 4
        while retry > 0:
            self.wait.until(EC.visibility_of_element_located(
                (By.XPATH, xpath)), CheckForViewDataTest.TIMEOUT_STRING
            )
            cell_el = self.page.find_by_xpath(xpath)
            self.page.driver.execute_script(
                "arguments[0].scrollIntoView(false)", cell_el)
            time.sleep(0.2)
            ActionChains(self.driver).move_to_element(cell_el).perform()
            ActionChains(self.driver).double_click(cell_el).perform()

            if cell_type in ['int', 'int[]'] and \
                    self._update_numeric_cell(xpath, value):
                break
            elif cell_type in ['text', 'text[]', 'boolean[]'] and \
                    self._update_text_cell(value):
                break
            elif cell_type in ['json', 'jsonb'] and \
                    self._update_json_cell(value):
                retry = 0
            elif cell_type in ['bool'] and \
                    self._update_boolean_cell(value):
                retry = 0
            else:
                print('Unable to update cell in try ' + str(retry),
                      file=sys.stderr)
                retry -= 1

    def _update_numeric_cell(self, cell_el_xpath, value):
        try:
            cell_el = self.page.find_by_xpath(cell_el_xpath)
            if cell_el.get_attribute('aria-selected') and \
                    cell_el.text == '':
                if value == 'clear':
                    cell_el.find_element(By.CSS_SELECTOR, 'input').clear()
                else:
                    ActionChains(self.driver).send_keys(value).perform()
                    ActionChains(self.driver).send_keys(Keys.TAB).perform()
                return True
            else:
                print('Cell is NOT selected yet.', file=sys.stderr)
                return False
        except Exception:
            print('Exception occurred while updating int cell',
                  file=sys.stderr)
            return False

    def _update_text_cell(self, value):
        try:
            text_area_ele = WebDriverWait(self.driver, 3).until(
                EC.visibility_of_element_located(
                    (By.CSS_SELECTOR,
                     QueryToolLocators.row_editor_text_area_css)))
            text_area_ele.clear()
            time.sleep(0.3)
            text_area_ele.click()
            ActionChains(self.driver).send_keys(value).perform()
            # Click on editor's Save button
            self.page.find_by_css_selector(
                QueryToolLocators.text_editor_ok_btn_css).click()
            return True
        except Exception:
            print('Exception occurred while updating text cell ',
                  file=sys.stderr)
            return False

    def _update_json_cell(self, value):
        platform = 'mac'
        if "platform" in self.driver.capabilities:
            platform = (self.driver.capabilities["platform"]).lower()
        elif "platformName" in self.driver.capabilities:
            platform = (self.driver.capabilities["platformName"]).lower()
        if 'mac' in platform:
            key_to_press = Keys.COMMAND
        else:
            key_to_press = Keys.CONTROL
        try:
            WebDriverWait(self.driver, 3).until(
                EC.visibility_of_element_located(
                    (By.CSS_SELECTOR,
                     QueryToolLocators.json_editor_text_area_css)))
            actions = ActionChains(self.driver)
            actions.key_down(key_to_press).send_keys('a').\
                key_up(key_to_press).send_keys(Keys.DELETE).perform()
            actions.send_keys(value).perform()
            # Click on editor's Save button
            self.page.find_by_css_selector(
                QueryToolLocators.text_editor_ok_btn_css).click()
            return True
        except Exception:
            print('Exception occurred while updating json cell ',
                  file=sys.stderr)
            return False

    def _update_boolean_cell(self, value):
        # Boolean editor test for to True click
        try:
            checkbox_el = self.page.find_by_css_selector(
                QueryToolLocators.row_editor_checkbox_css)
            if value == 'true':
                checkbox_el.click()
            # Boolean editor test for to False click
            elif value == 'false':
                # Sets true
                checkbox_el.click()
                # Sets false
                ActionChains(self.driver).click(checkbox_el).perform()
            return True
        except Exception:
            print('Exception occurred while updating boolean cell',
                  file=sys.stderr)
            return False

    def _view_data_grid(self, table_name):
        self.page.driver.find_element(By.CSS_SELECTOR,
                                      NavMenuLocators.object_menu_css).click()
        ActionChains(
            self.page.driver
        ).move_to_element(
            self.page.driver.find_element(
                By.CSS_SELECTOR, NavMenuLocators.view_data_link_css)
        ).perform()

        self.page.find_by_css_selector("li[data-label='All Rows']").click()

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
            self.page.driver.find_element(By.TAG_NAME, 'iframe')
        )

    def _copy_paste_row(self, config_data_l):
        row0_cell0_xpath = CheckForViewDataTest._get_cell_xpath(1, 1)

        self.page.find_by_xpath(row0_cell0_xpath).click()
        self.page.find_by_css_selector(
            QueryToolLocators.copy_button_css).click()
        self.page.find_by_css_selector(
            QueryToolLocators.paste_button_css).click()

        # Update primary key of copied cell
        # Copy pasted rows go to first row
        self._add_update_save_row(config_data_l['copy'], row=1)

        # Verify row 1 and row 2 data
        updated_row_data = {
            i: config_data_l['copy'][i] if i in config_data_l['copy'] else val
            for i, val in config_data_l['add'].items()
        }
        self._verify_row_data(row=2,
                              config_check_data=updated_row_data)

    def _add_update_save_row(self, data, row=1):
        items = list(data.keys())
        for item in range(0, len(items)):
            items[item] = int(items[item])
        items.sort(reverse=False)
        for idx in items:
            # rowindex starts with 2 and 1st colindex is rownum
            time.sleep(0.2)
            cell_xpath = CheckForViewDataTest\
                ._get_cell_xpath(str(idx + 1), row + 1)
            self._update_cell(cell_xpath, data[str(idx)])
        self.page.find_by_css_selector(
            QueryToolLocators.btn_save_data).click()
        # There should be some delay after save button is clicked, as it
        # takes some time to complete save ajax call otherwise discard unsaved
        # changes dialog will appear if we try to execute query before previous
        # save ajax is completed.
        time.sleep(2)

    def _add_row(self, config_data_l):
        self.page.find_by_css_selector(
            QueryToolLocators.btn_add_row).click()
        time.sleep(1)
        self._add_update_save_row(config_data_l['add'], 1)

    def _update_row(self, config_data_l):
        self._add_update_save_row(config_data_l['update'], 1)

    def _verify_messsages(self, text):
        messages_ele = self.page.find_by_css_selector(
            QueryToolLocators.query_messages_panel)
        self.assertEqual(text, messages_ele.text)

    def _verify_row_data(self, row, config_check_data):
        self.page.click_execute_query_button()
        self.driver.execute_script(
            "document.querySelector('.rdg').scrollLeft=0"
        )

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
                    element = self.page.find_by_xpath(
                        QueryToolLocators.output_cell_xpath
                        .format(row + 1, idx + 1)
                    )
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
            element = self.page.find_by_xpath(
                QueryToolLocators.output_cell_xpath.format(2, idx + 1))
            self.page.driver.execute_script(
                scroll_on_arg_for_js, element)
