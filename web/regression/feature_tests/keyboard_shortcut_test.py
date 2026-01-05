##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
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
from regression.feature_utils.locators import NavMenuLocators, \
    PreferencesLocaltors


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
            'File': {
                'shortcut': [Keys.ALT, Keys.SHIFT, 'i'],
                'locator': 'File main menu'
            },
            'Object': {
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
                    (By.CSS_SELECTOR,
                     "[role='menu'][aria-label='File'].szh-menu--state-open")
                )
            )

            print("OK", file=sys.stderr)

    def _update_preferences(self):
        file_menu = self.page.find_by_css_selector(
            NavMenuLocators.file_menu_css)
        file_menu.click()

        pref_menu_item = self.page.find_by_css_selector(
            NavMenuLocators.preference_menu_item_css)
        pref_menu_item.click()

        wait = WebDriverWait(self.page.driver, 10)

        self.page.click_tab("Preferences")

        # Wait till the preference dialogue box is displayed by checking the
        # visibility of Show System Object label
        wait.until(EC.presence_of_element_located(
            (By.XPATH,
             PreferencesLocaltors.show_system_objects_pref_label_xpath))
        )

        keyboard_node = self.page.find_by_xpath(
            PreferencesLocaltors.specified_preference_tree_node_xpath.format(
                'Keyboard shortcuts'))

        keyboard_node.click()

        for s in self.new_shortcuts:
            key = self.new_shortcuts[s]['shortcut'][2]
            locator = self.new_shortcuts[s]['locator']
            file_menu = \
                self.page.find_by_xpath("//div[label[text()='{}']]"
                                        "/following-sibling::div//div/"
                                        "input".format(locator))

            file_menu.click()
            time.sleep(1)
            file_menu.send_keys(key)

        # save and close the preference dialog.
        self.page.find_by_css_selector(PreferencesLocaltors.save_btn) \
            .click()
        time.sleep(3)
        self.page.close_active_tab()
