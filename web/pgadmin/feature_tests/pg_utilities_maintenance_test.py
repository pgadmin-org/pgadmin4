##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import time

from selenium.webdriver.support.ui import WebDriverWait
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.python_test_utils import test_utils
from regression.python_test_utils import test_gui_helper


class PGUtilitiesMaintenanceFeatureTest(BaseFeatureTest):
    """ This class test PG utilities test scenarios """

    scenarios = [
        ("Test for PG maintenance: database", dict(
            database_name='pg_maintenance',
            table_name='pg_maintenance_table',
            test_level='database',
            is_xss_check=False,
        )),
        ("Test for PG maintenance: table", dict(
            database_name='pg_maintenance',
            table_name='pg_maintenance_table',
            test_level='table',
            is_xss_check=False,
        )),
        ("Test for XSS in maintenance dialog", dict(
            database_name='pg_maintenance',
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

        connection = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        test_utils.drop_database(connection, self.database_name)
        test_utils.create_database(self.server, self.database_name)
        test_utils.create_table(self.server, self.database_name,
                                self.table_name)
        self.page.add_server(self.server)
        self.wait = WebDriverWait(self.page.driver, 20)
        test_gui_helper.close_bgprocess_popup(self)

    def runTest(self):
        self._open_maintenance_dialogue()
        self.page.click_modal('OK')
        self.page.find_by_css_selector('.ajs-bg-bgprocess')
        self._verify_command()

    def _open_maintenance_dialogue(self):
        self.page.toggle_open_server(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item(self.database_name)
        if self.test_level == 'table':
            self.page.toggle_open_tree_item('Schemas')
            self.page.toggle_open_tree_item('public')
            self.page.toggle_open_tables_node()
            self.page.select_tree_item(self.table_name)

        self.driver.find_element_by_link_text("Tools").click()
        self.page.find_by_partial_link_text("Maintenance...").click()
        time.sleep(0.5)

    def _verify_command(self):
        status = test_utils.get_watcher_dialogue_status(self)
        if status != "Successfully completed.":
            test_gui_helper.close_bgprocess_popup(self)

        self.assertEquals(status, "Successfully completed.")
        self.page.find_by_css_selector(".pg-bg-more-details").click()
        command = self.page.find_by_css_selector(
            ".bg-process-details .bg-detailed-desc").text
        if self.test_level == 'database':
            self.assertEquals(command, "VACUUM "
                                       "(VERBOSE)\nRunning Query:"
                                       "\nVACUUM VERBOSE;")
        elif self.is_xss_check and self.test_level == 'table':
            # Check for XSS in the dialog
            source_code = self.page.find_by_css_selector(
                ".bg-process-details .bg-detailed-desc"
            ).get_attribute('innerHTML')
            self._check_escaped_characters(
                source_code,
                '&lt;h1&gt;test_me&lt;/h1&gt;',
                'Maintenance detailed window'
            )
        else:
            self.assertEquals(command, "VACUUM "
                                       "(VERBOSE)\nRunning Query:"
                                       "\nVACUUM VERBOSE"
                                       " public." + self.table_name + ";")

        self.page.find_by_css_selector(
            "div.wcFloatingFocus div.fa-close").click()

    def after(self):
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

    def _check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        assert source_code.find(string_to_find) != - \
            1, "{0} might be vulnerable to XSS ".format(source)
