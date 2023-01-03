##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.python_test_utils import test_utils
from regression.python_test_utils import test_gui_helper
from regression.feature_utils.locators import NavMenuLocators
from regression.feature_utils.tree_area_locators import TreeAreaLocators
from selenium.webdriver import ActionChains


class PGUtilitiesBackupFeatureTest(BaseFeatureTest):
    """ This class test PG utilities - Backup and Restore test scenarios """

    scenarios = [
        ("Test for PG utilities - Backup and Restore", dict(
            database_name="pg_utility_test_db",
            is_xss_check=False,
        )),
        ("Test for XSS in Backup and Restore", dict(
            database_name="<h1>test_me</h1>",
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
        if '<' in self.database_name and os.name == 'nt':
            self.skipTest(
                "HTML tags '<' and '>' in object name does not "
                "work for windows so skipping the test case"
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
        self._update_preferences()
        db_id = test_utils.create_database(self.server, self.database_name)
        if not db_id:
            self.assertTrue(False, "Database {} is not "
                                   "created".format(self.database_name))
        self.page.add_server(self.server)

        self.wait = WebDriverWait(self.page.driver, 20)

    def runTest(self):
        self.page.expand_database_node("Server", self.server['name'],
                                       self.server['db_password'],
                                       self.database_name)

        # Backup
        self.initiate_backup()

        test_gui_helper.wait_for_process_start(self)
        test_gui_helper.open_process_details(self)

        backup_file = None
        # Check for XSS in Backup details
        if self.is_xss_check:
            self._check_detailed_window_for_xss('Backup')
        else:
            message = self.page.find_by_css_selector(
                NavMenuLocators.process_watcher_detailed_message_css). \
                text
            command = self.page.find_by_css_selector(
                NavMenuLocators.process_watcher_detailed_command_css). \
                text

            self.assertIn(self.server['name'], str(message))
            self.assertIn("from database 'pg_utility_test_db'", str(message))

            # On windows a modified path may be shown so skip this test
            if os.name != 'nt':
                self.assertIn("test_backup", str(command))

            self.assertIn("pg_dump", str(command))

            if command:
                backup_file = command[int(command.find('--file')) +
                                      8:int(command.find('--host')) - 2]

        test_gui_helper.close_process_watcher(self)

        # Restore
        self.initiate_restore()

        test_gui_helper.wait_for_process_start(self)
        test_gui_helper.open_process_details(self)

        # Check for XSS in Restore details
        if self.is_xss_check:
            self._check_detailed_window_for_xss('Restore')
        else:
            message = self.page.find_by_css_selector(
                NavMenuLocators.process_watcher_detailed_message_css). \
                text
            command = self.page.find_by_css_selector(
                NavMenuLocators.process_watcher_detailed_command_css). \
                text

            self.assertIn(self.server['name'], str(message))
            if os.name != 'nt':
                self.assertIn("test_backup", str(command))

            self.assertIn("pg_restore", str(command))

        test_gui_helper.close_process_watcher(self)

        if backup_file is not None and os.path.isfile(backup_file):
            os.remove(backup_file)

    def after(self):
        try:
            self.page.remove_server(self.server)
        except Exception:
            print("PGUtilitiesBackupFeatureTest - "
                  "Exception occurred in after method")
        finally:
            connection = test_utils.get_db_connection(
                self.server['db'],
                self.server['username'],
                self.server['db_password'],
                self.server['host'],
                self.server['port'],
                self.server['sslmode']
            )
            test_utils.drop_database(connection, self.database_name)

    def _check_detailed_window_for_xss(self, tool_name):
        source_code = self.page.find_by_css_selector(
            NavMenuLocators.process_watcher_detailed_command_css
        ).get_attribute('innerHTML')
        self._check_escaped_characters(
            source_code,
            '&lt;h1&gt;test_me&lt;/h1&gt;',
            '{0} detailed window'.format(tool_name)
        )

    def initiate_backup(self):
        self.page.retry_click(
            (By.CSS_SELECTOR,
             NavMenuLocators.tools_menu_css),
            (By.CSS_SELECTOR,
             NavMenuLocators.backup_obj_css))

        backup_object = self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, NavMenuLocators.backup_obj_css)))
        backup_object.click()

        # Enter the file name of the backup to be taken
        self.wait.until(EC.visibility_of_element_located(
            (By.NAME, NavMenuLocators.backup_filename_txt_box_name)))
        element = self.wait.until(EC.element_to_be_clickable(
            (By.NAME, NavMenuLocators.backup_filename_txt_box_name)))
        element.click()
        self.page.fill_input_by_field_name(
            NavMenuLocators.backup_filename_txt_box_name,
            "test_backup", input_keys=True, loose_focus=True)

        # Click on the take Backup button
        take_bckup = self.page.find_by_xpath(
            NavMenuLocators.backup_btn_xpath)
        click = True
        retry = 3
        while click and retry > 0:
            try:
                take_bckup.click()
                if self.page.wait_for_element_to_disappear(
                    lambda driver: driver.find_element(
                        By.XPATH,
                        "//*[@id='0']/div[contains(text(),'Backup')]")):
                    click = False
            except Exception:
                retry -= 1

    def initiate_restore(self):
        tools_menu = self.driver.find_element(
            By.CSS_SELECTOR, NavMenuLocators.tools_menu_css)
        tools_menu.click()

        restore_obj = self.page.find_by_css_selector(
            NavMenuLocators.restore_obj_css)
        restore_obj.click()

        self.wait.until(EC.visibility_of_element_located(
            (By.NAME, NavMenuLocators.restore_file_name_txt_box_name)))

        self.wait.until(EC.element_to_be_clickable(
            (By.NAME, NavMenuLocators.restore_file_name_txt_box_name))).click()

        self.page.fill_input_by_field_name(
            NavMenuLocators.restore_file_name_txt_box_name,
            "test_backup", input_keys=True, loose_focus=True)

        # Click on the Restore button
        restore_btn = self.page.find_by_xpath(
            NavMenuLocators.restore_button_xpath)
        click = True
        retry = 3
        while click and retry > 0:
            try:
                restore_btn.click()
                if self.page.wait_for_element_to_disappear(
                    lambda driver: driver.find_element(
                        By.NAME,
                        NavMenuLocators.restore_file_name_txt_box_name)):
                    click = False
            except Exception:
                retry -= 1

    def _check_escaped_characters(self, source_code, string_to_find, source):
        # For XSS we need to search against element's html code
        assert source_code.find(string_to_find) != - \
            1, "{0} might be vulnerable to XSS ".format(source)

    def _update_preferences(self):
        """
        Function updates preferences for binary path.
        """
        file_menu = self.page.find_by_css_selector(
            NavMenuLocators.file_menu_css)
        file_menu.click()

        pref_menu_item = self.page.find_by_css_selector(
            NavMenuLocators.preference_menu_item_css)
        pref_menu_item.click()

        wait = WebDriverWait(self.page.driver, 10)

        # Wait till the preference dialogue box is displayed by checking the
        # visibility of Show System Object label
        wait.until(EC.presence_of_element_located(
            (By.XPATH, NavMenuLocators.show_system_objects_pref_label_xpath))
        )

        maximize_button = self.page.find_by_xpath(
            NavMenuLocators.maximize_pref_dialogue_css)
        maximize_button.click()

        path = self.page.find_by_xpath(
            NavMenuLocators.specified_preference_tree_node.format('Paths'))
        if self.page.find_by_xpath(
            NavMenuLocators.specified_pref_node_exp_status.format('Paths')).\
                get_attribute('aria-expanded') == 'false':
            ActionChains(self.driver).double_click(path).perform()

        binary_path = self.page.find_by_xpath(
            NavMenuLocators.specified_sub_node_of_pref_tree_node.format(
                'Paths', 'Binary paths'))
        binary_path.click()

        default_binary_path = self.server['default_binary_paths']
        if default_binary_path is not None:
            def get_server_version_string():
                server_version = {150000: '15', 140000: '14', 130000: '13',
                                  120000: '12', 110000: '11', 100000: '10'}
                for k, v in server_version.items():
                    if k <= self.server_information['server_version']:
                        return v
                return None
            server_version = get_server_version_string()
            server_types = default_binary_path.keys()
            path_already_set = True
            for serv in server_types:
                if serv == 'pg' and server_version is not None:
                    path_input = \
                        self.page.find_by_xpath(
                            "//div[span[text()='PostgreSQL {}']]"
                            "/following-sibling::div//div/input".format(
                                server_version))
                    existing_path = path_input.get_property("value")
                    if existing_path != default_binary_path['pg']:
                        path_already_set = False
                        self.page.clear_edit_box(path_input)
                        path_input.click()
                        path_input.send_keys(default_binary_path['pg'])
                elif serv == 'ppas' and server_version is not None:
                    path_input = \
                        self.page.find_by_xpath(
                            "//div[span[text()='EDB Advanced Server {}']]"
                            "/following-sibling::div//div/input".format(
                                server_version))
                    existing_path = path_input.get_property("value")
                    if existing_path != default_binary_path['ppas']:
                        path_already_set = False
                        path_input = self.page.find_by_xpath(
                            "//div[span[text()='EDB Advanced Server {}']]"
                            "/following-sibling::div//div/input".format(
                                server_version))
                        self.page.clear_edit_box(path_input)
                        path_input.click()
                        path_input.send_keys(default_binary_path['ppas'])
                else:
                    print('Binary path Key is Incorrect or '
                          'server version is None.')

        maximize_button = self.page.find_by_xpath(
            NavMenuLocators.maximize_pref_dialogue_css)
        maximize_button.click()

        # save and close the preference dialog.
        if path_already_set:
            self.page.click_modal('Cancel')
        else:
            self.page.click_modal('Save')

        self.page.wait_for_element_to_disappear(
            lambda driver: driver.find_element(By.CSS_SELECTOR, ".ajs-modal")
        )
