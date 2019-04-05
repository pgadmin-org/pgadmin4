##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import time

from selenium.common.exceptions import NoSuchElementException, \
    WebDriverException, TimeoutException, NoSuchWindowException, \
    StaleElementReferenceException
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
        self.app_start_timeout = 90

    def reset_layout(self):
        attempt = 0
        while attempt < 4:
            try:
                self.click_element(self.find_by_partial_link_text("File"))
                break
            except (TimeoutException, NoSuchWindowException):
                self.driver.refresh()
                try:
                    WebDriverWait(self.driver, 3).until(EC.alert_is_present())
                    self.driver.switch_to_alert().accept()
                    attempt = attempt + 1
                except TimeoutException:
                    attempt = attempt + 1

        self.find_by_partial_link_text("Reset Layout").click()
        self.click_modal('OK')
        self.wait_for_reloading_indicator_to_disappear()

    def refresh_page(self):
        self.driver.refresh()

    def click_modal(self, button_text):
        time.sleep(0.5)
        # Find active alertify dialog in case of multiple alertify dialog
        # & click on that dialog
        modal_button = self.find_by_xpath(
            "//div[contains(@class, 'alertify') and "
            "not(contains(@class, 'ajs-hidden'))]//button[.='%s']"
            % button_text)
        self.click_element(modal_button)

    def add_server(self, server_config):
        self.find_by_xpath(
            "//*[@class='aciTreeText' and contains(.,'Servers')]").click()
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
        WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, "button[type='save'].btn.btn-primary")))
        self.find_by_css_selector("button[type='save'].btn.btn-primary").\
            click()

        self.find_by_xpath(
            "//*[@id='tree']//*[.='" + server_config['name'] + "']")

    def open_query_tool(self):
        self.driver.find_element_by_link_text("Tools").click()
        tools_menu = self.driver.find_element_by_id('mnu_tools')

        query_tool = tools_menu.find_element_by_id('query_tool')

        self.enable_menu_item(query_tool, 10)

        self.find_by_partial_link_text("Query Tool").click()

    def enable_menu_item(self, menu_item, wait_time):
        start_time = time.time()
        # wait until menu becomes enabled.
        while time.time() - start_time < wait_time:  # wait_time seconds
            # if menu is disabled then it will have
            # two classes 'dropdown-item disabled'.
            # And if menu is enabled the it will have
            # only one class 'dropdown-item'.

            if 'dropdown-item' == str(menu_item.get_attribute('class')):
                break
            time.sleep(0.1)
        else:
            assert False, "'Tools -> Query Tool' menu did not enable."

    def close_query_tool(self, prompt=True):
        self.driver.switch_to.default_content()
        tab = self.find_by_xpath(
            "//div[@class='wcPanelTab wcPanelTabActive']")
        ActionChains(self.driver).context_click(tab).perform()
        self.find_by_xpath(
            "//li[contains(@class, 'context-menu-item')]/span[contains(text(),"
            " 'Remove Panel')]").click()
        if prompt:
            self.driver.switch_to.frame(
                self.driver.find_elements_by_tag_name("iframe")[0])
            time.sleep(.5)
            self.click_element(self.find_by_xpath(
                '//button[contains(@class, "ajs-button") and '
                'contains(.,"Don\'t save")]'))
        self.driver.switch_to.default_content()

    def close_data_grid(self):
        self.driver.switch_to_default_content()
        xpath = "//*[@id='dockerContainer']/div/div[3]/div/div[2]/div[1]"
        self.click_element(self.find_by_xpath(xpath))

    def remove_server(self, server_config):
        self.driver.switch_to.default_content()
        server_to_remove = self.find_by_xpath(
            "//*[@id='tree']//*[.='" + server_config['name'] +
            "' and @class='aciTreeItem']")
        self.driver.execute_script(
            "arguments[0].scrollIntoView()", server_to_remove)
        self.click_element(server_to_remove)
        object_menu_item = self.find_by_partial_link_text("Object")
        self.click_element(object_menu_item)
        delete_menu_item = self.find_by_partial_link_text("Delete/Drop")
        self.click_element(delete_menu_item)
        self.click_modal('OK')

    def select_tree_item(self, tree_item_text):
        item = self.find_by_xpath(
            "//*[@id='tree']//*[contains(text(), '" + tree_item_text + "')]"
            "/parent::span[@class='aciTreeItem']")
        self.driver.execute_script("arguments[0].scrollIntoView()", item)
        item.click()

    def toggle_open_servers_group(self):
        """This will open Servers group to display underlying nodes"""
        self.wait_for_spinner_to_disappear()
        server_group = self.find_by_xpath(
            "//div[@id='tree']//span[@class='aciTreeItem']"
            "/span[(@class='aciTreeText') and starts-with(text(),'Servers ') "
            "or starts-with(text(), 'Servers')]")
        ActionChains(self.driver).double_click(server_group).perform()

    def toggle_open_tree_item(self, tree_item_text):
        # 'sleep' here helps in cases where underlying nodes are auto opened.
        # Otherwise, encountered situations where False value is returned
        # even if the underlying node to be clicked was Opened.
        time.sleep(.6)
        item_with_text = self.find_by_xpath(
            "//div[@id='tree']//span[@class='aciTreeItem']/span["
            "(@class='aciTreeText') and text()='" + tree_item_text + "']")

        self.driver.execute_script("arguments[0].scrollIntoView()",
                                   item_with_text)

        if item_with_text.find_element_by_xpath(
            ".//ancestor::*[@class='aciTreeLine']").get_attribute(
                "aria-expanded") == 'false':
            item = item_with_text.find_element_by_xpath(
                ".//parent::*[@class='aciTreeItem']")
            ActionChains(self.driver).double_click(item).perform()

    def toggle_open_tables_node(self):
        """The function will be used for opening Tables node only"""

        # get the element which contains 'aria-expanded' info
        tables_expansion_ele = self.find_by_xpath("//div[div[div[div[div[div"
                                                  "[div[div[span[span["
                                                  "(@class='aciTreeText') and "
                                                  "text()='Tables']]]]]]]]]]")

        if tables_expansion_ele.get_attribute('aria-expanded') == 'false':
            # button element of the Tables node to open it
            item_button = self.find_by_xpath(
                "//div[span[span[(@class='aciTreeText') and text()"
                "='Tables']]]/span[@class='aciTreeButton']")
            ActionChains(self.driver).click(item_button).perform()

    def toggle_open_server(self, tree_item_text):
        def check_for_password_dialog_or_tree_open(driver):
            try:
                dialog = driver.find_element_by_id("frmPassword")
            except WebDriverException:
                dialog = None

            try:
                database_node = driver.find_element_by_xpath(
                    "//*[@id='tree']//*[.='Databases']"
                    "/../*[@class='aciTreeButton']")
            except WebDriverException:
                database_node = None

            return dialog is not None or database_node is not None

        self.toggle_open_tree_item(tree_item_text)
        self._wait_for("Waiting for password dialog or tree to open",
                       check_for_password_dialog_or_tree_open)

        try:
            self.driver.find_element_by_id("frmPassword")
            # Enter password here if needed
            self.click_modal('OK')
        except WebDriverException:
            return

    def find_by_xpath(self, xpath):
        return self.wait_for_element(
            lambda driver: driver.find_element_by_xpath(xpath)
        )

    def find_by_id(self, element_id):
        return self.wait_for_element(
            lambda driver: driver.find_element_by_id(element_id)
        )

    def find_by_css_selector(self, css_selector):
        return self.wait_for_element(
            lambda driver: driver.find_element_by_css_selector(css_selector)
        )

    def find_by_partial_link_text(self, link_text):
        return self._wait_for(
            'link with text "{0}"'.format(link_text),
            EC.element_to_be_clickable((By.PARTIAL_LINK_TEXT, link_text))
        )

    def click_element(self, element):
        # driver must be here to adhere to the method contract in
        # selenium.webdriver.support.wait.WebDriverWait.until()
        def click_succeeded(driver):
            try:
                element.click()
                return True
            except WebDriverException:
                return False

        return self._wait_for(
            "clicking the element not to throw an exception", click_succeeded
        )

    def js_send_key(self, field, sele_key):
        keycode = None

        if sele_key in (Keys.RETURN, Keys.ENTER):
            keycode = 13
        elif sele_key == Keys.ARROW_DOWN:
            keycode = 40

        self.driver.execute_script(
            "arguments[0].dispatchEvent(new KeyboardEvent('keydown', "
            "{'keyCode':arguments[1], 'which':arguments[1]}));"
            "arguments[0].dispatchEvent(new KeyboardEvent('keypress', "
            "{'keyCode':arguments[1], 'which':arguments[1]}));"
            "arguments[0].dispatchEvent(new KeyboardEvent('keyup', "
            "{'keyCode':arguments[1], 'which':arguments[1]}));"
            "arguments[0].dispatchEvent(new Event('input'));"
            "arguments[0].dispatchEvent(new Event('change'));",
            field, keycode)

    def js_loose_focus(self, field):
        self.driver.execute_script(
            "arguments[0].dispatchEvent(new Event('blur'));", field)

    def fill_input(self, field, field_content, input_keys=False,
                   key_after_input=Keys.ARROW_DOWN):
        field.click()

        # Use send keys if input_keys true, else use javascript to set content
        if input_keys:
            backspaces = [Keys.BACKSPACE] * len(field.get_attribute('value'))
            field.send_keys(backspaces)
            field.send_keys(str(field_content))
            self.wait_for_input_by_element(field, field_content)
        else:
            self.driver.execute_script("arguments[0].value = arguments[1]",
                                       field, field_content)
            # keycode 40 is for arrow down
            self.js_send_key(field, Keys.ARROW_DOWN)

            if key_after_input:
                self.js_send_key(field, key_after_input)

    def fill_input_by_field_name(self, field_name, field_content,
                                 input_keys=False,
                                 key_after_input=Keys.ARROW_DOWN,
                                 loose_focus=False):
        field = self.find_by_css_selector(
            "input[name='" + field_name + "']:not(:disabled)")
        self.fill_input(field, field_content, input_keys=input_keys,
                        key_after_input=key_after_input)

        if loose_focus:
            self.js_loose_focus(field)

    def fill_input_by_css_selector(self, css_selector, field_content,
                                   input_keys=False,
                                   key_after_input=Keys.ARROW_DOWN,
                                   loose_focus=False):
        field = self.find_by_css_selector(css_selector)
        self.fill_input(field, field_content, input_keys=input_keys,
                        key_after_input=key_after_input)

        if loose_focus:
            self.js_loose_focus(field)

    def fill_codemirror_area_with(self, field_content, input_keys=False):
        def find_codemirror(driver):
            try:
                driver.switch_to.default_content()
                driver.switch_to_frame(
                    driver.find_element_by_tag_name("iframe"))
                element = driver.find_element_by_css_selector(
                    "#output-panel .CodeMirror")
                if element.is_displayed() and element.is_enabled():
                    return element
            except (NoSuchElementException, WebDriverException):
                return False

        codemirror_ele = WebDriverWait(
            self.driver, timeout=self.timeout, poll_frequency=0.01)\
            .until(find_codemirror,
                   "Timed out waiting for codemirror to appear")

        time.sleep(1)
        codemirror_ele.click()

        # Use send keys if input_keys true, else use javascript to set content
        if input_keys:
            action = ActionChains(self.driver)
            action.send_keys(field_content)
            action.perform()
        else:
            self.driver.execute_script(
                "arguments[0].CodeMirror.setValue(arguments[1]);"
                "arguments[0].CodeMirror.setCursor("
                "arguments[0].CodeMirror.lineCount(),0);",
                codemirror_ele, field_content)

    def click_tab(self, tab_name):
        WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable(
            (By.XPATH, "//*[contains(@class,'wcTabTop')]//"
                       "*[contains(@class,'wcPanelTab') "
                       "and contains(.,'" + tab_name + "')]")))

        tab = self.find_by_xpath("//*[contains(@class,'wcTabTop')]//"
                                 "*[contains(@class,'wcPanelTab') "
                                 "and contains(.,'" + tab_name + "')]")

        self.click_element(tab)

    def wait_for_input_by_element(self, element, content):
        def input_field_has_content(driver):
            return str(content) == element.get_attribute('value')

        return self._wait_for(
            "field to contain '" + str(content) + "'", input_field_has_content
        )

    def wait_for_input_field_content(self, field_name, content, wait=1):
        def input_field_has_content(driver):
            element = driver.find_element_by_xpath(
                "//input[@name='" + field_name + "']")

            return str(content) == element.get_attribute('value')

        return self._wait_for(
            "field to contain '" + str(content) + "'", input_field_has_content,
            wait)

    def check_if_element_exist_by_xpath(self, xpath, timeout=5):
        """This function will verify if an element exist and on that basis
        will return True or False. Will handle exception internally"""
        element_found = False
        try:
            WebDriverWait(self.driver, timeout, .01).until(
                EC.visibility_of_element_located((By.XPATH, xpath)))
            element_found = True
        except Exception as e:
            pass
        return element_found

    def wait_for_element(self, find_method_with_args):
        def element_if_it_exists(driver):
            try:
                element = find_method_with_args(driver)
                if element.is_displayed() and element.is_enabled():
                    return True
            except (NoSuchElementException, StaleElementReferenceException):
                return False

        self._wait_for("element to exist", element_if_it_exists)
        return find_method_with_args(self.driver)

    def wait_for_element_to_disappear(self, find_method_with_args):
        def element_if_it_disappears(driver):
            try:
                element = find_method_with_args(driver)
                if element.is_displayed() and element.is_enabled():
                    return False

                return True
            except NoSuchElementException:
                return True

        return self._wait_for("element to disappear", element_if_it_disappears)

    def wait_for_reloading_indicator_to_disappear(self):
        def reloading_indicator_has_disappeared(driver):
            try:
                driver.find_element_by_id("reloading-indicator")
                return False
            except NoSuchElementException:
                return True

        self._wait_for("reloading indicator to disappear",
                       reloading_indicator_has_disappeared)

    def wait_for_spinner_to_disappear(self):
        def spinner_has_disappeared(driver):
            try:
                driver.find_element_by_id("pg-spinner")
                return False
            except NoSuchElementException:
                return True

        self._wait_for("spinner to disappear", spinner_has_disappeared)

    def wait_for_query_tool_loading_indicator_to_disappear(self):
        def spinner_has_disappeared(driver):
            try:
                spinner = driver.find_element_by_css_selector(
                    "#editor-panel .pg-sp-container"
                )
                return "d-none" in spinner.get_attribute("class")
            except NoSuchElementException:
                # wait for loading indicator disappear animation to complete.
                time.sleep(0.5)
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

    def wait_for_element_to_reload(self, element_selector):
        WebDriverWait(self.driver, 20) \
            .until(EC.staleness_of(element_selector(self.driver)))
        WebDriverWait(self.driver, 20) \
            .until_not(EC.staleness_of(element_selector(self.driver)))

        return element_selector(self.driver)

    def _wait_for(self, waiting_for_message, condition_met_function,
                  timeout=3):
        if timeout is None:
            timeout = self.timeout
        return WebDriverWait(self.driver, timeout, 0.01).until(
            condition_met_function,
            "Timed out waiting for " + waiting_for_message
        )
