##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import secrets

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
        self.test_table_name = "test_table" + \
                               str(secrets.choice(range(1000, 3000)))
        self.page.add_server(self.server)
        test_utils.create_table(
            self.server, self.test_db, self.test_table_name)

    def runTest(self):
        self.page.expand_database_node("Servers", self.server['name'],
                                       self.server['db_password'],
                                       self.test_db)
        self.page.open_query_tool()

        self.page.fill_codemirror_area_with(
            "SELECT * FROM %s ORDER BY some_column" % self.test_table_name)

        self.page.find_by_css_selector(
            QueryToolLocators.btn_execute_query_css).click()

        self._copies_rows()
        self._copies_columns()
        self._copies_row_using_keyboard_shortcut()
        self._copies_column_using_keyboard_shortcut()
        # The below calls is commented since the new data grid does not
        # support range selection. This can be enabled once the
        # range selection is implemented.
        # self._copies_rectangular_selection()
        # self._shift_resizes_rectangular_selection()

        self._shift_resizes_column_selection()
        self._mouseup_outside_grid_does_not_make_a_selection()
        self._copies_rows_with_header()

    def paste_values_to_scratch_pad(self):
        scratch_pad_ele = self.page.find_by_css_selector(
            QueryToolLocators.scratch_pad_css)
        self.page.paste_values(scratch_pad_ele)
        clipboard_text = scratch_pad_ele.get_attribute("value")
        scratch_pad_ele.clear()
        return clipboard_text

    def _copies_rows(self):
        first_row = self.page.find_by_xpath(
            QueryToolLocators.output_cell_xpath.format(2, 1))
        first_row.click()

        copy_button = self.page.find_by_css_selector(
            QueryToolLocators.copy_button_css)
        copy_button.click()

        clipboard_text = self.paste_values_to_scratch_pad()
        self.assertEqual('"Some-Name"\t6\t"some info"',
                         clipboard_text)

    def _copies_rows_with_header(self):
        self.page.find_by_css_selector(QueryToolLocators.copy_options_css)\
            .click()
        self.page.find_by_css_selector(QueryToolLocators.copy_headers_btn_css)\
            .click()

        select_all = self.page.find_by_xpath(
            QueryToolLocators.select_all_column)
        select_all.click()

        copy_button = self.page.find_by_css_selector(
            QueryToolLocators.copy_button_css)
        copy_button.click()

        clipboard_text = self.paste_values_to_scratch_pad()

        self.assertEqual("""\"some_column"\t"value"\t"details"
\"Some-Name"\t6\t"some info"
\"Some-Other-Name"\t22\t"some other info"
\"Yet-Another-Name"\t14\t"cool info\"""", clipboard_text)

    def _copies_columns(self):
        column = self.page.find_by_css_selector(
            QueryToolLocators.output_column_header_css.format('some_column'))
        column.click()

        copy_button = self.page.find_by_css_selector(
            QueryToolLocators.copy_button_css)
        copy_button.click()

        clipboard_text = self.paste_values_to_scratch_pad()

        self.assertEqual(
            """\"Some-Name"
"Some-Other-Name"
"Yet-Another-Name\"""",
            clipboard_text)

    def _copies_row_using_keyboard_shortcut(self):
        first_row = self.page.find_by_xpath(
            QueryToolLocators.output_cell_xpath.format(2, 1))
        first_row.click()

        ActionChains(self.page.driver).key_down(
            Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        clipboard_text = self.paste_values_to_scratch_pad()

        self.assertEqual('"Some-Name"\t6\t"some info"',
                         clipboard_text)

    def _copies_column_using_keyboard_shortcut(self):
        column = self.page.find_by_css_selector(
            QueryToolLocators.output_column_header_css.format('some_column'))
        column.click()

        ActionChains(self.page.driver).key_down(
            Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        clipboard_text = self.paste_values_to_scratch_pad()

        self.assertEqual(
            """\"Some-Name"
"Some-Other-Name"
"Yet-Another-Name\"""",
            clipboard_text)

    def _copies_rectangular_selection(self):
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

        clipboard_text = self.paste_values_to_scratch_pad()

        self.assertEqual(
            '"Some-Other-Name"\t22\n"Yet-Another-Name"\t14', clipboard_text)

    def _shift_resizes_rectangular_selection(self):
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

        clipboard_text = self.paste_values_to_scratch_pad()

        self.assertEqual("""\"Some-Other-Name"\t22\t"some other info"
"Yet-Another-Name"\t14\t"cool info\"""", clipboard_text)

    def _shift_resizes_column_selection(self):
        column = self.page.find_by_css_selector(
            QueryToolLocators.output_column_header_css.format('value')
        )
        column.click()

        ActionChains(self.page.driver).key_down(
            Keys.SHIFT).send_keys(Keys.ARROW_LEFT).key_up(Keys.SHIFT).perform()

        ActionChains(self.page.driver).key_down(
            Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

        clipboard_text = self.paste_values_to_scratch_pad()

        self.assertEqual(
            '"Some-Name"\t6\n"Some-Other-Name"\t22\n"Yet-Another-Name"\t14',
            clipboard_text)

    def _mouseup_outside_grid_does_not_make_a_selection(self):
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

        clipboard_text = self.paste_values_to_scratch_pad()

        self.assertNotIn('"cool info"', clipboard_text)

    def after(self):
        self.page.close_query_tool()
        self.page.remove_server(self.server)
        test_utils.delete_table(self.server, self.test_db,
                                self.test_table_name)
