##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import random
import os

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.python_test_utils import test_utils
from regression.python_test_utils import test_gui_helper
from regression.feature_utils.locators import NavMenuLocators
from regression.feature_utils.tree_area_locators import TreeAreaLocators


class PGUtilitiesMaintenanceFeatureTest(BaseFeatureTest):
    """ This class test PG utilities test scenarios """

    scenarios = [
        ("Test for PG maintenance: database", dict(
            database_name='pg_maintenance_',
            table_name='table_',
            test_level='database',
            is_xss_check=False,
        )),
        ("Test for PG maintenance: table", dict(
            database_name='pg_maintenance_',
            table_name='table_',
            test_level='table',
            is_xss_check=False,
        )),
        ("Test for XSS in maintenance dialog", dict(
            database_name='pg_maintenance_',
            table_name='<h1>test_me</h1>',
            test_level='table',
            is_xss_check=True,
        )),
    ]

    def before(self):
        if self.server['default_binary_paths'] is None:
            self.skipTest(
                "default_binary_paths is not set for the server {0}".format(
                    self.server['name']
                )
            )
        if '<' in self.table_name and os.name == 'nt':
            self.skipTest(
                "HTML tags '<' and '>' in object name does not "
                "work for windows so skipping the test case"
            )

        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )

        self.table_name = self.table_name + str(random.randint(100, 1000))
        self.database_name = \
            self.database_name + str(random.randint(100, 1000))
        test_utils.drop_database(connection, self.database_name)
        test_utils.create_database(self.server, self.database_name)
        test_utils.create_table(self.server, self.database_name,
                                self.table_name)
        test_gui_helper.close_bgprocess_popup(self)
        self.page.add_server(self.server)
        self.wait = WebDriverWait(self.page.driver, 20)

    def runTest(self):
        self._open_maintenance_dialogue()
        self.page.click_modal('OK')
        self.page.wait_for_element_to_disappear(
            lambda driver: driver.find_element_by_xpath(
                NavMenuLocators.maintenance_operation))

        # Wait for the backup status alertfier
        self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR,
             NavMenuLocators.bcg_process_status_alertifier_css)))
        self.verify_command()

    def _open_maintenance_dialogue(self):
        self.page.expand_database_node(
            self.server['name'],
            self.server['db_password'], self.database_name)
        if self.test_level == 'table':
            self.page.toggle_open_schema_node(self.server['name'],
                                              self.server['db_password'],
                                              self.database_name, 'public')
            self.page.toggle_open_tables_node(self.server['name'],
                                              self.server['db_password'],
                                              self.database_name, 'public')
            retry = 5
            status = False
            while retry > 0:
                status = self.page.click_a_tree_node(
                    self.table_name,
                    TreeAreaLocators.sub_nodes_of_tables_node)
                if status:
                    break
                else:
                    retry -= 1
            self.assertTrue(status, "Table name {} is not selected".format(
                self.table_name))

        self.page.retry_click(
            (By.LINK_TEXT,
             NavMenuLocators.tools_menu_link_text),
            (By.CSS_SELECTOR, NavMenuLocators.maintenance_obj_css))
        maintenance_obj = self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, NavMenuLocators.maintenance_obj_css)))
        maintenance_obj.click()

        self.page.check_if_element_exist_by_xpath(
            NavMenuLocators.maintenance_operation, 10)

    def verify_command(self):
        status = test_utils.get_watcher_dialogue_status(self)
        self.page.retry_click(
            (By.CSS_SELECTOR,
             NavMenuLocators.status_alertifier_more_btn_css),
            (By.XPATH,
             NavMenuLocators.process_watcher_alertfier))
        self.page.wait_for_element_to_disappear(
            lambda driver: driver.find_element_by_css_selector(".loading-logs")
        )

        if status != "Successfully completed.":
            self.assertEquals(status, "Successfully completed.")

        command = self.page.find_by_css_selector(
            NavMenuLocators.
            process_watcher_detailed_command_canvas_css).text

        if self.test_level == 'database':
            self.assertEquals(command, "VACUUM (VERBOSE)\nRunning Query:"
                                       "\nVACUUM VERBOSE;")
        elif self.is_xss_check and self.test_level == 'table':
            # Check for XSS in the dialog
            source_code = self.page.find_by_css_selector(
                NavMenuLocators.
                process_watcher_detailed_command_canvas_css
            ).get_attribute('innerHTML')
            self.check_escaped_characters(
                source_code,
                '&lt;h1&gt;test_me&lt;/h1&gt;',
                'Maintenance detailed window'
            )
        else:
            self.assertEquals(command, "VACUUM "
                                       "(VERBOSE)\nRunning Query:"
                                       "\nVACUUM VERBOSE"
                                       " public." + self.table_name + ";")

        test_gui_helper.close_process_watcher(self)

    def after(self):
        test_gui_helper.close_bgprocess_popup(self)
        test_utils.delete_table(self.server, self.database_name,
                                self.table_name)
        self.page.remove_server(self.server)
        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        test_utils.drop_database(connection, self.database_name)

    def check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        assert source_code.find(string_to_find) != - \
            1, "{0} might be vulnerable to XSS ".format(source)
