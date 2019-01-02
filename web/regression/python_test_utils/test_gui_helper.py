##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


def close_bgprocess_popup(tester):
    """
    Allow us to close the background process popup window
    """
    tester._screenshot()

    # In cases where backup div is not closed (sometime due to some error)
    try:
        if tester.driver.find_element_by_css_selector(
                ".ajs-message.ajs-bg-bgprocess.ajs-visible > div > "
                "div > div > i"):
            tester.driver.find_element_by_css_selector(
                ".ajs-message.ajs-bg-bgprocess.ajs-visible >div >div  "
                ">div>i").click()
    except Exception:
        pass

    # In cases where restore div is not closed (sometime due to some error)
    try:
        if tester.driver.find_element_by_xpath(
                "//div[contains(text(), 'Process Watcher - "
                "Restoring backup')]"):
            tester.driver.find_element_by_xpath(
                "//div[div[div[div[contains(text(), 'Process Watcher "
                "- Restoring backup')]]]]"
                "/following-sibling::div/div/div").click()
    except Exception:
        pass
