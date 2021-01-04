##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
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
    NavMenuLocators, ConnectToServerDiv
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

        if self.driver.name == 'firefox':
            ActionChains(self.driver).context_click(self.find_by_xpath(
                "//*[@class='aciTreeText' and contains(.,'Servers')]"))\
                .perform()
            ActionChains(self.driver).move_to_element(
                self.find_by_xpath("//li/span[text()='Create']")).perform()
            self.find_by_xpath("//li/span[text()='Server...']").click()
        else:
            self.driver.find_element_by_link_text("Object").click()
            ActionChains(self.driver).move_to_element(
                self.driver.find_element_by_link_text("Create")).perform()
            self.find_by_partial_link_text("Server...").click()

        WebDriverWait(self.driver, 5).until(EC.visibility_of_element_located(
            (By.XPATH, "//div[text()='Create - Server']")))

        # After server dialogue opens
        self.fill_input_by_field_name("name", server_config['name'],
                                      loose_focus=True)
        self.find_by_partial_link_text("Connection").click()
        self.fill_input_by_field_name("host", server_config['host'])
        self.fill_input_by_field_name("port", server_config['port'])
        self.fill_input_by_field_name("username", server_config['username'])
        self.fill_input_by_field_name("password", server_config['db_password'])
        WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, "button[type='save'].btn.btn-primary")))
        self.find_by_css_selector("button[type='save'].btn.btn-primary").\
            click()

        server_tree_xpath = \
            "//*[@id='tree']//*[.='" + server_config['name'] + "']"
        try:
            WebDriverWait(self.driver, 10).until(
                EC.visibility_of_element_located(
                    (By.XPATH, server_tree_xpath)))
        except TimeoutException:
            self.toggle_open_servers_group()
            WebDriverWait(self.driver, 10).until(
                EC.visibility_of_element_located(
                    (By.XPATH, server_tree_xpath)))

    def open_query_tool(self):
        self.driver.find_element_by_link_text("Tools").click()
        tools_menu = self.driver.find_element_by_id('mnu_tools')

        query_tool = tools_menu.find_element_by_id('query_tool')

        self.enable_menu_item(query_tool, 10)

        self.find_by_partial_link_text("Query Tool").click()

    def open_view_data(self, table_name):
        self.driver.find_element_by_link_text("Object").click()
        ActionChains(
            self.driver
        ).move_to_element(
            self.driver.find_element_by_link_text("View/Edit Data")
        ).perform()
        self.find_by_partial_link_text("All Rows").click()
        time.sleep(1)
        # wait until datagrid frame is loaded.

        self.click_tab(table_name)

        WebDriverWait(self.driver, self.timeout).until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, 'iframe')
            ), "Timed out waiting for div element to appear"
        )
        self.driver.switch_to.frame(
            self.driver.find_element_by_tag_name('iframe')
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

            if self.check_if_element_exist_by_xpath(
                    "//button[text()='Rollback']", 1):
                self.click_element(
                    self.find_by_xpath("//button[text()='Rollback']"))
        self.driver.switch_to.default_content()

    def clear_query_tool(self):
        self.click_element(
            self.find_by_css_selector(QueryToolLocators.btn_clear_dropdown)
        )
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
        retry = 5
        execute_button = self.find_by_css_selector(
            QueryToolLocators.btn_execute_query_css)
        first_click = execute_button.get_attribute('data-click-counter')
        while retry > 0:
            execute_button.click()
            execute_button = self.find_by_css_selector(
                QueryToolLocators.btn_execute_query_css)
            second_click = execute_button.get_attribute(
                'data-click-counter')
            if first_click != second_click:
                self.wait_for_query_tool_loading_indicator_to_appear()
                break
            else:
                retry -= 1
        self.wait_for_query_tool_loading_indicator_to_disappear(timeout)

    def check_execute_option(self, option):
        """"This function will check auto commit or auto roll back based on
        user input. If button is already checked, no action will be taken"""
        query_options = self.driver.find_element_by_css_selector(
            QueryToolLocators.btn_query_dropdown)
        expanded = query_options.get_attribute("aria-expanded")
        if expanded == "false":
            query_options.click()

        def update_execute_option_setting(
                css_selector_of_option_status, css_selector_of_option,):
            retry = 3
            check_status = self.driver.find_element_by_css_selector(
                css_selector_of_option_status)
            if 'visibility-hidden' in check_status.get_attribute('class'):
                while retry > 0:
                    self.find_by_css_selector(css_selector_of_option).click()
                    time.sleep(0.2)
                    if 'visibility-hidden' not in \
                            check_status.get_attribute('class'):
                        break
                    else:
                        retry -= 1
        if option == 'auto_commit':
            update_execute_option_setting(
                QueryToolLocators.btn_auto_commit_check_status,
                QueryToolLocators.btn_auto_commit)
        if option == 'auto_rollback':
            update_execute_option_setting(
                QueryToolLocators.btn_auto_rollback_check_status,
                QueryToolLocators.btn_auto_rollback)

    def uncheck_execute_option(self, option):
        """"This function will uncheck auto commit or auto roll back based on
        user input. If button is already unchecked, no action will be taken"""
        query_options = self.driver.find_element_by_css_selector(
            QueryToolLocators.btn_query_dropdown)
        expanded = query_options.get_attribute("aria-expanded")
        if expanded == "false":
            query_options.click()

        def update_execute_option_setting(
                css_selector_of_option_status, css_selector_of_option):
            retry = 3
            check_status = self.driver.find_element_by_css_selector(
                css_selector_of_option_status)
            if 'visibility-hidden' not in check_status.get_attribute('class'):
                while retry > 0:
                    self.find_by_css_selector(
                        css_selector_of_option).click()
                    time.sleep(0.2)
                    if 'visibility-hidden' in \
                            check_status.get_attribute('class'):
                        break
                    else:
                        retry -= 1

        if option == 'auto_commit':
            update_execute_option_setting(
                QueryToolLocators.btn_auto_commit_check_status,
                QueryToolLocators.btn_auto_commit)
        if option == 'auto_rollback':
            update_execute_option_setting(
                QueryToolLocators.btn_auto_rollback_check_status,
                QueryToolLocators.btn_auto_rollback)

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
            self.js_executor_scrollintoview_arg, server_to_remove)
        self.click_element(server_to_remove)
        object_menu_item = self.find_by_partial_link_text("Object")
        self.click_element(object_menu_item)
        delete_menu_item = self.find_by_partial_link_text("Remove Server")
        self.click_element(delete_menu_item)
        self.click_modal('Yes')

    def select_tree_item(self, tree_item_text):
        item = self.find_by_xpath(
            "//*[@id='tree']//*[contains(text(), '" + tree_item_text + "')]"
            "/parent::span[@class='aciTreeItem']")
        self.driver.execute_script(self.js_executor_scrollintoview_arg, item)
        # unexpected exception like element overlapping, click attempts more
        # than one time
        attempts = 3
        while attempts > 0:
            try:
                item.click()
                break
            except Exception as e:
                attempts -= 1
                time.sleep(.4)
                if attempts == 0:
                    raise e

    def click_a_tree_node(self, element_name, list_of_element):
        """It will click a tree node eg. server, schema, table name etc
        will take server name and list of element where this node lies"""
        operation_status = False
        elements = list_of_element = self.find_by_xpath_list(
            list_of_element)
        if len(elements) > 0:
            index_of_element = self.get_index_of_element(
                elements, element_name)
            if index_of_element >= 0:
                self.driver.execute_script(
                    self.js_executor_scrollintoview_arg,
                    list_of_element[index_of_element])
                self.wait_for_elements_to_appear(
                    self.driver, list_of_element[index_of_element])
                time.sleep(1)
                list_of_element[index_of_element].click()
                operation_status = True
            else:
                print("{ERROR} - The required element with name: " + str(
                    element_name) +
                    " is not found in function click_a_tree_node, "
                    "so click operation is not performed")
        else:
            print("{ERROR} - The element list passed to function "
                  "click_a_tree_node seems empty")
        return operation_status

    def toggle_open_servers_group(self):
        """This will open Servers group to display underlying nodes"""
        is_expanded = False
        self.wait_for_spinner_to_disappear()
        if self.check_if_element_exist_by_xpath(
                TreeAreaLocators.server_group_node):
            if self.get_expansion_status_of_node(
                    TreeAreaLocators.server_group_node_exp_status):
                is_expanded = True
            else:
                webdriver.ActionChains(self.driver).double_click(
                    self.find_by_xpath(
                        TreeAreaLocators.
                        server_group_node)).perform()
                if self.check_if_element_exist_by_xpath(
                        TreeAreaLocators.server_group_sub_nodes):
                    is_expanded = True
                else:
                    print(
                        "(toggle_open_servers_group)The Server Group "
                        "node is clicked to expand but it is not expanded",
                        file=sys.stderr)
        else:
            print("The Server Group node is not visible",
                  file=sys.stderr)
        return is_expanded

    def expand_server_node(self, server_name, server_password):
        """will expand a particular server node"""
        server_node_expansion_status = False
        if self.toggle_open_servers_group():
            if self.wait_for_elements_to_appear(
                self.driver,
                    TreeAreaLocators.server_group_sub_nodes):
                subnodes_of_servers = self.find_by_xpath_list(
                    TreeAreaLocators.server_group_sub_nodes)
                subnodes_of_servers_expansion_status = \
                    self.find_by_xpath_list(
                        TreeAreaLocators.
                        server_group_sub_nodes_exp_status)
                index_of_server_node = self.get_index_of_element(
                    subnodes_of_servers, server_name)

                server_node_expansion_status = self.click_expand_server_node(
                    subnodes_of_servers_expansion_status,
                    index_of_server_node,
                    subnodes_of_servers,
                    server_name,
                    server_password)
        else:
            print(
                "(expand_server_node) The Servers node is"
                " not expanded",
                file=sys.stderr)
        return server_node_expansion_status

    def click_expand_server_node(self, subnodes_of_servers_expansion_status,
                                 index_of_server_node, subnodes_of_servers,
                                 server_name, server_password):
        """
        Method actually clicks on server node to expand
        :param subnodes_of_servers_expansion_status:
        :param index_of_server_node:
        :param subnodes_of_servers:
        :param server_name:
        :param server_password:
        :return: True is click action is successful & server node expanded
        """
        server_node_expansion_status = False
        if not self.check_server_is_connected(
                index_of_server_node):
            if self.click_and_connect_server(
                subnodes_of_servers[index_of_server_node],
                    server_password):
                server_node_expansion_status = True
            else:
                print(
                    "(expand_server_node)The server node is "
                    "not expanded",
                    file=sys.stderr)
        else:
            if not self.get_expansion_status_of_node_element(
                subnodes_of_servers_expansion_status[
                    index_of_server_node]):
                webdriver.ActionChains(self.driver).double_click(
                    subnodes_of_servers[
                        index_of_server_node]).perform()
                if self.wait_for_elements_to_appear(
                    self.driver, TreeAreaLocators.
                        sub_nodes_of_a_server_node(server_name),
                        30):
                    server_node_expansion_status = True
            else:
                server_node_expansion_status = True
        return server_node_expansion_status

    def expand_databases_node(self, server_name, server_password):
        """will expand databases node under server node"""
        databases_node_expanded = False
        if self.expand_server_node(server_name, server_password):
            if self.wait_for_elements_to_appear(
                self.driver,
                    TreeAreaLocators.sub_nodes_of_a_server_node(server_name)):
                subnodes_of_server_node = self.find_by_xpath_list(
                    TreeAreaLocators.sub_nodes_of_a_server_node(server_name))
                subnode_of_server_node_exp_status = self.find_by_xpath_list(
                    TreeAreaLocators.sub_nodes_of_a_server_node_exp_status(
                        server_name))
                index_of_databases_node = self.get_index_of_element(
                    subnodes_of_server_node,
                    "Databases")
                time.sleep(2)
                expansion_status = self.get_expansion_status_of_node_element(
                    subnode_of_server_node_exp_status[index_of_databases_node])
                if not expansion_status:
                    databases_node_expanded = \
                        self.click_to_expand_databases_node(
                            subnodes_of_server_node,
                            index_of_databases_node,
                            server_name)
                else:
                    databases_node_expanded = True
        else:
            print("The server/previous nodes not expanded",
                  file=sys.stderr)
        return databases_node_expanded

    def click_to_expand_databases_node(self, subnodes_of_server_node,
                                       index_of_databases_node, server_name):
        """
        Method clicks on databases node of specified server to expand
        :param subnodes_of_server_node:
        :param index_of_databases_node:
        :param server_name:
        :return: True if database node click is successful & expanded
        """
        retry = 5
        databases_node_expanded = False
        while retry > 0:
            webdriver.ActionChains(self.driver).double_click(
                subnodes_of_server_node[
                    index_of_databases_node].find_element_by_xpath(
                    ".//*[@class='aciTreeItem']")
            ).perform()
            if self.wait_for_elements_to_appear(
                self.driver, TreeAreaLocators.
                    sub_nodes_of_databases_node(server_name), 3):
                databases_node_expanded = True
                break
            else:
                retry -= 1
        return databases_node_expanded

    def click_to_expand_database_node(self, sub_nodes_of_databases_node,
                                      index_of_required_db_node,
                                      name_of_database):
        """
        Method clicks on specified database name from expanded databases node
        of server.
        :param sub_nodes_of_databases_node:
        :param index_of_required_db_node:
        :param name_of_database:
        :return: True if particular database click is successful & expanded
        """
        retry = 5
        db_node_expanded_status = False
        self.driver.execute_script(self.js_executor_scrollintoview_arg,
                                   sub_nodes_of_databases_node[
                                       index_of_required_db_node])
        while retry > 0:
            webdriver.ActionChains(self.driver).double_click(
                sub_nodes_of_databases_node[
                    index_of_required_db_node]).perform()
            if self.check_if_element_exist_by_xpath(
                "//div[@class='ajs-header'and text()='INTERNAL SERVER "
                    "ERROR']", 1):
                try:
                    self.click_modal('OK')
                except Exception:
                    pass
                retry -= 1
            else:
                break
        if self.wait_for_elements_to_appear(
            self.driver, TreeAreaLocators.
                sub_nodes_of_database_node(
                name_of_database)):
            db_node_expanded_status = True
        return db_node_expanded_status

    def expand_database_node(self, server_name, server_password,
                             name_of_database):
        """will expand database node under databases node"""
        db_node_expanded_status = False
        if self.expand_databases_node(server_name, server_password):
            sub_nodes_of_databases_node = self.find_by_xpath_list(
                TreeAreaLocators.sub_nodes_of_databases_node(server_name))
            index_of_required_db_node = self.get_index_of_element(
                sub_nodes_of_databases_node,
                name_of_database)
            expansion_status = self.get_expansion_status_of_node_element(
                self.find_by_xpath_list(
                    TreeAreaLocators.
                    sub_nodes_of_databases_node_exp_status(
                        server_name))[
                    index_of_required_db_node])
            if not expansion_status:
                db_node_expanded_status = self.click_to_expand_database_node(
                    sub_nodes_of_databases_node, index_of_required_db_node,
                    name_of_database)
            else:
                db_node_expanded_status = True
        else:
            print("The databases/previous nodes not expanded",
                  file=sys.stderr)
        return db_node_expanded_status

    def toggle_open_schemas_node(self, server_name, server_password,
                                 name_of_database):
        """will expand schemas node under a db node"""
        expansion_status = False
        if self.expand_database_node(server_name, server_password,
                                     name_of_database):
            sub_nodes_db_node = self.find_by_xpath_list(
                TreeAreaLocators.sub_nodes_of_database_node(
                    name_of_database))
            index_of_schemas_node = self.get_index_of_element(
                sub_nodes_db_node, "Schemas")
            expansion_status = self.get_expansion_status_of_node_element(
                self.find_by_xpath_list(
                    TreeAreaLocators.sub_nodes_of_database_node_exp_status(
                        name_of_database))[
                    index_of_schemas_node])
            if not expansion_status:
                self.driver.execute_script(
                    self.js_executor_scrollintoview_arg,
                    sub_nodes_db_node[index_of_schemas_node])
                webdriver.ActionChains(self.driver).double_click(
                    sub_nodes_db_node[index_of_schemas_node]).perform()
                if self.wait_for_elements_to_appear(
                    self.driver, TreeAreaLocators.
                        sub_nodes_of_schemas_node(name_of_database)):
                    expansion_status = True
            else:
                expansion_status = True
        else:
            print(
                "(expand_schemas_node) database/previous nodes "
                "are not expanded",
                file=sys.stderr)
        return expansion_status

    def toggle_open_schema_node(
        self, server_name, server_password,
            name_of_database, name_of_schema_node):
        """will expand schema node under schemas node"""
        expansion_status = False
        if self.toggle_open_schemas_node(
                server_name, server_password, name_of_database):
            sub_nodes_schemas_node = self.find_by_xpath_list(
                TreeAreaLocators.sub_nodes_of_schemas_node(
                    name_of_database))
            index_of_schema_node = self.get_index_of_element(
                sub_nodes_schemas_node,
                name_of_schema_node)
            expansion_status = self.get_expansion_status_of_node_element(
                self.find_by_xpath_list(
                    TreeAreaLocators.sub_nodes_of_schemas_node_exp_status(
                        name_of_database))[
                    index_of_schema_node])
            if not expansion_status:
                self.driver.execute_script(
                    self.js_executor_scrollintoview_arg,
                    sub_nodes_schemas_node[index_of_schema_node])
                webdriver.ActionChains(self.driver).double_click(
                    sub_nodes_schemas_node[index_of_schema_node]).perform()
                if self.wait_for_elements_to_appear(
                    self.driver, TreeAreaLocators.
                        sub_nodes_of_schema_node(name_of_database)):
                    expansion_status = True
            else:
                expansion_status = True
        else:
            print(
                "(expand_schema_node) schema/previous nodes are"
                " not expanded",
                file=sys.stderr)
        return expansion_status

    def toggle_open_tables_node(
        self, server_name, server_password,
            name_of_database, name_of_schema_node):
        """will expand tables node under schema node"""
        node_expanded_successfully = False
        if self.toggle_open_schema_node(
            server_name, server_password, name_of_database,
                name_of_schema_node):
            sub_nodes_of_schema_node = self.find_by_xpath_list(
                TreeAreaLocators.sub_nodes_of_schema_node(
                    name_of_database))
            sub_nodes_of_schema_node_exp_status = self.find_by_xpath_list(
                TreeAreaLocators.sub_nodes_of_schema_node_exp_status(
                    name_of_database))
            index_of_tables_node = self.get_index_of_element(
                sub_nodes_of_schema_node, "Tables")
            expansion_status = self.get_expansion_status_of_node_element(
                sub_nodes_of_schema_node_exp_status[index_of_tables_node])
            if not expansion_status:
                self.driver.execute_script(self.js_executor_scrollintoview_arg,
                                           sub_nodes_of_schema_node[
                                               index_of_tables_node])
                webdriver.ActionChains(self.driver).double_click(
                    sub_nodes_of_schema_node[
                        index_of_tables_node]).perform()
                if self.wait_for_elements_to_appear(
                    self.driver, TreeAreaLocators.
                        sub_nodes_of_tables_node):
                    node_expanded_successfully = True
            else:
                node_expanded_successfully = True
        else:
            print(
                "(expand_tables_node) schema/previous nodes "
                "are not expanded",
                file=sys.stderr)
        return node_expanded_successfully

    def toggle_open_function_node(self):
        """The function will be used for opening Functions node only"""
        node_expanded = False
        attempts = 3

        xpath_for_functions_node = \
            "//span[@class='aciTreeText' and starts-with(text()," \
            "'Functions')]"
        xpath_for_exp = "//div[div[div[div[div[div[div[div[span[span[" \
                        "(@class='aciTreeText') and starts-with(text()," \
                        "'Functions')]]]]]]]]]]"
        xpath_for_button = "//div[span[span[(@class='aciTreeText') " \
                           "and starts-with(text(),'Functions')]]]" \
                           "/span[@class='aciTreeButton']"

        while node_expanded is not True and attempts > 0:
            # get the element which contains 'aria-expanded' info

            xpath_for_refresh_btn = "//li[@class='context-menu-item']" \
                                    "/span[text()='Refresh...']"

            # add code to refresh button, sometime the the collapsing button
            #  is not visible even if there is sub node.
            functions_node_ele = self.find_by_xpath(xpath_for_functions_node)

            webdriver.ActionChains(self.driver).move_to_element(
                functions_node_ele).context_click().perform()
            refresh_btn = self.find_by_xpath(xpath_for_refresh_btn)
            refresh_btn.click()
            time.sleep(.5)

            # get the expansion status
            function_expansion_ele = self.find_by_xpath(xpath_for_exp)

            # look into the attribute and check if it is already expanded or
            #  not
            if function_expansion_ele.get_attribute('aria-expanded') \
                    == 'false':
                # button element of the Function node to open it
                item_button = self.find_by_xpath(xpath_for_button)
                ActionChains(self.driver).click(item_button).perform()
                # Expansion of element on GUI takes sometime, so put small
                # sleep
                time.sleep(.5)
                function_expansion_ele = self.find_by_xpath(
                    xpath_for_exp)
                if function_expansion_ele.get_attribute('aria-expanded') \
                        == 'true':
                    break
                else:
                    attempts -= 1
            else:
                node_expanded = True

    def check_server_is_connected(self, index_of_server):
        """This will check connected status of a server, as connection
        status is contained either in span or div element so checking it"""
        server_connected = False
        try:
            connection_status_elements = self.find_by_xpath_list(
                TreeAreaLocators.server_group_sub_nodes_connected_status)
            span_elements = connection_status_elements[
                index_of_server].find_elements_by_tag_name("span")
            div_elements = connection_status_elements[
                index_of_server].find_elements_by_tag_name("div")

            span_value_of_class_att = ""
            div_value_of_class_att = ""

            if len(span_elements) > 0:
                span_value_of_class_att = \
                    span_elements[0].get_attribute('class')
            if len(div_elements) > 0:
                div_value_of_class_att = \
                    div_elements[0].get_attribute('class')
            if (("aciTreeIcon icon-pg" in span_value_of_class_att or
                 "aciTreeIcon icon-pg" in div_value_of_class_att or
                 "aciTreeIcon icon-ppas" in
                 span_value_of_class_att or
                 "aciTreeIcon icon-ppas" in div_value_of_class_att) and
                    ("aciTreeIcon icon-server-not-connected" not in
                        span_value_of_class_att or
                        "aciTreeIcon icon-server-not-connected" not in
                        div_value_of_class_att)):
                server_connected = True
        except Exception as e:
            print("There is some exception thrown in the function "
                  "check_server_is_connected and is: " + str(e),
                  file=sys.stderr)
        return server_connected

    def click_and_connect_server(self, server_element, password):
        """will connect a server node, will provide the password in the
        respective window"""
        server_connection_status = False
        try:
            webdriver.ActionChains(self.driver).double_click(
                server_element).perform()
            if self.check_if_element_exist_by_xpath(
                    ConnectToServerDiv.ok_button):
                field = self.find_by_xpath(
                    ConnectToServerDiv.password_field)
                self.fill_input(field, password)
                self.find_by_xpath(ConnectToServerDiv.ok_button).click()
                self.wait_for_element_to_disappear(
                    lambda driver: driver.find_element_by_xpath(
                        ConnectToServerDiv.ok_button))
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

    def get_expansion_status_of_node(self, xpath_node):
        """get the expansion status for a node through xpath"""
        node_is_expanded = False
        element = self.find_by_xpath(xpath_node)
        if element.get_attribute("aria-expanded") == 'true':
            node_is_expanded = True
        return node_is_expanded

    def get_expansion_status_of_node_element(self, element):
        """get the expansion status for an element"""
        node_is_expanded = False
        try:
            if element.get_attribute("aria-expanded") == 'true':
                node_is_expanded = True
        except Exception as e:
            print(
                "There is some exception thrown in the function "
                "get_expansion_status_of_node_element and is: " + str(
                    e), file=sys.stderr)
        return node_is_expanded

    def toggle_open_tree_item(self, tree_item_text):
        # 'sleep' here helps in cases where underlying nodes are auto opened.
        # Otherwise, encountered situations where False value is returned
        # even if the underlying node to be clicked was Opened.
        time.sleep(.6)
        item_with_text = self.find_by_xpath(
            TreeAreaLocators.specified_tree_node.format(tree_item_text))

        self.driver.execute_script(self.js_executor_scrollintoview_arg,
                                   item_with_text)

        if item_with_text.find_element_by_xpath(
            ".//ancestor::*[@class='aciTreeLine']").get_attribute(
                "aria-expanded") == 'false':
            item = item_with_text.find_element_by_xpath(
                ".//parent::*[@class='aciTreeItem']")
            ActionChains(self.driver).double_click(item).perform()
        retry = 3
        while retry > 0:
            try:
                WebDriverWait(self.driver, 5).until((lambda item_with_text: (
                    item_with_text.find_element_by_xpath(
                        ".//ancestor::*[@class='aciTreeLine']").
                    get_attribute("aria-expanded") == 'true')))
                break
            except TimeoutException:
                retry -= 1

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
        time.sleep(1)
        self.wait_for_query_tool_loading_indicator_to_disappear(12)

        retry = 2
        while retry > 0:
            try:
                self.driver.switch_to.default_content()
                WebDriverWait(self.driver, 10).until(
                    EC.frame_to_be_available_and_switch_to_it(
                        (By.TAG_NAME, "iframe")))
                self.find_by_xpath("//a[text()='Query Editor']").click()

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
        WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable(
            (By.XPATH, NavMenuLocators.select_tab_xpath.format(tab_name))))
        click_tab = True
        while click_tab:
            tab = self.find_by_xpath(
                NavMenuLocators.select_tab_xpath.format(tab_name))
            self.click_element(tab)
            if 'wcPanelTabActive' in tab.get_attribute('class'):
                break

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

        self._wait_for("spinner to disappear", spinner_has_disappeared, 20)

    def wait_for_query_tool_loading_indicator_to_disappear(self, timeout=20):
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

        self._wait_for(
            "spinner to disappear", spinner_has_disappeared, timeout)

    def wait_for_query_tool_loading_indicator_to_appear(self):
        status = self.check_if_element_exist_by_xpath(
            "//div[@id='editor-panel']//"
            "div[@class='pg-sp-container sql-editor-busy-fetching']", 1)
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
                if len(element) > 0 and element[0].is_displayed() and element[
                        0].is_enabled():
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

    def find_by_xpath_list(self, xpath):
        """This will find out list of elements through a single xpath"""
        return self.wait_for_elements(
            lambda driver: driver.find_elements_by_xpath(xpath))

    def get_index_of_element(self, element_list, target_string):
        """it will return index of an element from provided element list"""
        index_of_required_server = -1
        if len(element_list) > 0:
            for index, element in enumerate(element_list):
                if element.text.startswith(target_string) and (
                        target_string in element.text):
                    index_of_required_server = index
                    break
        else:
            print("There seems no record in the provided element list")
        return index_of_required_server

    def set_switch_box_status(self, switch_box, required_status):
        """it will change switch box status to required one. Two elements
        of the switch boxes are to be provided i) button which is needed to
         toggle ii) Yes for True or No for False"""
        status_changed_successfully = False
        switch_box_element = self.find_by_xpath(switch_box)

        if required_status == 'Yes':
            status_changed_successfully = \
                self.toggle_switch_box(switch_box_element,
                                       expected_attr_in_class_tag='success',
                                       unexpected_attr_in_class_tag='off')
        else:
            status_changed_successfully = \
                self.toggle_switch_box(switch_box_element,
                                       expected_attr_in_class_tag='off',
                                       unexpected_attr_in_class_tag='success')
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
                # FF step
                el.send_keys(Keys.COMMAND + "v")
                # Chrome Step
                actions.key_down(Keys.SHIFT)
                actions.send_keys(Keys.INSERT)
                actions.key_up(Keys.SHIFT)
                actions.perform()
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
