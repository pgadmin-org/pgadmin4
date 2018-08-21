##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import pyperclip
import random

from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest


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

        test_utils.create_table(
            self.server, self.test_db, self.test_table_name)
        self.page.add_server(self.server)

    def runTest(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item(self.test_db)
        self.page.open_query_tool()

        self.page.driver.switch_to_frame(
            self.page.driver.find_element_by_tag_name("iframe"))

        self.page.fill_codemirror_area_with(
            "SELECT * FROM %s ORDER BY some_column" % self.test_table_name)

        self.page.find_by_id("btn-flash").click()

        self._copies_rows()
        self._copies_columns()
        self._copies_row_using_keyboard_shortcut()
        self._copies_column_using_keyboard_shortcut()
        self._copies_rectangular_selection()
        self._shift_resizes_rectangular_selection()
        self._shift_resizes_column_selection()
        self._mouseup_outside_grid_still_makes_a_selection()

    def _copies_rows(self):
        pyperclip.copy("old clipboard contents")
        self.page.find_by_xpath(
            "//*[contains(@class, 'slick-row')]/*[1]").click()

        self.page.find_by_xpath("//*[@id='btn-copy-row']").click()

        self.assertEqual('"Some-Name"\t"6"\t"some info"',
                         pyperclip.paste())

    def _copies_columns(self):
        pyperclip.copy("old clipboard contents")
        self.page.find_by_xpath(
            "//*[@data-test='output-column-header' and "
            "contains(., 'some_column')]"
        ).click()
        self.page.find_by_xpath("//*[@id='btn-copy-row']").click()

        self.assertEqual(
            """\"Some-Name"
"Some-Other-Name"
"Yet-Another-Name\"""",
            pyperclip.paste())

    def _copies_row_using_keyboard_shortcut(self):
        pyperclip.copy("old clipboard contents")
        self.page.find_by_xpath(
            "//*[contains(@class, 'slick-row')]/*[1]").click()

        ActionChains(self.page.driver).key_down(
            Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        self.assertEqual('"Some-Name"\t"6"\t"some info"',
                         pyperclip.paste())

    def _copies_column_using_keyboard_shortcut(self):
        pyperclip.copy("old clipboard contents")
        self.page.find_by_xpath(
            "//*[@data-test='output-column-header' and "
            "contains(., 'some_column')]"
        ).click()

        ActionChains(self.page.driver).key_down(
            Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        self.assertEqual(
            """\"Some-Name"
"Some-Other-Name"
"Yet-Another-Name\"""",
            pyperclip.paste())

    def _copies_rectangular_selection(self):
        pyperclip.copy("old clipboard contents")

        top_left_cell = self.page.find_by_xpath(
            "//div[contains(@class, 'slick-cell') and "
            "contains(., 'Some-Other-Name')]"
        )
        bottom_right_cell = self.page.find_by_xpath(
            "//div[contains(@class, 'slick-cell') and contains(., '14')]")

        ActionChains(
            self.page.driver
        ).click_and_hold(top_left_cell).move_to_element(
            bottom_right_cell
        ).release(bottom_right_cell).perform()

        ActionChains(
            self.page.driver
        ).key_down(Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        self.assertEqual("""\"Some-Other-Name"\t"22"
"Yet-Another-Name"\t"14\"""", pyperclip.paste())

    def _shift_resizes_rectangular_selection(self):
        pyperclip.copy("old clipboard contents")

        top_left_cell = self.page.find_by_xpath(
            "//div[contains(@class, 'slick-cell') and "
            "contains(., 'Some-Other-Name')]"
        )
        initial_bottom_right_cell = self.page.find_by_xpath(
            "//div[contains(@class, 'slick-cell') and contains(., '14')]")
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

        self.assertEqual("""\"Some-Other-Name"\t"22"\t"some other info"
"Yet-Another-Name"\t"14"\t"cool info\"""", pyperclip.paste())

    def _shift_resizes_column_selection(self):
        pyperclip.copy("old clipboard contents")

        self.page.find_by_xpath(
            "//*[@data-test='output-column-header' and "
            "contains(., 'value')]"
        ).click()

        ActionChains(self.page.driver).key_down(
            Keys.SHIFT).send_keys(Keys.ARROW_LEFT).key_up(Keys.SHIFT).perform()

        ActionChains(self.page.driver).key_down(
            Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        self.assertEqual(
            """\"Some-Name"\t"6"
"Some-Other-Name"\t"22"
"Yet-Another-Name"\t"14\"""",
            pyperclip.paste())

    def _mouseup_outside_grid_still_makes_a_selection(self):
        pyperclip.copy("old clipboard contents")

        bottom_right_cell = self.page.find_by_xpath(
            "//div[contains(@class, 'slick-cell') and "
            "contains(., 'cool info')]"
        )

        load_button = self.page.find_by_xpath("//button[@id='btn-load-file']")
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
