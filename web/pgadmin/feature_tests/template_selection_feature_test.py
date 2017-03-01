from selenium.webdriver import ActionChains

from regression import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest


class TemplateSelectionFeatureTest(BaseFeatureTest):
    def setUp(self):
        super(TemplateSelectionFeatureTest, self).setUp()

        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")

        test_utils.create_database(self.server, "acceptance_test_db")

        self.page.add_server(self.server)

    def runTest(self):
        test_utils.create_table(self.server, "acceptance_test_db", "test_table")

        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('acceptance_test_db')
        self.page.toggle_open_tree_item('Schemas')
        self.page.toggle_open_tree_item('public')
        self.page.find_by_xpath("//*[@id='tree']//*[@class='aciTreeText' and .='Trigger Functions']").click()
        self.page.find_by_partial_link_text("Object").click()
        ActionChains(self.page.driver) \
            .move_to_element(self.page.driver.find_element_by_link_text("Create")) \
            .perform()
        self.page.find_by_partial_link_text("Trigger function...").click()
        self.page.fill_input_by_field_name("name", "test-trigger-function")
        self.page.find_by_partial_link_text("Definition").click()
        self.page.fill_codemirror_area_with("some-trigger-function-content")
        self.page.find_by_partial_link_text("SQL").click()

        self.page.find_by_xpath("//*[contains(@class,'CodeMirror-lines') and contains(.,'LEAKPROOF')]")

    def tearDown(self):
        self.page.find_by_xpath("//button[contains(.,'Cancel')]").click()
        self.page.remove_server(self.server)
        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")