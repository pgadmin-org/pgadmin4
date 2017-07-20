##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import time
from selenium.webdriver import ActionChains
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest


class PGDataypeFeatureTest(BaseFeatureTest):
    """
        This feature test will test the different Postgres
        data-type output.
    """

    scenarios = [
        ("Test checks for PG data-types output", dict())
    ]

    def before(self):
        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'],
                                                  self.server['sslmode'])
        test_utils.drop_database(connection, "acceptance_test_db")
        test_utils.create_database(self.server, "acceptance_test_db")

    def runTest(self):
        self.page.wait_for_spinner_to_disappear()
        self._connects_to_server()
        self._schema_node_expandable()

        # Check data types
        self._check_datatype()
        self.page.close_query_tool()

    def after(self):
        self.page.remove_server(self.server)
        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'],
                                                  self.server['sslmode'])
        test_utils.drop_database(connection, "acceptance_test_db")

    def _connects_to_server(self):
        self.page.find_by_xpath(
            "//*[@class='aciTreeText' and .='Servers']"
        ).click()
        time.sleep(2)
        self.page.driver.find_element_by_link_text("Object").click()
        ActionChains(self.page.driver) \
            .move_to_element(
            self.page.driver.find_element_by_link_text("Create")
        ).perform()
        self.page.find_by_partial_link_text("Server...").click()

        server_config = self.server
        self.page.fill_input_by_field_name("name", server_config['name'])
        self.page.find_by_partial_link_text("Connection").click()
        self.page.fill_input_by_field_name("host", server_config['host'])
        self.page.fill_input_by_field_name("port", server_config['port'])
        self.page.fill_input_by_field_name(
            "username", server_config['username']
        )
        self.page.fill_input_by_field_name(
            "password", server_config['db_password']
        )
        self.page.find_by_xpath("//button[contains(.,'Save')]").click()

    def _schema_node_expandable(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('acceptance_test_db')

    def _check_datatype(self):
        query = r"SELECT -32767::smallint, 32767::smallint," \
                r"-2147483647::integer, 2147483647::integer," \
                r"9223372036854775807::bigint, 9223372036854775807::bigint," \
                r"922337203685.4775807::decimal, 92203685.477::decimal," \
                r"922337203685.922337203685::numeric, " \
                r"-92233720368547758.08::numeric," \
                r"ARRAY[1, 2, 3]::float[], ARRAY['nan', 'nan', 'nan']::float[]," \
                r"'Infinity'::real, '{Infinity}'::real[]," \
                r"E'\\xDEADBEEF'::bytea, ARRAY[E'\\xDEADBEEF', E'\\xDEADBEEF']::bytea[];"

        expected_output = [
            '-32767', '32767', '-2147483647', '2147483647',
            '9223372036854775807', '9223372036854775807',
            '922337203685.4775807', '92203685.477',
            '922337203685.922337203685', '-92233720368547758.08',
            '{1,2,3}', '{NaN,NaN,NaN}',
            'Infinity', '{Infinity}',
            r'[binary data]', r'[binary data[]]'
        ]

        self.page.open_query_tool()
        self.page.fill_codemirror_area_with(query)
        self.page.find_by_id("btn-flash").click()
        wait = WebDriverWait(self.page.driver, 5)

        canvas = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "#datagrid .slick-viewport .grid-canvas"))
        )

        # For every sample data-type value, check the expected output.
        cnt = 2
        cells = canvas.find_elements_by_css_selector('.slick-cell')
        # remove first element as it is row number.
        cells.pop(0)
        for val, cell in zip(expected_output, cells):
            try:
                source_code = cell.text

                PGDataypeFeatureTest.check_result(
                    source_code,
                    expected_output[cnt - 2]
                )
                cnt += 1
            except TimeoutException:
                assert False, "{0} does not match with {1}".format(
                    val, expected_output[cnt]
                )

    @staticmethod
    def check_result(source_code, string_to_find):
        if source_code.find(string_to_find) == -1:
            assert False, "{0} does not match with {1}".format(
                source_code, string_to_find
            )
        else:
            assert True


