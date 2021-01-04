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

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.feature_utils.locators import NavMenuLocators


class KeyboardShortcutFeatureTest(BaseFeatureTest):
    """
        This feature test will test the keyboard shortcut is working
        properly.
    """

    scenarios = [
        ("Test for keyboard shortcut", dict())
    ]

    def before(self):
        self.new_shortcuts = {
            'mnu_file': {
                'shortcut': [Keys.ALT, Keys.SHIFT, 'i'],
                'locator': 'File main menu'
            },
            'mnu_obj': {
                'shortcut': [Keys.ALT, Keys.SHIFT, 'j'],
                'locator': 'Object main menu'
            }
        }

        self.wait = WebDriverWait(self.page.driver, 10)

    def runTest(self):
        self._update_preferences()
        # On updating keyboard shortcuts, preference cache is updated.
        # There is no UI event through which we can identify that the cache
        # is updated, So, added time.sleep()
        time.sleep(1)
        self._check_shortcuts()

    def _check_shortcuts(self):
        action = ActionChains(self.driver)
        for s in self.new_shortcuts:
            key_combo = self.new_shortcuts[s]['shortcut']
            action.key_down(
                key_combo[0]
            ).key_down(
                key_combo[1]
            ).key_down(
                key_combo[2]
            ).key_up(
                key_combo[0]
            ).key_up(
                key_combo[1]
            ).perform()

            print("Executing shortcut: " + self.new_shortcuts[s]['locator'] +
                  "...", file=sys.stderr, end="")

            self.wait.until(
                EC.presence_of_element_located(
                    (By.XPATH, "//li[contains(@id, " +
                     s +
                     ") and contains(@class, 'show')]")
                )
            )

            is_open = 'show' in self.page.find_by_id(s).get_attribute('class')

            assert is_open is True, "Keyboard shortcut change is unsuccessful."

            print("OK", file=sys.stderr)

    def _update_preferences(self):
        file_menu = self.page.find_by_css_selector(
            NavMenuLocators.file_menu_css)
        file_menu.click()

        pref_menu_item = self.page.find_by_css_selector(
            NavMenuLocators.preference_menu_item_css)
        pref_menu_item.click()

        browser_node = self.page.find_by_xpath(
            NavMenuLocators.specified_preference_tree_node.format('Browser'))
        if self.page.find_by_xpath(
            NavMenuLocators.specified_pref_node_exp_status.
                format('Browser')).get_attribute('aria-expanded') == 'false':
            ActionChains(self.driver).double_click(browser_node).perform()

        display_node = self.page.find_by_xpath(
            NavMenuLocators.specified_sub_node_of_pref_tree_node.format(
                'Browser', 'Display'))
        attempt = 5
        while attempt > 0:
            display_node.click()
            # After clicking the element gets loaded in to the dom but still
            # not visible, hence sleeping for a sec.
            time.sleep(1)
            if self.page.wait_for_element_to_be_visible(
                self.driver,
                    NavMenuLocators.show_system_objects_pref_label_xpath, 3):
                break
            else:
                attempt -= 1

        maximize_button = self.page.find_by_css_selector(
            NavMenuLocators.maximize_pref_dialogue_css)
        maximize_button.click()

        keyboard_node = self.page.find_by_xpath(
            NavMenuLocators.specified_sub_node_of_pref_tree_node.format(
                'Browser', 'Keyboard shortcuts'))
        keyboard_node.click()

        for s in self.new_shortcuts:
            key = self.new_shortcuts[s]['shortcut'][2]
            locator = self.new_shortcuts[s]['locator']
            file_menu = self.page.find_by_xpath(
                "//div[contains(@class,'pgadmin-control-group') "
                "and contains(.,'" + locator + "')]"
            )

            field = file_menu.find_element_by_name('key')
            field.click()
            field.send_keys(key)

        # save and close the preference dialog.
        self.page.click_modal('Save')

        self.page.wait_for_element_to_disappear(
            lambda driver: driver.find_element_by_css_selector(".ajs-modal")
        )
