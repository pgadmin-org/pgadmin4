##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import time
import math

from selenium.common.exceptions import NoSuchElementException, \
    WebDriverException, StaleElementReferenceException
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
        self.timeout = 30
        self.app_start_timeout = 60

    def reset_layout(self):
        self.click_element(self.find_by_partial_link_text("File"))
        self.find_by_partial_link_text("Reset Layout").click()
        self.click_modal_ok()
        self.wait_for_reloading_indicator_to_disappear()

    def click_modal_ok(self):
        time.sleep(0.5)
        # Find active alertify dialog in case of multiple alertify dialog & click on that dialog
        self.click_element(
            self.find_by_xpath("//div[contains(@class, 'alertify') and not(contains(@class, 'ajs-hidden'))]//button[.='OK']")
        )

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

    def close_query_tool(self):
        self.driver.switch_to.default_content()
        tab = self.find_by_xpath("//*[contains(@class,'wcPanelTab') and contains(.,'" + "Query" + "')]")
        ActionChains(self.driver).context_click(tab).perform()
        self.find_by_xpath("//li[contains(@class, 'context-menu-item')]/span[contains(text(), 'Remove Panel')]").click()
        self.driver.switch_to.frame(self.driver.find_elements_by_tag_name("iframe")[0])
        time.sleep(.5)
        self.click_element(self.find_by_xpath('//button[contains(@class, "ajs-button") and contains(.,"Yes")]'))
        self.driver.switch_to.default_content()

    def close_data_grid(self):
        self.driver.switch_to_default_content()
        xpath = "//*[@id='dockerContainer']/div/div[3]/div/div[2]/div[1]"
        self.click_element(self.find_by_xpath(xpath))

    def remove_server(self, server_config):
        self.driver.switch_to.default_content()
        self.find_by_xpath("//*[@id='tree']//*[.='" + server_config['name'] + "' and @class='aciTreeItem']").click()
        self.find_by_partial_link_text("Object").click()
        self.find_by_partial_link_text("Delete/Drop").click()
        self.click_modal_ok()

    def select_tree_item(self, tree_item_text):
        self.find_by_xpath("//*[@id='tree']//*[.='" + tree_item_text + "' and @class='aciTreeItem']").click()

    def toggle_open_tree_item(self, tree_item_text):
        self.find_by_xpath("//*[@id='tree']//*[.='" + tree_item_text + "']/../*[@class='aciTreeButton']").click()

    def find_by_xpath(self, xpath):
        return self.wait_for_element(lambda driver: driver.find_element_by_xpath(xpath))

    def find_by_id(self, element_id):
        return self.wait_for_element(lambda driver: driver.find_element_by_id(element_id))

    def find_by_css_selector(self, css_selector):
        return self.wait_for_element(lambda driver: driver.find_element_by_css_selector(css_selector))

    def find_by_partial_link_text(self, link_text):
        return self._wait_for(
            'link with text "{0}"'.format(link_text),
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
        # For long text, if we try to execute send_keys and perform back to back, then the actions are
        # not executed properly as the driver can send only 50 to 60 characters. To avoid this, sleep
        # on the basis of content length.
        self.find_by_xpath(
            "//pre[contains(@class,'CodeMirror-line')]/../../../*[contains(@class,'CodeMirror-code')]").click()
        action = ActionChains(self.driver)
        action.send_keys(field_content)
        sleep_time = math.ceil(len(field_content) / 50)
        time.sleep(sleep_time)
        action.perform()
        time.sleep(1)

    def click_tab(self, tab_name):
        self.find_by_xpath("//*[contains(@class,'wcTabTop')]//*[contains(@class,'wcPanelTab') "
                           "and contains(.,'" + tab_name + "')]").click()

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

    def wait_for_reloading_indicator_to_disappear(self):
        def reloading_indicator_has_disappeared(driver):
            try:
                driver.find_element_by_id("reloading-indicator")
                return False
            except NoSuchElementException:
                return True

        self._wait_for("reloading indicator to disappear", reloading_indicator_has_disappeared)

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

        self._wait_for("app to start", page_shows_app, self.app_start_timeout)

    def _wait_for(self, waiting_for_message, condition_met_function, timeout = None):
        if timeout is None:
            timeout = self.timeout
        return WebDriverWait(self.driver, timeout, 0.01).until(condition_met_function,
                                                                    "Timed out waiting for " + waiting_for_message)

    def wait_for_element_to_stale(self, xpath):
        # Reference: http://www.obeythetestinggoat.com/
        # how-to-get-selenium-to-wait-for-page-load-after-a-click.html
        el = self.driver.find_element_by_xpath(xpath)

        def element_has_gone_stale(driver):
            try:
                # poll an arbitrary element
                el.find_elements_by_id('element-dont-exist')
                return False
            except StaleElementReferenceException:
                return True

        self._wait_for("element to attach to the page document",
                       element_has_gone_stale)
