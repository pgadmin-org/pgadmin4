##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import json
import time

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver import ActionChains
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.feature_utils.locators import NavMenuLocators, \
    QueryToolLocators
from regression.feature_utils.tree_area_locators import TreeAreaLocators

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))

try:
    with open(CURRENT_PATH + '/datatype_test.json') as data_file:
        test_data_configuration = json.load(data_file)
        config_data = test_data_configuration['tests']
        type_minimum_version = \
            test_data_configuration['datatype_minimum_version']
except Exception as e:
    print(str(e))
    assert False, \
        "datatype_test.json file load failed"


class PGDataypeFeatureTest(BaseFeatureTest):
    """
        This feature test will test the different Postgres
        data-type output.
    """

    scenarios = [
        ("Test checks for PG data-types output", dict())
    ]

    def before(self):
        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode'])

        self.timezone = int(test_utils.get_timezone_without_dst(connection))

        if abs(self.timezone) % 3600 > 0:
            hh_mm = '%H:%M'
        else:
            hh_mm = '%H'

        self.timezone_hh_mm = time.strftime(
            hh_mm, time.gmtime(abs(self.timezone)))

        if self.timezone < 0:
            self.timezone_hh_mm = '-{}'.format(self.timezone_hh_mm)
        else:
            self.timezone_hh_mm = '+{}'.format(self.timezone_hh_mm)

        self.database_version = self.server_information['server_version']

        # For this test case we need to set "Insert bracket pairs?"
        # SQL Editor preference to 'false' to avoid codemirror
        # to add matching closing bracket by it self.
        self._update_preferences()

        # close the db connection
        connection.close()

    def _update_preferences(self):
        retry = 2
        while retry > 0:
            try:
                file_menu = self.page.find_by_css_selector(
                    NavMenuLocators.file_menu_css)
                file_menu.click()

                self.page.retry_click(
                    (By.CSS_SELECTOR,
                     NavMenuLocators.preference_menu_item_css),
                    (By.XPATH,
                     NavMenuLocators.specified_preference_tree_node
                     .format('Browser'))
                )

                wait = WebDriverWait(self.page.driver, 10)

                browser_node = self.page.find_by_xpath(
                    NavMenuLocators.specified_preference_tree_node.
                    format('Browser'))
                if self.page.find_by_xpath(
                    NavMenuLocators.specified_pref_node_exp_status.
                        format('Browser')).\
                        get_attribute('aria-expanded') == 'false':
                    ActionChains(self.driver).\
                        double_click(browser_node).perform()

                self.page.retry_click(
                    (By.XPATH, NavMenuLocators.
                     specified_sub_node_of_pref_tree_node.
                     format('Browser', 'Display')),
                    (By.XPATH,
                     NavMenuLocators.show_system_objects_pref_label_xpath))

                # Wait till the preference dialogue
                # box is displayed by checking the
                # visibility of Show System Object label
                wait.until(EC.presence_of_element_located(
                    (By.XPATH,
                     NavMenuLocators.show_system_objects_pref_label_xpath))
                )

                maximize_button = self.page.find_by_xpath(
                    NavMenuLocators.maximize_pref_dialogue_css)
                maximize_button.click()

                specified_preference_tree_node_name = 'Query Tool'
                sql_editor = self.page.find_by_xpath(
                    NavMenuLocators.specified_preference_tree_node.
                    format(specified_preference_tree_node_name))
                if self.page.find_by_xpath(
                    NavMenuLocators.specified_pref_node_exp_status.
                        format(specified_preference_tree_node_name)).\
                        get_attribute('aria-expanded') == 'false':
                    ActionChains(self.driver).\
                        double_click(sql_editor).perform()

                option_node = \
                    self.page.find_by_xpath("//*[@id='treeContainer']"
                                            "//div//span[text()='Editor']")
                option_node.click()

                switch_box_element = self.page.find_by_xpath(
                    NavMenuLocators.insert_bracket_pair_switch_btn)

                switch_box_element.click()

                maximize_button = self.page.find_by_xpath(
                    NavMenuLocators.maximize_pref_dialogue_css)
                maximize_button.click()
                time.sleep(0.5)

                # save and close the preference dialog.
                self.page.click_modal('Save')
                break
            except Exception:
                retry -= 1

    def _create_enum_type(self):
        query = """CREATE TYPE public.rainbow AS ENUM ('red', 'orange',
        'yellow','green','blue','purple');
        """
        self.page.fill_codemirror_area_with(query)
        time.sleep(0.5)
        self.page.find_by_css_selector(
            QueryToolLocators.btn_execute_query_css).click()
        self.page.clear_query_tool()

    def runTest(self):
        self.page.wait_for_spinner_to_disappear()
        self.page.add_server(self.server)
        self.page.expand_database_node("Server", self.server['name'],
                                       self.server['db_password'],
                                       self.test_db)

        # Check data types
        self._check_datatype()
        self.page.close_query_tool(False)

    def after(self):
        self.page.remove_server(self.server)

    def _check_datatype(self):
        # Slick grid does not render all the column if viewport is not enough
        # wide. So execute test as batch of queries.
        self.page.open_query_tool()
        self._create_enum_type()
        for batch in config_data:
            query = self.construct_select_query(batch)
            if not query:
                continue
            self.page.execute_query(query)
            wait = WebDriverWait(self.page.driver, 5)

            # wait for the visibility of the grid to appear
            wait.until(EC.visibility_of_element_located(
                (By.XPATH,
                 "//*[@id='id-dataoutput']"
                 )
            ))
            wait.until(EC.visibility_of_element_located(
                (By.XPATH,
                 "//*[@id='id-dataoutput']//"
                 "span[contains(text(),'{}')]".format(batch['datatype'][0])
                 )
            ))

            canvas = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, QueryToolLocators.query_output_canvas_css))
            )

            # For every sample data-type value, check the expected output.
            cnt = 2
            cells = canvas.find_elements(
                By.CSS_SELECTOR, QueryToolLocators.query_output_cells)
            # remove first element as it is row number.
            cells.pop(0)
            for val, cell, datatype in zip(
                    batch['output'], cells, batch['datatype']):
                expected_output = batch['output'][cnt - 2]

                if not self._is_datatype_available_in_current_database(
                        datatype):
                    cnt += 1
                    continue

                if datatype in ('tstzrange', 'tstzrange[]', 'tstzmultirange',
                                'tstzmultirange[]'):
                    expected_output = expected_output.format(
                        **dict([('tz', self.timezone_hh_mm)]))
                try:
                    source_code = cell.text
                    PGDataypeFeatureTest.check_result(
                        datatype,
                        source_code,
                        expected_output
                    )

                    cnt += 1
                except TimeoutException:
                    assert False,\
                        "for datatype {0}\n{1} does not match with {2}".format(
                            datatype, val, expected_output
                        )
            self.page.clear_query_tool()

    def construct_select_query(self, batch):
        query = 'SELECT '
        first = True
        for datatype, inputdata in zip(batch['datatype'], batch['input']):
            if not self._is_datatype_available_in_current_database(datatype):
                continue

            if datatype != '':
                dataformatter = '{}::{}'
            else:
                dataformatter = '{}'

            if datatype in ('tstzrange', 'tstzrange[]', 'tstzmultirange',
                            'tstzmultirange[]'):
                inputdata = inputdata.format(
                    **dict([('tz', self.timezone_hh_mm)]))
            if first:
                query += dataformatter.format(inputdata, datatype)
            else:
                query += ',' + dataformatter.format(inputdata, datatype)
            first = False
        query = '' if query == 'SELECT ' else query + ';'
        return query

    @staticmethod
    def check_result(datatype, source_code, string_to_find):
        assert source_code == string_to_find,\
            "for datatype {0}\n{1} does not match with {2}".format(
                datatype, source_code, string_to_find
            )

    def _is_datatype_available_in_current_database(self, datatype):
        if datatype == '':
            return True
        return self.database_version >= type_minimum_version[datatype]
