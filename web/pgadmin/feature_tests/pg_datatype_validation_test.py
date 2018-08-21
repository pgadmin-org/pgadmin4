##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
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

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))

try:
    with open(CURRENT_PATH + '/datatype_test.json') as data_file:
        test_data_configuration = json.load(data_file)
        config_data = test_data_configuration['tests']
        type_minimum_version = \
            test_data_configuration['datatype_minimum_version']
except Exception as e:
    print(str(e))


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

        self.database_version = connection.server_version

        # For this test case we need to set "Insert bracket pairs?"
        # SQL Editor preference to 'false' to avoid codemirror
        # to add matching closing bracket by it self.
        self._update_preferences()

        # close the db connection
        connection.close()

    def _update_preferences(self):
        self.page.find_by_id("mnu_file").click()
        self.page.find_by_id("mnu_preferences").click()
        wait = WebDriverWait(self.page.driver, 10)

        wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(string(), 'Show system objects?')]"))
        )

        self.page.find_by_css_selector(
            ".ajs-dialog.pg-el-container .ajs-maximize").click()

        sql_editor = self.page.find_by_xpath(
            "//*[contains(@class,'aciTreeLi') and contains(.,'SQL Editor')]")

        sql_editor.find_element_by_xpath(
            "//*[contains(@class,'aciTreeText') and contains(.,'Options')]"
        ).click()

        insert_bracket_pairs_control = self.page.find_by_xpath(
            "//div[contains(@class,'pgadmin-control-group') and "
            "contains(.,'Insert bracket pairs?')]"
        )

        switch_btn = insert_bracket_pairs_control.\
            find_element_by_class_name('bootstrap-switch')

        # check if switch is on then only toggle.
        if 'bootstrap-switch-on' in switch_btn.get_attribute('class'):
            switch_btn.click()

        # save and close the preference dialog.
        self.page.find_by_xpath(
            "//*[contains(@class,'pg-alertify-button') and "
            "contains(.,'OK')]"
        ).click()

        self.page.wait_for_element_to_disappear(
            lambda driver: driver.find_element_by_css_selector(".ajs-modal")
        )
        time.sleep(0.5)

    def _create_enum_type(self):
        query = """CREATE TYPE public.rainbow AS ENUM ('red', 'orange',
        'yellow','green','blue','purple');
        """
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        self._clear_query_tool()

    def runTest(self):
        self.page.wait_for_spinner_to_disappear()
        self.page.add_server(self.server)
        self._schema_node_expandable()

        # Check data types
        self._check_datatype()
        self.page.close_query_tool()

    def after(self):
        self.page.remove_server(self.server)

    def _schema_node_expandable(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item(self.test_db)

    def _check_datatype(self):
        # Slick grid does not render all the column if viewport is not enough
        # wide. So execute test as batch of queries.
        self.page.select_tree_item(self.test_db)
        self.page.open_query_tool()
        self._create_enum_type()
        for batch in config_data:
            query = self.construct_select_query(batch)
            self.page.fill_codemirror_area_with(query)
            self.page.find_by_id("btn-flash").click()

            wait = WebDriverWait(self.page.driver, 5)
            wait.until(EC.presence_of_element_located(
                (By.XPATH,
                 "//*[contains(@class,'column-type') and "
                 "contains(.,'{}')]".format(batch['datatype'][0])
                 )
            ))

            canvas = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
            )

            # For every sample data-type value, check the expected output.
            cnt = 2
            cells = canvas.find_elements_by_css_selector('.slick-cell')
            # remove first element as it is row number.
            cells.pop(0)
            for val, cell, datatype in zip(
                    batch['output'], cells, batch['datatype']):
                expected_output = batch['output'][cnt - 2]

                if not self._is_datatype_available_in_current_database(
                        datatype):
                    cnt += 1
                    continue

                if datatype in ('tstzrange', 'tstzrange[]'):
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
            self._clear_query_tool()

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

            if datatype in ('tstzrange', 'tstzrange[]'):
                inputdata = inputdata.format(
                    **dict([('tz', self.timezone_hh_mm)]))
            if first:
                query += dataformatter.format(inputdata, datatype)
            else:
                query += ',' + dataformatter.format(inputdata, datatype)
            first = False
        return query + ';'

    @staticmethod
    def check_result(datatype, source_code, string_to_find):
        assert source_code == string_to_find,\
            "for datatype {0}\n{1} does not match with {2}".format(
                datatype, source_code, string_to_find
            )

    def _clear_query_tool(self):
        self.page.click_element(
            self.page.find_by_xpath("//*[@id='btn-clear-dropdown']")
        )
        ActionChains(self.driver)\
            .move_to_element(self.page.find_by_xpath("//*[@id='btn-clear']"))\
            .perform()
        self.page.click_element(
            self.page.find_by_xpath("//*[@id='btn-clear']")
        )
        self.page.click_modal('Yes')

    def _is_datatype_available_in_current_database(self, datatype):
        if datatype == '':
            return True
        return self.database_version >= type_minimum_version[datatype]
