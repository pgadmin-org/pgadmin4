##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import time
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.python_test_utils import test_utils


class PGUtilitiesMaintenanceFeatureTest(BaseFeatureTest):
    """ This class test PG utilities test scenarios """

    scenarios = [
        ("Test for PG maintenance: database", dict(
            database_name='pg_maintenance',
            table_name='pg_maintenance_table',
            test_level='database'
        )),
        ("Test for PG maintenance: table", dict(
            database_name='pg_maintenance',
            table_name='pg_maintenance_table',
            test_level='table'
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

    def runTest(self):
        self._open_maintenance_dialogue()
        self.page.find_by_css_selector(
            "button.fa-save.btn-primary.pg-alertify-button"). \
            click()
        self.page.wait_for_element_to_disappear(
            lambda driver: driver.find_element_by_css_selector(".ajs-modal")
        )
        self._verify_command()

    def _open_maintenance_dialogue(self):
        self.page.toggle_open_server(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item(self.database_name)
        if self.test_level == 'table':
            self.page.toggle_open_tree_item('Schemas')
            self.page.toggle_open_tree_item('public')
            self.page.toggle_open_tree_item('Tables')
            self.page.select_tree_item(self.table_name)

        self.driver.find_element_by_link_text("Tools").click()
        self.page.find_by_partial_link_text("Maintenance...").click()
        time.sleep(0.5)

    def _verify_command(self):
        status = self.page.find_by_css_selector(
            ".pg-bg-bgprocess .bg-success").text
        self.assertEquals(status, "Successfully completed.")
        self.page.find_by_css_selector(
            ".pg-bg-bgprocess .pg-bg-click > span").click()
        command = self.page.find_by_css_selector("p.bg-detailed-desc").text
        if self.test_level == 'database':
            self.assertEquals(command, "VACUUM "
                                       "(VERBOSE)\nRunning Query:"
                                       "\nVACUUM VERBOSE;")
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
