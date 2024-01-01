##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import time
import sys

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, \
    WebDriverException, TimeoutException, NoSuchWindowException, \
    StaleElementReferenceException, ElementNotInteractableException
from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from regression.feature_utils.locators import QueryToolLocators, \
    NavMenuLocators, ConnectToServerDiv, PropertyDialogueLocators
from regression.feature_utils.tree_area_locators import TreeAreaLocators


class PgadminPage:
    """
    Helper class for interacting with the page, given a selenium driver
    """
    # Common argument passed for scrolling
    js_executor_scrollintoview_arg = "arguments[0].scrollIntoView()"

    def __init__(self, driver, app_config):
        self.driver = driver
        self.app_config = app_config
        self.timeout = 30
        self.app_start_timeout = 90

    # pgAdmin related methods
    def login_to_app(self, user_detail):
        self.driver.switch_to.default_content()
        if not (self.check_if_element_exist_by_css_selector(
                'button[data-test="loggedin-username"]', 1)):
            user_edt_box_el = self.driver.find_element(By.NAME, 'email')
            user_edt_box_el.send_keys(user_detail['login_username'])
            password_edt_box_el = self.driver.find_element(By.NAME, 'password')
            password_edt_box_el.send_keys(user_detail['login_password'])
            submit_btn = self.driver.find_element(
                By.XPATH, '//button[@value="Login"]')
            submit_btn.click()
            self.wait_for_spinner_to_disappear()

    def reset_layout(self):
        attempt = 0
        while attempt < 4:
            try:
                self.click_element(self.find_by_css_selector(
                    "button[data-label='File']"))
                break
            except (TimeoutException, NoSuchWindowException):
                self.driver.refresh()
                try:
                    WebDriverWait(self.driver, 3).until(EC.alert_is_present())
                    self.driver.switch_to.alert.accept()
                    attempt = attempt + 1
                except TimeoutException:
                    attempt = attempt + 1

        self.click_element(self.find_by_css_selector(
            "li[data-label='Reset Layout']"))
        self.click_modal('Yes', docker=True)
        confirmation_alert = True
        try:
            WebDriverWait(self.driver, 1).until(EC.alert_is_present())
        except TimeoutException:
            confirmation_alert = False

        if confirmation_alert:
            self.driver.switch_to.alert.accept()
        self.wait_for_reloading_indicator_to_disappear()

    def refresh_page(self):
        try:
            self.driver.refresh()
            # wait until alert is present
            WebDriverWait(self.driver, 1).until(EC.alert_is_present())

            # switch to alert and accept it
            self.driver.switch_to.alert.accept()
        except TimeoutException:
            pass

    def click_modal(self, button_text, docker=False):
        time.sleep(0.5)
        # Find active dialog in case of multiple dialog
        # & click on that dialog

        # In case of react dialog we use different xpath
        if docker:
            modal_button = self.find_by_css_selector(
                ".dock-fbox button[data-label='{}']".format(button_text))
        else:
            modal_button = self.find_by_css_selector(
                ".MuiDialog-root button[data-label='{}']".format(button_text))

        self.click_element(modal_button)

    def add_server(self, server_config):
        server_group_node = \
            self.find_by_xpath(TreeAreaLocators.server_group_node("Servers"))
        ActionChains(self.driver).context_click(server_group_node).perform()
        ActionChains(self.driver).move_to_element(self.find_by_css_selector(
            TreeAreaLocators.context_menu_element('Register'))).perform()
        ActionChains(self.driver).move_to_element(self.find_by_css_selector(
            TreeAreaLocators.context_menu_element('Server...'))) \
            .click().perform()

        WebDriverWait(self.driver, 5).until(EC.visibility_of_element_located(
            (By.XPATH, PropertyDialogueLocators.server_dialogue_title)))

        # After server dialogue opens
        self.fill_input_by_field_name(
            "name", server_config['name'], input_keys=True)
        self.find_by_xpath(
            PropertyDialogueLocators.server_connection_tab).click()
        self.fill_input_by_field_name(
            "host", server_config['host'], input_keys=True)
        self.fill_input_by_field_name(
            "port", server_config['port'], input_keys=True)
        self.fill_input_by_field_name(
            "username", server_config['username'], input_keys=True)
        self.fill_input_by_field_name(
            "password", server_config['db_password'], input_keys=True)

        save_btn = WebDriverWait(self.driver, 5).until(
            EC.element_to_be_clickable(
                (By.XPATH, PropertyDialogueLocators.server_tab_save)))
        save_btn.click()

        server_tree_xpath = TreeAreaLocators.server_node(server_config['name'])
        try:
            WebDriverWait(self.driver, 10).until(
                EC.visibility_of_element_located(
                    (By.XPATH, server_tree_xpath)))
        except TimeoutException:
            self.expand_server_group_node("Server")
            WebDriverWait(self.driver, 10).until(
                EC.visibility_of_element_located(
                    (By.XPATH, server_tree_xpath)))

    def open_query_tool(self):
        self.click_element(self.find_by_css_selector(
            "button[data-label='Tools']"))
        self.click_element(self.find_by_css_selector(
            "li[data-label='Query Tool']"))

        self.wait_for_element_to_be_visible(
            self.driver, "//div[@id='btn-conn-status']", 5)

    def open_view_data(self, table_name):
        self.click_element(self.find_by_css_selector(
            NavMenuLocators.object_menu_css))

        ActionChains(
            self.driver
        ).move_to_element(
            self.driver.find_element(
                By.CSS_SELECTOR, NavMenuLocators.view_data_link_css)
        ).perform()
        self.click_element(self.find_by_css_selector(
            "li[data-label='All Rows']"))
        time.sleep(1)
        # wait until datagrid frame is loaded.

        self.click_tab(table_name)

        WebDriverWait(self.driver, self.timeout).until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, 'iframe')
            ), "Timed out waiting for div element to appear"
        )
        self.driver.switch_to.frame(
            self.driver.find_element(By.TAG_NAME, 'iframe')
        )

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
        time.sleep(.5)
        self.find_by_css_selector("div[data-dockid='id-main'] "
                                  ".dock-tab.dock-tab-active "
                                  "button[data-label='Close']").click()
        if prompt:
            self.driver.switch_to.frame(
                self.driver.find_elements(By.TAG_NAME, "iframe")[0])
            time.sleep(.5)
            self.find_by_css_selector("button[data-test='dont-save']").click()

            if self.check_if_element_exist_by_xpath(
                    "//button[text()='Rollback']", 1):
                self.click_element(
                    self.find_by_xpath("//button[text()='Rollback']"))
        self.driver.switch_to.default_content()

    def clear_query_tool(self):
        retry = 3
        edit_options = self.find_by_css_selector(
            QueryToolLocators.btn_edit_dropdown)
        while retry > 0:
            self.click_element(edit_options)
            time.sleep(0.3)
            if edit_options.get_attribute("data-state") == "open":
                break
            else:
                retry -= 1

        ActionChains(self.driver).move_to_element(
            self.find_by_css_selector(QueryToolLocators.btn_clear)).perform()
        self.click_element(
            self.find_by_css_selector(QueryToolLocators.btn_clear)
        )
        self.click_modal('Yes')

    def execute_query(self, query):
        self.fill_codemirror_area_with(query)
        self.click_execute_query_button()

    def click_execute_query_button(self, timeout=20):
        execute_button = self.find_by_css_selector(
            QueryToolLocators.btn_execute_query_css)
        execute_button.click()
        self.wait_for_query_tool_loading_indicator_to_disappear(timeout)

    def check_execute_option(self, option):
        """"This function will check auto commit or auto roll back based on
        user input. If button is already checked, no action will be taken"""
        if option == 'auto_commit':
            self._update_execute_option_setting(
                QueryToolLocators.btn_auto_commit, True)
        if option == 'auto_rollback':
            self._update_execute_option_setting(
                QueryToolLocators.btn_auto_rollback, True)

    def _update_drop_down_options(self, css_selector_of_option, is_selected):
        is_selected = 'true' if is_selected else 'false'
        retry = 3
        option_set_as_required = False
        menu_option = self.driver.find_element(By.CSS_SELECTOR,
                                               css_selector_of_option)
        while retry > 0:
            if menu_option.get_attribute('data-checked') == is_selected:
                # Nothing to do
                option_set_as_required = True
                break
            else:
                menu_option.click()
                time.sleep(0.2)
                if menu_option.get_attribute('data-checked') == is_selected:
                    option_set_as_required = True
                    break
                else:
                    retry -= 1
        return option_set_as_required

    def _open_query_tool_bar_drop_down(self, css_selector_of_dd):
        menu_drop_down_opened = False
        retry = 5
        while retry > 0:
            dd_btn = self.driver.find_element(
                By.CSS_SELECTOR, css_selector_of_dd)
            if dd_btn.get_attribute('data-state') == "closed":
                dd_btn.click()
                time.sleep(0.2)
                if dd_btn.get_attribute('data-state') == "open":
                    menu_drop_down_opened = True
                    retry = 0
                else:
                    retry -= 1
                    self.driver.find_element(
                        By.CSS_SELECTOR, "button[data-label='Macros']").click()
                    dd_btn = self.driver.find_element(
                        By.CSS_SELECTOR, css_selector_of_dd)
                    action = ActionChains(self.driver)
                    action.move_to_element(dd_btn).perform()
                    action.click(dd_btn).perform()
            else:
                menu_drop_down_opened = True
                retry = 0
        return menu_drop_down_opened

    def _update_execute_option_setting(self,
                                       css_selector_of_option, is_selected):
        if self._open_query_tool_bar_drop_down(
                QueryToolLocators.btn_query_dropdown):
            return self._update_drop_down_options(
                css_selector_of_option, is_selected)
        else:
            return False

    def uncheck_execute_option(self, option):
        """"This function will uncheck auto commit or auto roll back based on
        user input. If button is already unchecked, no action will be taken"""
        if option == 'auto_commit':
            return self._update_execute_option_setting(
                QueryToolLocators.btn_auto_commit, False)
        if option == 'auto_rollback':
            return self._update_execute_option_setting(
                QueryToolLocators.btn_auto_rollback, False)

    def open_explain_options(self):
        return self._open_query_tool_bar_drop_down(
            QueryToolLocators.btn_explain_options_dropdown)

    def remove_server(self, server_config):
        self.driver.switch_to.default_content()
        server_to_remove = self.check_if_element_exists_with_scroll(
            TreeAreaLocators.server_node(server_config['name']))
        if server_to_remove:
            self.driver.execute_script(
                self.js_executor_scrollintoview_arg, server_to_remove)
            self.click_element(server_to_remove)
            self.click_element(self.find_by_css_selector(
                "button[data-label='Object']"))
            self.click_element(self.find_by_css_selector(
                "li[data-label='Remove Server']"))
            self.driver.switch_to.default_content()
            self.click_modal('Yes')
            time.sleep(1)
        else:
            print(server_config['name'] + " server is not removed",
                  file=sys.stderr)

    def click_to_expand_tree_node(self, tree_node_web_element,
                                  tree_node_exp_check_xpath,
                                  schema_child_node_expand_icon_xpath=None):
        """
        Method clicks passed webelement to expand specified tree node
        :param tree_node_web_element:
        :param tree_node_exp_check_xpath:
        :param schema_child_node_expand_icon_xpath:
        :return: True is tree_node_exp_check_xpath present in DOM else false
        """
        retry = 2
        while retry > 0:
            try:
                if retry == 1:
                    webdriver.ActionChains.click(
                        schema_child_node_expand_icon_xpath).perform()
                else:
                    webdriver.ActionChains(self.driver).double_click(
                        tree_node_web_element).perform()
                if self.check_if_element_exist_by_xpath(
                        tree_node_exp_check_xpath):
                    return True
                elif retry == 1:
                    return False
                else:
                    time.sleep(1)
                    retry -= 1
            except Exception:
                retry -= 1

    def expand_server_group_node(self, server_group_name):
        """
        Expands specified server group
        :param server_group_name:
        :return: True is server group is expanded else false
        """
        server_group_expanded = False
        self.wait_for_spinner_to_disappear()
        server_group_node_xpath = \
            TreeAreaLocators.server_group_node(server_group_name)
        server_group_node_exp_status_xpath = \
            TreeAreaLocators.server_group_node_exp_status(server_group_name)
        server_group_node = self.check_if_element_exists_with_scroll(
            server_group_node_xpath)

        if server_group_node:
            if self.check_if_element_exist_by_xpath(
                    server_group_node_exp_status_xpath, 1):
                server_group_expanded = True
            else:
                server_group_expanded = self.click_to_expand_tree_node(
                    server_group_node, server_group_node_exp_status_xpath)
                if server_group_expanded:
                    server_group_expanded = True
                else:
                    print("(expand_server_group_node)The Server Group node is "
                          "clicked to expand but it is not expanded",
                          file=sys.stderr)
        else:
            print("(expand_server_group_node)The Server Group node not found",
                  file=sys.stderr)
        return server_group_expanded

    def expand_server_node(self, server_group_name, server_name,
                           server_password):
        """
        Method expands specified server node
        :param server_group_name: containing server
        :param server_name:
        :param server_password:
        :return: true if server node is expanded else false
        """
        server_expanded = False
        server_node_xpath = TreeAreaLocators.server_node(server_name)
        server_node_exp_status_xpath = \
            TreeAreaLocators.server_node_exp_status(server_name)
        if self.expand_server_group_node(server_group_name):
            server_node = \
                self.check_if_element_exists_with_scroll(server_node_xpath)
            if server_node:
                self.driver.execute_script(
                    self.js_executor_scrollintoview_arg, server_node)
                if self.check_if_element_exist_by_xpath(
                        server_node_exp_status_xpath, 2):
                    # sleep for a while to expand tree completely
                    time.sleep(0.4)
                    server_expanded = True
                else:
                    server_expanded = self.click_expand_server_node(
                        server_name, server_password, server_node)
                    if not server_expanded:
                        print("(expand_server_node)The Server node is not "
                              "expanded", file=sys.stderr)
            else:
                print("(expand_server_node)The Server node not found",
                      file=sys.stderr)
        else:
            print("The server group node is not expanded", file=sys.stderr)
        return server_expanded

    def click_expand_server_node(self, server_name, server_password,
                                 server_node):
        """
        Method actually clicks on server node to expand
        :param server_name:
        :param server_password:
        :param server_node:
        :return: True is click action is successful & server node expanded
        """
        server_node_expansion_status = False
        if self.check_server_is_connected(server_name):
            if self.check_if_element_exist_by_xpath(
                    TreeAreaLocators.server_node_exp_status(server_name), 1):
                server_node_expansion_status = True
            else:
                # if server is connected but not expanded
                webdriver.ActionChains(self.driver).double_click(
                    server_node).perform()
                if self.check_if_element_exist_by_xpath(
                        TreeAreaLocators.server_node_exp_status(server_name),
                        10):
                    server_node_expansion_status = True
        else:
            if self.click_and_connect_server(server_name, server_password):
                server_node_expansion_status = True
            else:
                print("(expand_server_node)The server node is not expanded",
                      file=sys.stderr)
        return server_node_expansion_status

    def check_server_is_connected(self, server_name):
        """
        This will check connected status of a server"
        :param server_name:
        :return: true if server is connected
        """
        server_connected = False
        try:
            server_connection_status_element = self.find_by_xpath(
                TreeAreaLocators.server_connection_status_element(server_name))
            server_class = server_connection_status_element.get_attribute(
                'class')
            if server_class == 'icon-pg' or server_class == 'icon-ppas':
                server_connected = True
        except Exception as e:
            print("There is some exception thrown in the function "
                  "check_server_is_connected and is: " + str(e),
                  file=sys.stderr)
        return server_connected

    def click_and_connect_server(self, server_name, password):
        """
        Method will connect to server with password
        :param server_name:
        :param password:
        :return:
        """
        server_connection_status = False
        try:
            server_node_ele = self.find_by_xpath(
                TreeAreaLocators.server_node(server_name))
            webdriver.ActionChains(self.driver). \
                double_click(server_node_ele).perform()
            if self.check_if_element_exist_by_xpath(
                    ConnectToServerDiv.ok_button):
                field = self.find_by_xpath(
                    ConnectToServerDiv.password_field)
                self.fill_input(field, password)
                self.find_by_xpath(ConnectToServerDiv.ok_button).click()
                self.wait_for_element_to_disappear(
                    lambda driver: driver.find_element(
                        By.XPATH, ConnectToServerDiv.ok_button))
                if self.check_if_element_exist_by_xpath(
                        ConnectToServerDiv.error_message, 2):
                    print(
                        "While entering password in click_and_connect_server "
                        "function, error is occurred : " + str(
                            self.find_by_xpath(
                                ConnectToServerDiv.error_message).text),
                        file=sys.stderr)
                else:
                    server_connection_status = True
        except Exception as e:
            print(
                "There is some exception thrown click_and_connect_server "
                "and is: " + str(
                    e), file=sys.stderr)
        return server_connection_status

    def expand_databases_node(self, server_group_name, server_name,
                              server_password):
        """
        Method expands Databases node of specfied server
        :param server_group_name:
        :param server_name:
        :param server_password:
        :return:
        """
        return self.expand_server_child_node(server_group_name, server_name,
                                             server_password, "Databases")

    def expand_server_child_node(self, server_group_name, server_name,
                                 server_password, server_child_node_name):
        """
        Method expands specified server node's child
        :param server_group_name:
        :param server_name:
        :param server_password:
        :param server_child_node_name: to be expanded
        :return: true is child node is expanded else false
        """
        server_child_expanded = False
        server_child_node_xpath = TreeAreaLocators. \
            server_child_node(server_name, server_child_node_name)
        server_child_node_exp_status_xpath = TreeAreaLocators. \
            server_child_node_exp_status(server_name, server_child_node_name)

        if self.expand_server_node(server_group_name, server_name,
                                   server_password):
            if self.check_if_element_exist_by_xpath(
                    server_child_node_exp_status_xpath, 1):
                server_child_expanded = True
            else:
                # Check for child node element
                child_node_ele = self.check_if_element_exists_with_scroll(
                    server_child_node_xpath)
                # If child node element present try to expand it by clicking
                # and if click and expansion is successful, return True
                if child_node_ele:
                    server_child_expanded = self.click_to_expand_tree_node(
                        child_node_ele, server_child_node_exp_status_xpath)
                if not child_node_ele or not server_child_expanded:
                    # As child node element is not expanded,
                    # collapse database node
                    databases_node_xpath = TreeAreaLocators.server_child_node(
                        server_name, 'Databases')
                    databases_node = self.check_if_element_exists_with_scroll(
                        databases_node_xpath)
                    webdriver.ActionChains(self.driver).move_to_element(
                        databases_node).perform()
                    webdriver.ActionChains(self.driver).double_click(
                        databases_node).perform()
                    child_node_ele = self.check_if_element_exists_with_scroll(
                        server_child_node_xpath)
                    server_child_expanded = self.click_to_expand_tree_node(
                        child_node_ele, server_child_node_exp_status_xpath)

                if not server_child_expanded:
                    print("Child is not expanded after clicking ",
                          file=sys.stderr)
                return server_child_expanded
        else:
            print("The server/previous nodes not expanded", file=sys.stderr)
        return server_child_expanded

    def expand_database_node(self, server_group_name, server_name,
                             server_password, database_name):
        """
        will expand database node under databases node"
        :param server_group_name:
        :param server_name:
        :param server_password:
        :param database_name:
        :return:
        """
        database_expanded = False
        database_node_xpath = TreeAreaLocators.database_node(database_name)
        database_node_exp_xpath = \
            TreeAreaLocators.database_node_exp_status(database_name)

        if self.expand_databases_node(
                server_group_name, server_name, server_password):
            database_node = \
                self.check_if_element_exists_with_scroll(database_node_xpath)
            if database_node:
                database_node.click()
                self.driver.execute_script(
                    self.js_executor_scrollintoview_arg, database_node)
                if self.check_if_element_exist_by_xpath(
                        database_node_exp_xpath, 1):
                    database_expanded = True
                else:
                    database_expanded = self.click_to_expand_tree_node(
                        database_node, database_node_exp_xpath)
            else:
                print("Database node not found - ", file=sys.stderr)
        else:
            print("The databases/previous nodes not expanded", file=sys.stderr)
        return database_expanded

    def expand_database_child_node(self, server_group_name, server_name,
                                   server_password, database_name,
                                   database_child_node_name):
        """
        Method expands specified database's child
        :param server_group_name:
        :param server_name:
        :param server_password:
        :param database_name:
        :param database_child_node_name:
        :return:
        """
        database_child_expanded = False
        database_child_node_xpath = \
            TreeAreaLocators.database_child_node(
                database_name, database_child_node_name)
        database_child_node_exp_status_xpath = \
            TreeAreaLocators.database_child_node_exp_status(
                database_name, database_child_node_name)

        if self.expand_database_node(server_group_name, server_name,
                                     server_password, database_name):
            child_node_ele = self.check_if_element_exists_with_scroll(
                database_child_node_xpath)
            if child_node_ele:
                if self.check_if_element_exist_by_xpath(
                        database_child_node_exp_status_xpath, 1):
                    database_child_expanded = True
                else:
                    database_child_expanded = self.click_to_expand_tree_node(
                        child_node_ele, database_child_node_exp_status_xpath)
            else:
                print("Node not found - ", database_child_node_name,
                      file=sys.stderr)
        else:
            print("The database/previous nodes not expanded", file=sys.stderr)
        return database_child_expanded

    def expand_schemas_node(self, server_group_name, server_name,
                            server_password, database_name):
        """
        Method expands Schemas node under specified server & database
        :param server_group_name:
        :param server_name:
        :param server_password:
        :param database_name:
        :return:
        """
        return self.expand_database_child_node(server_group_name, server_name,
                                               server_password, database_name,
                                               "Schemas")

    def expand_schema_node(self, server_group_name, server_name,
                           server_password, database_name, schema_name):
        """
        Method expands schema node
        :param server_group_name:
        :param server_name:
        :param server_password:
        :param database_name:
        :param schema_name:
        :return:
        """
        schema_expanded = False
        schema_node_xpath = TreeAreaLocators.schema_node(schema_name)
        schema_node_exp_xpath = TreeAreaLocators.schema_node_exp_status(
            schema_name)

        if self.expand_schemas_node(server_group_name, server_name,
                                    server_password, database_name):
            schema_node = self.check_if_element_exists_with_scroll(
                schema_node_xpath)
            if schema_node:
                self.driver.execute_script(
                    self.js_executor_scrollintoview_arg, schema_node)
                if self.check_if_element_exist_by_xpath(
                        schema_node_exp_xpath, 1):
                    schema_expanded = True
                else:
                    schema_expanded = self.click_to_expand_tree_node(
                        schema_node, schema_node_exp_xpath)
            else:
                print("Schema node not found - ", file=sys.stderr)
        else:
            print("The schemas/previous nodes not expanded", file=sys.stderr)
        return schema_expanded

    def expand_tables_node(self, server_group, server_name, server_password,
                           database_name, schema_name):
        """
        Method expands tables nodes under schema
        :param server_group:
        :param server_name:
        :param server_password:
        :param database_name:
        :param schema_name:
        :return:
        """
        return self.expand_schema_child_node(server_group, server_name,
                                             server_password, database_name,
                                             schema_name, "Tables")

    def expand_schema_child_node(self, server_group_name, server_name,
                                 server_password, database_name, schema_name,
                                 schema_child_node_name):
        """
        Expands specified child node of schema
        :param server_group_name:
        :param server_name:
        :param server_password:
        :param database_name:
        :param schema_name:
        :param schema_child_node_name:
        :return:
        """
        schema_child_expanded = False
        schema_child_node_xpath = TreeAreaLocators. \
            schema_child_node(schema_name, schema_child_node_name)
        schema_child_node_expand_icon_xpath = TreeAreaLocators. \
            schema_child_node(schema_name, schema_child_node_name)
        schema_child_node_exp_status_check_xpath = TreeAreaLocators. \
            schema_child_node_exp_status(schema_name, schema_child_node_name)
        if self.expand_schema_node(server_group_name, server_name,
                                   server_password, database_name,
                                   schema_name):
            child_node_ele = self.check_if_element_exists_with_scroll(
                schema_child_node_xpath)
            if child_node_ele:
                if self.check_if_element_exist_by_xpath(
                        schema_child_node_exp_status_check_xpath, 1):
                    schema_child_expanded = True
                else:
                    schema_child_expanded = self.click_to_expand_tree_node(
                        child_node_ele,
                        schema_child_node_exp_status_check_xpath,
                        schema_child_node_expand_icon_xpath)
            else:
                print("%s node not found - ", schema_child_node_name,
                      file=sys.stderr)
        else:
            print("The schema/previous nodes not expanded", file=sys.stderr)
        return schema_child_expanded

    def find_by_xpath(self, xpath):
        return self.wait_for_element(
            lambda driver: driver.find_element(By.XPATH, xpath)
        )

    def find_by_id(self, element_id):
        return self.wait_for_element(
            lambda driver: driver.find_element(By.ID, element_id)
        )

    def find_by_css_selector(self, css_selector):
        return self.wait_for_element(
            lambda driver: driver.find_element(By.CSS_SELECTOR, css_selector)
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
        try:
            attempt = 0
            for attempt in range(0, 3):
                field.click()
                break
        except Exception as e:
            time.sleep(.2)
            if attempt == 2:
                raise e
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
            "input[name='" + field_name + "']:read-write")
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
                driver.switch_to.frame(
                    driver.find_element(By.TAG_NAME, "iframe"))
                element = driver.find_element(
                    By.CSS_SELECTOR, "#sqleditor-container .CodeMirror")
                if element.is_displayed() and element.is_enabled():
                    return element
            except (NoSuchElementException, WebDriverException):
                return False

        time.sleep(1)
        # self.wait_for_query_tool_loading_indicator_to_disappear(12)

        retry = 2
        while retry > 0:
            try:
                self.driver.switch_to.default_content()
                WebDriverWait(self.driver, 10).until(
                    EC.frame_to_be_available_and_switch_to_it(
                        (By.TAG_NAME, "iframe")))
                self.find_by_css_selector(
                    "div.dock-tab-btn[id$=\"id-query\"]").click()
                # self.find_by_xpath("//div[text()='Query Editor']").click()

                codemirror_ele = WebDriverWait(
                    self.driver, timeout=self.timeout, poll_frequency=0.01) \
                    .until(find_codemirror,
                           "Timed out waiting for codemirror to appear")
                codemirror_ele.click()
                retry = 0
            except WebDriverException as e:
                print("Exception in filling code mirror {0} ".format(retry),
                      file=sys.stderr)
                print(str(e))
                if retry == 1:
                    raise e
                retry -= 1

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
        tab = self.find_by_css_selector(
            NavMenuLocators.select_tab.format(tab_name))
        self.click_element(tab)
        time.sleep(0.5)

    def wait_for_input_by_element(self, element, content):
        def input_field_has_content(driver):
            return str(content) == element.get_attribute('value')

        return self._wait_for(
            "field to contain '" + str(content) + "'", input_field_has_content
        )

    def wait_for_input_field_content(self, field_name, content, wait=1):
        def input_field_has_content(driver):
            element = driver.find_element(
                By.XPATH, "//input[@name='" + field_name + "']")

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
        except Exception:
            pass
        return element_found

    def check_if_element_exist_by_css_selector(self, selector, timeout=5):
        """This function will verify if an element exist and on that basis
        will return True or False. Will handle exception internally"""
        element_found = False
        try:
            WebDriverWait(self.driver, timeout, .01).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, selector)))
            element_found = True
        except Exception:
            pass
        return element_found

    def wait_for_element(self, find_method_with_args):
        def element_if_it_exists(driver):
            try:
                element = find_method_with_args(driver)
                if element.is_displayed():
                    return True
            except (NoSuchElementException, StaleElementReferenceException):
                return False

        self._wait_for("element to exist", element_if_it_exists)
        return find_method_with_args(self.driver)

    def wait_for_element_to_disappear(self, find_method_with_args, timeout=5):
        def element_if_it_disappears(driver):
            try:
                element = find_method_with_args(driver)
                if element.is_displayed() and element.is_enabled():
                    return False

                return True
            except (NoSuchElementException, StaleElementReferenceException):
                return True

        return self._wait_for("element to disappear",
                              element_if_it_disappears, timeout)

    def wait_for_reloading_indicator_to_disappear(self):
        def reloading_indicator_has_disappeared(driver):
            try:
                driver.find_element(By.ID, "reloading-indicator")
                return False
            except NoSuchElementException:
                return True

        self._wait_for("reloading indicator to disappear",
                       reloading_indicator_has_disappeared)

    def wait_for_spinner_to_disappear(self):
        def spinner_has_disappeared(driver):
            try:
                driver.find_element(By.ID, "pg-spinner")
                return False
            except NoSuchElementException:
                return True

        self._wait_for("spinner to disappear", spinner_has_disappeared, 20)

    def wait_for_query_tool_loading_indicator_to_disappear(
            self, timeout=20, container_id="id-dataoutput"):
        def spinner_has_disappeared(driver):
            try:
                # Refer the status message as spinner appears only on the
                # the data output panel
                driver.find_element(
                    By.CSS_SELECTOR,
                    "#{0} div[data-label='loader']".format(container_id))
                return False
            except NoSuchElementException:
                # wait for loading indicator disappear animation to complete.
                time.sleep(0.5)
                return True

        self._wait_for(
            "spinner to disappear", spinner_has_disappeared, timeout)

    def wait_for_query_tool_loading_indicator_to_appear(self):
        status = self.check_if_element_exist_by_xpath(
            "//div[@id='id-dataoutput']//div[@data-label='loader']", 1)
        return status

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
                  timeout=5):
        if timeout is None:
            timeout = self.timeout
        return WebDriverWait(self.driver, timeout, 0.01).until(
            condition_met_function,
            "Timed out waiting for " + waiting_for_message
        )

    def wait_for_elements(self, find_method_with_args):
        """Using xpath, it will wait for elements"""
        def element_if_it_exists(driver):
            try:
                element = find_method_with_args(driver)
                if len(element) > 0 and element[0].is_displayed() and \
                        element[0].is_enabled():
                    return element
            except NoSuchElementException:
                return False

        return self._wait_for("element to exist", element_if_it_exists)

    def wait_for_elements_to_appear(self, driver, locator, time_value=20):
        """This will wait until list of elements or an element is visible,
        The time out value is userdefined"""
        elements_located_status = False
        try:
            if WebDriverWait(driver, time_value).until(
                EC.visibility_of_any_elements_located((
                    By.XPATH, locator))):
                elements_located_status = True
        except Exception:
            pass
        return elements_located_status

    def check_if_element_exists_with_scroll(self, xpath):
        f_scroll, r_scroll = 111, 111
        while f_scroll > 0 or r_scroll > 0:
            try:
                ele = WebDriverWait(self.driver, 1, 0.01).until(
                    lambda d: d.find_element(By.XPATH, xpath))
                f_scroll, r_scroll = 0, 0
                webdriver.ActionChains(self.driver).move_to_element(ele).\
                    perform()
                return ele
            except (TimeoutException, NoSuchElementException):
                tree_height = int((self.driver.find_element(
                    By.XPATH, "//div[@class='file-tree']/div[1]/div/div").
                    value_of_css_property('height')).split("px")[0])

                if f_scroll == 111 and r_scroll == 111:
                    window_size = int(self.driver.get_window_size()["height"])
                    f_scroll = r_scroll = (tree_height / window_size + 1)

                if f_scroll > 0:
                    bottom_ele = self.driver.find_element(
                        By.XPATH,
                        "//div[@id='id-object-explorer']"
                        "/div/div/div/div/div[last()]")
                    bottom_ele_location = int(
                        bottom_ele.value_of_css_property('top').split("px")[0])

                    if tree_height - bottom_ele_location < 25:
                        f_scroll = 0
                    else:
                        self.driver.execute_script(
                            self.js_executor_scrollintoview_arg, bottom_ele)
                        f_scroll -= 1
                elif r_scroll > 0:
                    top_el = self.driver.find_element(
                        By.XPATH,
                        "//div[@id='id-object-explorer']"
                        "/div/div/div/div/div[1]")
                    top_el_location = int(
                        top_el.value_of_css_property('top').split("px")[0])

                    if (tree_height - top_el_location) == tree_height:
                        r_scroll = 0
                    else:
                        webdriver.ActionChains(self.driver).move_to_element(
                            top_el).perform()
                        r_scroll -= 1
                else:
                    break
        else:
            print("check_if_element_exists_with_scroll > Element NOT found" +
                  xpath, file=sys.stderr)
            return False

    def find_by_xpath_list(self, xpath):
        """This will find out list of elements through a single xpath"""
        return self.wait_for_elements(
            lambda driver: driver.find_elements(By.XPATH, xpath))

    def set_switch_box_status(self, switch_box, required_status):
        """it will change switch box status to required one. Two elements
        of the switch boxes are to be provided i) button which is needed to
         toggle ii) Yes for True or No for False"""
        status_changed_successfully = False
        switch_box_element = self.find_by_xpath(switch_box)

        if required_status == 'Yes':
            status_changed_successfully = \
                self.toggle_switch_box(
                    switch_box_element,
                    expected_attr_in_class_tag='Mui-checked',
                    unexpected_attr_in_class_tag='')
        else:
            status_changed_successfully = \
                self.toggle_switch_box(
                    switch_box_element, expected_attr_in_class_tag='',
                    unexpected_attr_in_class_tag='Mui-checked')
        return status_changed_successfully

    def toggle_switch_box(self, switch_box_ele, expected_attr_in_class_tag,
                          unexpected_attr_in_class_tag):
        """
        Method toggles switch box status using attributes from class tag
        :param switch_box_ele:
        :param expected_attr_in_class_tag: e.g. 'off', success
        :param unexpected_attr_in_class_tag: e.g. 'off', success
        :return: True if class tag attribute is to expected attribute value
        in class tag.
        """
        status_changed = False
        if unexpected_attr_in_class_tag in switch_box_ele.get_attribute(
                "class"):
            switch_box_ele.click()
            time.sleep(1)
            if expected_attr_in_class_tag in switch_box_ele.get_attribute(
                    "class"):
                status_changed = True
            else:
                print(
                    "(set_switch_box_status)Clicked the "
                    "element to change its status but "
                    "it did not changed",
                    file=sys.stderr)
        elif expected_attr_in_class_tag in switch_box_ele.get_attribute(
                "class"):
            status_changed = True
        return status_changed

    def retry_click(self, click_locator, verify_locator):
        click_status = False
        attempt = 0

        while click_status is not True and attempt < 10:
            try:
                element = self.driver.find_element(*click_locator)
                element.click()
                WebDriverWait(self.driver, 10).until(
                    EC.visibility_of_element_located(verify_locator))
                click_status = True
            except Exception:
                attempt += 1
        return click_status

    def paste_values(self, el=None):
        """
        Function paste values in scratch pad
        :param el:
        """
        actions = ActionChains(self.driver)
        if "platform" in self.driver.capabilities:
            platform = (self.driver.capabilities["platform"]).lower()
        elif "platformName" in self.driver.capabilities:
            platform = (self.driver.capabilities["platformName"]).lower()
        if el:
            # Must step
            el.click()
            if 'mac' in platform:
                # Chrome Step
                if self.driver.capabilities['browserName'] == 'chrome':
                    actions.key_down(Keys.SHIFT)
                    actions.send_keys(Keys.INSERT)
                    actions.key_up(Keys.SHIFT)
                    actions.perform()
                else:
                    # FF step
                    el.send_keys(Keys.COMMAND + "v")
            else:
                el.send_keys(Keys.CONTROL + "v")

    def wait_for_element_to_be_visible(self, driver, xpath, time_value=20):
        """This will wait until an element is visible on page"""
        element_located_status = False
        try:
            if WebDriverWait(driver, time_value).until(
                    EC.visibility_of_element_located((By.XPATH, xpath))):
                element_located_status = True
        except TimeoutException:
            element_located_status = False
        return element_located_status

    def clear_edit_box(self, edit_box_webelement):
        while edit_box_webelement.get_attribute("value") != "":
            edit_box_webelement.send_keys(Keys.BACK_SPACE)

    def check_utility_error(self):
        wait = WebDriverWait(self.driver, 2)
        try:
            is_error = wait.until(EC.presence_of_element_located(
                (By.XPATH, "//div[contains(@class,'MuiDialogTitle-root')]"
                           "//div[text()='Utility not found']")
            ))
        except TimeoutException:
            is_error = None

        # If debugger plugin is not found
        if is_error and is_error.text == "Utility not found":
            click = True
            while click:
                try:
                    self.click_modal('OK', docker=True)
                    wait.until(EC.invisibility_of_element(
                        (By.XPATH, "//div[@class ='MuiDialogTitle-root']"
                                   "//div[text()='Utility not found']")
                    ))
                    click = False
                except TimeoutException:
                    pass
            return True
        else:
            return False
