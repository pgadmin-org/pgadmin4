##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import os
from selenium.webdriver import ActionChains
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))

try:
    with open(CURRENT_PATH + '/test_data.json') as data_file:
        config_data = json.load(data_file)['table_insert_update_cases']['add_update']
except Exception as e:
    print(str(e))


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
        ("Validate Insert, Update operations in View data with given test "
         "data",
         dict())
    ]

    TIMEOUT_STRING = "Timed out waiting for div element to appear"

    # query for creating 'defaults_text' table
    defaults_query = """
CREATE TABLE public.defaults
(
    id serial NOT NULL,
    number_defaults numeric(100) DEFAULT 1,
    number_null numeric(100),
    text_defaults text COLLATE pg_catalog."default" DEFAULT 'Hello World'::text,
    text_null1 text COLLATE pg_catalog."default",
    text_null2 text COLLATE pg_catalog."default",
    text_null3 text COLLATE pg_catalog."default",
    text_null4 text COLLATE pg_catalog."default",
    json_defaults json DEFAULT '[51, 52]'::json,
    json_null json,
    boolean_defaults boolean DEFAULT true,
    boolean_null boolean,
    CONSTRAINT defaults_pkey PRIMARY KEY (id)
)
"""

    def before(self):
        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")
        test_utils.create_database(self.server, "acceptance_test_db")

        # Create pre-requisite table
        test_utils.create_table_with_query(
            self.server,
            "acceptance_test_db",
            CheckForViewDataTest.defaults_query)
        # Initialize an instance of WebDriverWait with timeout of 3 seconds
        self.wait = WebDriverWait(self.driver, 3)

    def runTest(self):
        self.page.wait_for_spinner_to_disappear()
        self.page.add_server(self.server)
        self._tables_node_expandable()
        self.driver.switch_to.default_content()
        self.page.select_tree_item('defaults')
        # Open Object -> View data
        self._view_data_grid()

        # Run test to insert a new row in table with default values
        self._add_row()
        self._verify_row_data(True)

        # Run test to copy/paste a row
        self._copy_paste_row()
        self.page.close_data_grid()

    def after(self):
        self.page.remove_server(self.server)
        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")

    @staticmethod
    def _get_cell_xpath(cell, row):

        if row == 1:
            xpath_grid_row = "//*[contains(@class, 'ui-widget-content') " \
                             "and contains(@style, 'top:0px')]"
        else:
            xpath_grid_row = "//*[contains(@class, 'ui-widget-content') " \
                             "and contains(@style, 'top:25px')]"

        xpath_row_cell = '//div[contains(@class, "'+cell+'")]'

        xpath_cell = '{0}{1}'.format(xpath_grid_row, xpath_row_cell)

        return xpath_cell

    def _compare_cell_value(self, xpath, value):
        # Initialize an instance of WebDriverWait with timeout of 5 seconds
        wait = WebDriverWait(self.driver, 5)
        try:
            wait.until(EC.text_to_be_present_in_element(
                (By.XPATH, xpath+"//span"), str(value)),
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
        ActionChains(self.driver).move_to_element(cell_el).double_click(
            cell_el
        ).perform()

        cell_type = data[2]
        value = data[0]

        if cell_type == 'int':
            if value == 'clear':
                cell_el.find_element_by_css_selector('input').clear()
            else:
                ActionChains(self.driver).send_keys(value).perform()

        elif cell_type in ['text', 'json']:
            self.page.find_by_css_selector(
                "div[style*='z-index: 1000'] textarea"
            ).click()
            ActionChains(self.driver).send_keys(value).perform()
            save_btn_xpath = "div[style*='z-index: 1000'] " \
                             "div button:first-child"
            self.page.find_by_css_selector(
                save_btn_xpath
            ).click()  # Click on editor's Save button
        else:
            if data[1] == 'true':
                checkbox_el = cell_el.find_element_by_xpath(".//input")
                checkbox_el.click()
                ActionChains(self.driver).move_to_element(checkbox_el).double_click(
                    checkbox_el
                ).perform()

    def _tables_node_expandable(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('acceptance_test_db')
        self.page.toggle_open_tree_item('Schemas')
        self.page.toggle_open_tree_item('public')
        self.page.toggle_open_tree_item('Tables')

    def _view_data_grid(self):
        self.page.driver.find_element_by_link_text("Object").click()
        ActionChains(self.page.driver) \
            .move_to_element(
                self.page.driver.find_element_by_link_text("View Data")) \
            .perform()
        self.page.find_by_partial_link_text("View All Rows").click()
        self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, 'iframe')
            ), CheckForViewDataTest.TIMEOUT_STRING
        )
        self.page.driver.switch_to.frame(
            self.page.driver.find_element_by_tag_name('iframe')
        )

    def _copy_paste_row(self):
        row0_cell0_xpath = CheckForViewDataTest._get_cell_xpath("r0", 1)
        row1_cell1_xpath = CheckForViewDataTest._get_cell_xpath("r1", 2)
        row1_cell2_xpath = CheckForViewDataTest._get_cell_xpath("r2", 2)

        self.page.find_by_xpath(row0_cell0_xpath).click()
        self.page.find_by_xpath("//*[@id='btn-copy-row']").click()
        self.page.find_by_xpath("//*[@id='btn-paste-row']").click()

        # Update primary key of copied cell
        self._update_cell(row1_cell1_xpath, [2, "", "int"])
        self.page.find_by_xpath(
            CheckForViewDataTest._get_cell_xpath("r1", "3")
        ).click()

        # Check if removing a cell value with default value sets
        # markup to [default] if cell is cleared
        self._update_cell(row1_cell2_xpath, ["clear", "", "int"])
        # click outside
        self.page.find_by_xpath(
            CheckForViewDataTest._get_cell_xpath("r1", "3")
        ).click()

        # for debugging
        print(row1_cell2_xpath)
        self._compare_cell_value(row1_cell2_xpath, "[default]")
        # reset cell value to previous one
        self._update_cell(row1_cell2_xpath, ["1", "", "int"])

        self.page.find_by_id("btn-save").click()  # Save data

        # Verify row 1 and row 2 data
        self._verify_row_data(False)

    def _add_row(self):
        for idx in range(1, len(config_data.keys())):
            cell_xpath = CheckForViewDataTest._get_cell_xpath(
                'r'+str(idx), 1
            )
            self._update_cell(cell_xpath, config_data[str(idx)])

        self.page.find_by_id("btn-save").click()  # Save data

    def _verify_row_data(self, is_new_row):
        self.page.find_by_id("btn-flash").click()

        # First row if row height = 0, second row if its 25
        row_height = 0 if is_new_row else 25

        xpath = "//*[contains(@class, 'ui-widget-content') and " \
                "contains(@style, 'top:" + str(row_height) + "px')]"

        # wait for stale element reference exception
        self.page.wait_for_element_to_stale(xpath)
        result_row = self.page.find_by_xpath(xpath)

        # List of row values in an array
        cells = [el.text for el in result_row.find_elements_by_tag_name('div')]

        for idx in range(1, len(config_data.keys())):
            # # after copy & paste row, the first cell of row 1 and
            # # row 2(being primary keys) won't match
            # # see if cell values matched to actual value
            if idx != 1 and not is_new_row:
                self.assertEquals(cells[idx], config_data[str(idx)][1])
            elif is_new_row:
                self.assertEquals(cells[idx], config_data[str(idx)][1])