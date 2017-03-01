#############################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################

from selenium.webdriver import ActionChains

import config as app_config
from regression import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest


class ConnectsToServerFeatureTest(BaseFeatureTest):
    """
    Tests that a database connection can be created from the UI
    """

    def setUp(self):
        super(ConnectsToServerFeatureTest, self).setUp()

        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")
        test_utils.create_database(self.server, "acceptance_test_db")
        test_utils.create_table(self.server, "acceptance_test_db", "test_table")

    def runTest(self):
        self.assertEqual(app_config.APP_NAME, self.page.driver.title)
        self.page.wait_for_spinner_to_disappear()

        self._connects_to_server()
        self._tables_node_expandable()

    def tearDown(self):
        self.page.remove_server(self.server)

        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")

    def _connects_to_server(self):
        self.page.find_by_xpath("//*[@class='aciTreeText' and .='Servers']").click()
        self.page.driver.find_element_by_link_text("Object").click()
        ActionChains(self.page.driver) \
            .move_to_element(self.page.driver.find_element_by_link_text("Create")) \
            .perform()
        self.page.find_by_partial_link_text("Server...").click()

        server_config = self.server
        self.page.fill_input_by_field_name("name", server_config['name'])
        self.page.find_by_partial_link_text("Connection").click()
        self.page.fill_input_by_field_name("host", server_config['host'])
        self.page.fill_input_by_field_name("port", server_config['port'])
        self.page.fill_input_by_field_name("username", server_config['username'])
        self.page.fill_input_by_field_name("password", server_config['db_password'])
        self.page.find_by_xpath("//button[contains(.,'Save')]").click()

    def _tables_node_expandable(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('acceptance_test_db')
        self.page.toggle_open_tree_item('Schemas')
        self.page.toggle_open_tree_item('public')
        self.page.toggle_open_tree_item('Tables')
        self.page.toggle_open_tree_item('test_table')
