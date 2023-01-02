##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import time
from regression.feature_utils.locators import NavMenuLocators
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC


def close_bgprocess_start_popup(tester):
    """
    Allows us to close the background process popup window
    """
    tester.driver.find_element(
        By.CSS_SELECTOR,
        NavMenuLocators.process_start_close_selector).click()


def wait_for_process_start(tester):
    tester.wait.until(EC.visibility_of_element_located(
        (By.CSS_SELECTOR,
         NavMenuLocators.process_start_close_selector)))
    close_bgprocess_start_popup(tester)


def wait_for_process_end(self):
    """This will wait for process to complete dialogue status"""
    attempts = 120
    status = False
    while attempts > 0:
        try:
            button = self.page.find_by_css_selector(
                NavMenuLocators.process_end_close_selector)
            status = True
            button.click()
            break
        except Exception:
            attempts -= 1
            time.sleep(.5)
    return status


def open_process_details(tester):
    status = wait_for_process_end(tester)
    if not status:
        raise RuntimeError("Process not completed")

    tester.page.click_tab("Processes")
    time.sleep(3)
    tester.page.find_by_css_selector(
        "div[data-test='processes'] "
        "div[data-test='row-container']:nth-child(1) "
        "div[role='row'] div[role='cell']:nth-child(3) button").click()

    tester.page.wait_for_element_to_disappear(
        lambda driver: driver.find_element(
            By.CSS_SELECTOR, "span[data-test='loading-logs']"))


def close_process_watcher(tester):
    attempt = 10
    while attempt > 0:
        try:
            if not tester.page.check_if_element_exist_by_xpath(
                    NavMenuLocators.process_watcher_close_button_xpath, 1):
                break
            else:
                close_btn = tester.page.find_by_xpath(
                    NavMenuLocators.process_watcher_close_button_xpath)
                close_btn.click()
                attempt -= 1
        except Exception:
            attempt -= 1
