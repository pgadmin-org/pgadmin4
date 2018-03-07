##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from __future__ import print_function
import time
import sys

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver import ActionChains
from regression.feature_utils.base_feature_test import BaseFeatureTest
from selenium.webdriver.common.keys import Keys


class KeyboardShortcutFeatureTest(BaseFeatureTest):
    """
        This feature test will test the keyboard short is working
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
                     ") and contains(@class, 'open')]")
                )
            )

            is_open = 'open' in self.page.find_by_id(s).get_attribute('class')

            assert is_open is True, "Keyboard shortcut change is unsuccessful."

            print("OK", file=sys.stderr)

    def _update_preferences(self):
        self.page.find_by_id("mnu_file").click()
        self.page.find_by_id("mnu_preferences").click()

        self.wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(string(), 'Show system objects?')]"))
        )

        self.page.find_by_css_selector(
            ".ajs-dialog.pg-el-container .ajs-maximize"
        ).click()

        browser = self.page.find_by_xpath(
            "//*[contains(@class,'aciTreeLi') and contains(.,'Browser')]")

        browser.find_element_by_xpath(
            "//*[contains(@class,'aciTreeText') and "
            "contains(.,'Keyboard shortcuts')]").click()

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
        self.page.find_by_xpath(
            "//*[contains(@class,'pg-alertify-button') and "
            "contains(.,'OK')]"
        ).click()

        self.page.wait_for_element_to_disappear(
            lambda driver: driver.find_element_by_css_selector(".ajs-modal")
        )
