##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from regression.feature_utils.locators import NavMenuLocators


def close_bgprocess_popup(tester):
    """
    Allows us to close the background process popup window
    """
    # In cases where backup div is not closed (sometime due to some error)
    try:
        tester.page.wait_for_element_to_disappear(
            lambda x: tester.driver.find_element_by_xpath(
                ".ajs-message.ajs-bg-bgprocess.ajs-visible"))
    except Exception:
        tester.driver.find_element_by_css_selector(
            NavMenuLocators.process_watcher_error_close_xpath).click()

    # In cases where restore div is not closed (sometime due to some error)
    try:
        tester.page.wait_for_element_to_disappear(
            lambda x: tester.driver.find_element_by_xpath(
                "//div[@class='card-header bg-primary d-flex']/div"
                "[contains(text(), 'Restoring backup')]"))
    except Exception:
        tester.driver.find_element_by_css_selector(
            NavMenuLocators.process_watcher_error_close_xpath).click()

    # In cases where maintenance window is not closed (sometime due to some
    # error)
    try:
        tester.page.wait_for_element_to_disappear(
            lambda x: tester.driver.find_element_by_xpath(
                "//div[@class='card-header bg-primary d-flex']/div"
                "[contains(text(), 'Maintenance')]"))
    except Exception:
        tester.driver.find_element_by_css_selector(
            NavMenuLocators.process_watcher_error_close_xpath).click()


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
