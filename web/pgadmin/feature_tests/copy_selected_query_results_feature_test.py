##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from __future__ import print_function
import pyperclip
import random

from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.feature_utils.locators import QueryToolLocators


class CopySelectedQueryResultsFeatureTest(BaseFeatureTest):
    """
    Tests various ways to copy data from the query results grid.
    """

    scenarios = [
        ("Copy rows, column using button and keyboard shortcut", dict())
    ]

    test_table_name = ""

    def before(self):

        # Create test table with random name to avoid same name conflicts in
        # parallel execution
        self.test_table_name = "test_table" + str(random.randint(1000, 3000))
        self.page.add_server(self.server)
        test_utils.create_table(
            self.server, self.test_db, self.test_table_name)

    def runTest(self):
        self.page.expand_database_node(
            self.server['name'],
            self.server['db_password'], self.test_db)
        self.page.open_query_tool()

        self.page.fill_codemirror_area_with(
            "SELECT * FROM %s ORDER BY some_column" % self.test_table_name)

        self.page.find_by_css_selector(
            QueryToolLocators.btn_execute_query_css).click()

        self._copies_rows()
        self._copies_columns()
        self._copies_row_using_keyboard_shortcut()
        self._copies_column_using_keyboard_shortcut()
        self._copies_rectangular_selection()
        self._shift_resizes_rectangular_selection()
        self._shift_resizes_column_selection()
        self._mouseup_outside_grid_still_makes_a_selection()
        self._copies_rows_with_header()

    def _copies_rows(self):
        pyperclip.copy("old clipboard contents")
        first_row = self.page.find_by_xpath(
            QueryToolLocators.output_row_xpath.format(1))
        first_row.click()

        copy_button = self.page.find_by_css_selector(
            QueryToolLocators.copy_button_css)
        copy_button.click()

        self.assertEqual('"Some-Name"\t6\t"some info"',
                         pyperclip.paste())

    def _copies_rows_with_header(self):
        self.page.find_by_css_selector('#btn-copy-row-dropdown').click()
        self.page.find_by_css_selector('a#btn-copy-with-header').click()

        pyperclip.copy("old clipboard contents")
        select_all = self.page.find_by_xpath(
            QueryToolLocators.select_all_column)
        select_all.click()

        copy_button = self.page.find_by_css_selector(
            QueryToolLocators.copy_button_css)
        copy_button.click()

        self.assertEqual("""\"some_column"\t"value"\t"details"
\"Some-Name"\t6\t"some info"
\"Some-Other-Name"\t22\t"some other info"
\"Yet-Another-Name"\t14\t"cool info\"""", pyperclip.paste())

    def _copies_columns(self):
        pyperclip.copy("old clipboard contents")
        column = self.page.find_by_css_selector(
            QueryToolLocators.output_column_header_css.format('some_column'))
        column.click()

        copy_button = self.page.find_by_css_selector(
            QueryToolLocators.copy_button_css)
        copy_button.click()

        self.assertEqual(
            """\"Some-Name"
"Some-Other-Name"
"Yet-Another-Name\"""",
            pyperclip.paste())

    def _copies_row_using_keyboard_shortcut(self):
        pyperclip.copy("old clipboard contents")
        first_row = self.page.find_by_xpath(
            QueryToolLocators.output_row_xpath.format(1))
        first_row.click()

        ActionChains(self.page.driver).key_down(
            Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        self.assertEqual('"Some-Name"\t6\t"some info"',
                         pyperclip.paste())

    def _copies_column_using_keyboard_shortcut(self):
        pyperclip.copy("old clipboard contents")
        column = self.page.find_by_css_selector(
            QueryToolLocators.output_column_header_css.format('some_column'))
        column.click()

        ActionChains(self.page.driver).key_down(
            Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        self.assertEqual(
            """\"Some-Name"
"Some-Other-Name"
"Yet-Another-Name\"""",
            pyperclip.paste())

    def _copies_rectangular_selection(self):
        pyperclip.copy("old clipboard contents")

        top_left_cell = \
            self.page.find_by_xpath(
                QueryToolLocators.output_column_data_xpath.
                format('Some-Other-Name'))
        bottom_right_cell = self.page.find_by_xpath(
            QueryToolLocators.output_column_data_xpath.format('14'))

        ActionChains(
            self.page.driver
        ).click_and_hold(top_left_cell).move_to_element(
            bottom_right_cell
        ).release(bottom_right_cell).perform()

        ActionChains(
            self.page.driver
        ).key_down(Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        self.assertEqual(
            '"Some-Other-Name"\t22\n"Yet-Another-Name"\t14', pyperclip.paste())

    def _shift_resizes_rectangular_selection(self):
        pyperclip.copy("old clipboard contents")

        top_left_cell = self.page.find_by_xpath(
            QueryToolLocators.output_column_data_xpath.
            format('Some-Other-Name')
        )
        initial_bottom_right_cell = self.page.find_by_xpath(
            QueryToolLocators.output_column_data_xpath.format('14'))
        ActionChains(
            self.page.driver
        ).click_and_hold(top_left_cell).move_to_element(
            initial_bottom_right_cell
        ).release(initial_bottom_right_cell).perform()

        ActionChains(self.page.driver).key_down(Keys.SHIFT).send_keys(
            Keys.ARROW_RIGHT
        ).key_up(Keys.SHIFT).perform()

        ActionChains(self.page.driver).key_down(
            Keys.CONTROL
        ).send_keys('c').key_up(Keys.CONTROL).perform()

        self.assertEqual("""\"Some-Other-Name"\t22\t"some other info"
"Yet-Another-Name"\t14\t"cool info\"""", pyperclip.paste())

    def _shift_resizes_column_selection(self):
        pyperclip.copy("old clipboard contents")

        column = self.page.find_by_css_selector(
            QueryToolLocators.output_column_header_css.format('value')
        )
        column.click()

        ActionChains(self.page.driver).key_down(
            Keys.SHIFT).send_keys(Keys.ARROW_LEFT).key_up(Keys.SHIFT).perform()

        ActionChains(self.page.driver).key_down(
            Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        self.assertEqual(
            '"Some-Name"\t6\n"Some-Other-Name"\t22\n"Yet-Another-Name"\t14',
            pyperclip.paste())

    def _mouseup_outside_grid_still_makes_a_selection(self):
        pyperclip.copy("old clipboard contents")

        bottom_right_cell = self.page.find_by_xpath(
            QueryToolLocators.output_column_data_xpath.format('cool info')
        )

        load_button = self.page.find_by_css_selector(
            QueryToolLocators.btn_load_file_css)
        ActionChains(self.page.driver).click_and_hold(bottom_right_cell) \
            .move_to_element(load_button) \
            .release(load_button) \
            .perform()

        ActionChains(self.page.driver).key_down(
            Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        self.assertIn('"cool info"', pyperclip.paste())

    def after(self):
        self.page.close_query_tool()
        self.page.remove_server(self.server)
        test_utils.delete_table(self.server, self.test_db,
                                self.test_table_name)
