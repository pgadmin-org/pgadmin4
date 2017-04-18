import pyperclip
import time

from selenium.webdriver import ActionChains

from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest


class CopySelectedQueryResultsFeatureTest(BaseFeatureTest):
    """
    Tests various ways to copy data from the query results grid.
    """


    scenarios = [
        ("Test Copying Query Results", dict())
    ]

    def before(self):
        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")
        test_utils.create_database(self.server, "acceptance_test_db")
        test_utils.create_table(self.server, "acceptance_test_db", "test_table")
        self.page.add_server(self.server)

    def runTest(self):
        self.page.toggle_open_tree_item(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item('acceptance_test_db')
        time.sleep(5)
        self.page.find_by_partial_link_text("Tools").click()
        self.page.find_by_partial_link_text("Query Tool").click()
        self.page.click_tab('Query-1')
        time.sleep(5)
        ActionChains(self.page.driver).send_keys("SELECT * FROM test_table").perform()
        self.page.driver.switch_to_frame(self.page.driver.find_element_by_tag_name("iframe"))
        self.page.find_by_id("btn-flash").click()

        self._copies_rows()
        self._copies_columns()

    def _copies_rows(self):
        pyperclip.copy("old clipboard contents")
        time.sleep(5)
        self.page.find_by_xpath("//*[contains(@class, 'sr')]/*[1]/input[@type='checkbox']").click()
        self.page.find_by_xpath("//*[@id='btn-copy-row']").click()

        self.assertEqual("'Some-Name','6'",
                         pyperclip.paste())

    def _copies_columns(self):
        pyperclip.copy("old clipboard contents")

        self.page.find_by_xpath("//*[@data-test='output-column-header' and contains(., 'some_column')]/input").click()
        self.page.find_by_xpath("//*[@id='btn-copy-row']").click()

        self.assertEqual(
            """'Some-Name'
'Some-Other-Name'""",
            pyperclip.paste())

    def after(self):
        self.page.close_query_tool()
        self.page.remove_server(self.server)

        connection = test_utils.get_db_connection(self.server['db'],
                                                  self.server['username'],
                                                  self.server['db_password'],
                                                  self.server['host'],
                                                  self.server['port'])
        test_utils.drop_database(connection, "acceptance_test_db")
