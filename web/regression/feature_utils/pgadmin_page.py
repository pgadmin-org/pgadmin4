import time

from selenium.common.exceptions import NoSuchElementException, WebDriverException
from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By


class PgadminPage:
    """
    Helper class for interacting with the page, given a selenium driver
    """

    def __init__(self, driver, app_config):
        self.driver = driver
        self.app_config = app_config
        self.timeout = 10

    def reset_layout(self):
        self.click_element(self.find_by_partial_link_text("File"))
        self.find_by_partial_link_text("Reset Layout").click()
        self.click_modal_ok()

    def click_modal_ok(self):
        time.sleep(0.1)
        self.click_element(self.find_by_xpath("//button[contains(.,'OK')]"))

    def add_server(self, server_config):
        self.find_by_xpath("//*[@class='aciTreeText' and contains(.,'Servers')]").click()
        self.driver.find_element_by_link_text("Object").click()
        ActionChains(self.driver) \
            .move_to_element(self.driver.find_element_by_link_text("Create")) \
            .perform()
        self.find_by_partial_link_text("Server...").click()

        self.fill_input_by_field_name("name", server_config['name'])
        self.find_by_partial_link_text("Connection").click()
        self.fill_input_by_field_name("host", server_config['host'])
        self.fill_input_by_field_name("port", server_config['port'])
        self.fill_input_by_field_name("username", server_config['username'])
        self.fill_input_by_field_name("password", server_config['db_password'])
        self.find_by_xpath("//button[contains(.,'Save')]").click()

        self.find_by_xpath("//*[@id='tree']//*[.='" + server_config['name'] + "']")

    def remove_server(self, server_config):
        self.find_by_xpath("//*[@id='tree']//*[.='" + server_config['name'] + "' and @class='aciTreeItem']").click()
        self.find_by_partial_link_text("Object").click()
        self.find_by_partial_link_text("Delete/Drop").click()
        self.click_modal_ok()

    def toggle_open_tree_item(self, tree_item_text):
        self.find_by_xpath("//*[@id='tree']//*[.='" + tree_item_text + "']/../*[@class='aciTreeButton']").click()

    def find_by_xpath(self, xpath):
        return self.wait_for_element(lambda (driver): driver.find_element_by_xpath(xpath))

    def find_by_id(self, element_id):
        return self.wait_for_element(lambda (driver): driver.find_element_by_id(element_id))

    def find_by_partial_link_text(self, link_text):
        return self._wait_for(
            'link with text "#{0}"'.format(link_text),
            EC.element_to_be_clickable((By.PARTIAL_LINK_TEXT, link_text))
        )

    def click_element(self, element):
        def click_succeeded(driver):
            try:
                element.click()
                return True
            except WebDriverException:
                return False

        return self._wait_for("clicking the element not to throw an exception", click_succeeded)

    def fill_input_by_field_name(self, field_name, field_content):
        field = self.find_by_xpath("//input[@name='" + field_name + "']")
        backspaces = [Keys.BACKSPACE] * len(field.get_attribute('value'))

        field.click()
        field.send_keys(backspaces)
        field.send_keys(str(field_content))
        self.wait_for_input_field_content(field_name, field_content)

    def fill_codemirror_area_with(self, field_content):
        self.find_by_xpath(
            "//pre[contains(@class,'CodeMirror-line')]/../../../*[contains(@class,'CodeMirror-code')]").click()
        ActionChains(self.driver).send_keys(field_content).perform()

    def click_tab(self, tab_name):
        self.find_by_xpath("//*[contains(@class,'wcPanelTab') and contains(.,'" + tab_name + "')]").click()

    def wait_for_input_field_content(self, field_name, content):
        def input_field_has_content(driver):
            element = driver.find_element_by_xpath(
                "//input[@name='" + field_name + "']")

            return str(content) == element.get_attribute('value')

        return self._wait_for("field to contain '" + str(content) + "'", input_field_has_content)

    def wait_for_element(self, find_method_with_args):
        def element_if_it_exists(driver):
            try:
                element = find_method_with_args(driver)
                if element.is_displayed() and element.is_enabled():
                    return element
            except NoSuchElementException:
                return False

        return self._wait_for("element to exist", element_if_it_exists)

    def wait_for_spinner_to_disappear(self):
        def spinner_has_disappeared(driver):
            try:
                driver.find_element_by_id("pg-spinner")
                return False
            except NoSuchElementException:
                return True

        self._wait_for("spinner to disappear", spinner_has_disappeared)

    def wait_for_app(self):
        def page_shows_app(driver):
            if driver.title == self.app_config.APP_NAME:
                return True
            else:
                driver.refresh()
                return False

        self._wait_for("app to start", page_shows_app)

    def _wait_for(self, waiting_for_message, condition_met_function):
        return WebDriverWait(self.driver, self.timeout, 0.01).until(condition_met_function,
                                                                    "Timed out waiting for " + waiting_for_message)
