##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import secrets
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

        self.table_name = self.table_name + str(
            secrets.choice(range(100, 1000)))
        self.database_name = \
            self.database_name + str(secrets.choice(range(100, 1000)))
        test_utils.drop_database(connection, self.database_name)
        test_utils.create_database(self.server, self.database_name)
        test_utils.create_table(self.server, self.database_name,
                                self.table_name)
        self.page.add_server(self.server)
        self.wait = WebDriverWait(self.page.driver, 20)

    def runTest(self):
        self._open_maintenance_dialogue()
        self.page.click_modal('OK')
        self.page.wait_for_element_to_disappear(
            lambda driver: driver.find_element(
                By.XPATH, NavMenuLocators.maintenance_operation), 10)

        # Wait for the backup started alert
        test_gui_helper.wait_for_process_start(self)
        self.verify_command()

    def _open_maintenance_dialogue(self):
        if self.test_level == 'table':
            self.page.expand_tables_node("Server", self.server['name'],
                                         self.server['db_password'],
                                         self.database_name, 'public')

            table_node = self.page.check_if_element_exists_with_scroll(
                TreeAreaLocators.table_node(self.table_name))

            status = False
            if table_node:
                status = True
            self.assertTrue(status, "Table name {0} is not visible/selected".
                            format(self.table_name))
            table_node.click()

        else:
            self.page.expand_database_node("Server", self.server['name'],
                                           self.server['db_password'],
                                           self.database_name)
        self.page.retry_click(
            (By.CSS_SELECTOR,
             NavMenuLocators.tools_menu_css),
            (By.CSS_SELECTOR, NavMenuLocators.maintenance_obj_css))
        maintenance_obj = self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, NavMenuLocators.maintenance_obj_css)))
        maintenance_obj.click()

        self.assertFalse(self.page.check_utility_error(),
                         'Binary path is not configured.')

        self.page.check_if_element_exist_by_xpath(
            NavMenuLocators.maintenance_operation, 10)

    def verify_command(self):
        test_gui_helper.open_process_details(self)

        message = self.page.find_by_css_selector(
            NavMenuLocators.process_watcher_detailed_message_css).text
        command = self.page.find_by_css_selector(
            NavMenuLocators.process_watcher_detailed_command_css).text

        if self.test_level == 'database':
            vacuum_details = \
                "VACUUM on database '{0}' of server " \
                "{1} ({2}:{3})".format(self.database_name,
                                       self.server['name'],
                                       self.server['host'],
                                       self.server['port'])
            self.assertEqual(message, vacuum_details)
            self.assertEqual(command, "VACUUM (VERBOSE);")
        elif self.is_xss_check and self.test_level == 'table':
            # Check for XSS in the dialog
            source_code = self.page.find_by_css_selector(
                NavMenuLocators.process_watcher_detailed_command_css
            ).get_attribute('innerHTML')
            self.check_escaped_characters(
                source_code,
                '&lt;h1&gt;test_me&lt;/h1&gt;',
                'Maintenance detailed window'
            )
        else:
            vacuum_details = \
                "VACUUM on table '{0}/public/{1}' of server " \
                "{2} ({3}:{4})".format(self.database_name,
                                       self.table_name,
                                       self.server['name'],
                                       self.server['host'],
                                       self.server['port'])
            self.assertEqual(message, vacuum_details)
            self.assertEqual(command, "VACUUM (VERBOSE)"
                                      " public." + self.table_name + ";")

        test_gui_helper.close_process_watcher(self)

    def after(self):
        try:
            test_utils.delete_table(self.server, self.database_name,
                                    self.table_name)
            self.page.remove_server(self.server)
        except Exception:
            print("PGUtilitiesMaintenanceFeatureTest - "
                  "Exception occurred in after method")
        finally:
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
