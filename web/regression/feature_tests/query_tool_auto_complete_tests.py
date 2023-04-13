##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import secrets

from selenium.webdriver import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from regression.python_test_utils import test_utils
from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.feature_utils.locators import QueryToolLocators


class QueryToolAutoCompleteFeatureTest(BaseFeatureTest):
    """
        This feature test will test the query tool auto complete feature.
    """
    first_schema_name = ""
    second_schema_name = ""
    first_table_name = ""
    second_table_name = ""

    scenarios = [
        ("Query tool auto complete feature test", dict())
    ]

    def before(self):
        self.page.wait_for_spinner_to_disappear()

        self.page.add_server(self.server)

        self.first_schema_name = "test_schema" + \
                                 str(secrets.choice(range(1000, 2000)))
        test_utils.create_schema(self.server, self.test_db,
                                 self.first_schema_name)

        self.second_schema_name = "comp_schema" + \
                                  str(secrets.choice(range(2000, 3000)))
        test_utils.create_schema(self.server, self.test_db,
                                 self.second_schema_name)

        self.first_table_name = "auto_comp_" + \
                                str(secrets.choice(range(1000, 2000)))
        test_utils.create_table(self.server, self.test_db,
                                self.first_table_name)

        self.second_table_name = "auto_comp_" + \
                                 str(secrets.choice(range(2000, 3000)))
        test_utils.create_table(self.server, self.test_db,
                                self.second_table_name)

        self.page.expand_database_node("Server", self.server['name'],
                                       self.server['db_password'],
                                       self.test_db)

        self.page.open_query_tool()
        self.page.wait_for_spinner_to_disappear()

    def runTest(self):
        # Test case for keywords
        select_keyword = "SELECT * FROM public."
        print("\nAuto complete ALTER keyword... ", file=sys.stderr, end="")
        self._auto_complete("A", "ALTER")
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete BEGIN keyword... ", file=sys.stderr, end="")
        self._auto_complete("BE", "BEGIN")
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete CASCADED keyword... ", file=sys.stderr, end="")
        self._auto_complete("CAS", "CASCADED")
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete SELECT keyword... ", file=sys.stderr, end="")
        self._auto_complete("SE", "SELECT")
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete pg_backend_pid() function ... ",
              file=sys.stderr, end="")
        self._auto_complete("SELECT pg_catalog.pg_", "pg_backend_pid()")
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete current_query() function ... ",
              file=sys.stderr, end="")
        self._auto_complete("SELECT pg_catalog.current_", "current_query()")
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete function with argument ... ",
              file=sys.stderr, end="")
        self._auto_complete("SELECT pg_catalog.pg_st",
                            "pg_stat_file(filename)")
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete schema other than default start with test_ ... ",
              file=sys.stderr, end="")
        self._auto_complete("SELECT * FROM te", self.first_schema_name)
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete schema other than default starts with comp_ ... ",
              file=sys.stderr, end="")
        self._auto_complete("SELECT * FROM co", self.second_schema_name)
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete first table in public schema ... ",
              file=sys.stderr, end="")
        self._auto_complete(select_keyword, self.first_table_name)
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete second table in public schema ... ",
              file=sys.stderr, end="")
        self._auto_complete(select_keyword, self.second_table_name)
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete JOIN second table with after schema name ... ",
              file=sys.stderr, end="")
        query = select_keyword + self.first_table_name + \
            " JOIN public."
        self._auto_complete(query, self.second_table_name)
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete JOIN ON some columns ... ",
              file=sys.stderr, end="")
        query = select_keyword + self.first_table_name + \
            " JOIN public." + self.second_table_name + " ON " + \
            self.second_table_name + "."
        expected_string = "some_column = " + self.first_table_name + \
                          ".some_column"
        self._auto_complete(query, expected_string)
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

        print("Auto complete JOIN ON some columns using table alias ... ",
              file=sys.stderr, end="")
        query = select_keyword + self.first_table_name + \
            " t1 JOIN public." + self.second_table_name + " t2 ON t2."
        self._auto_complete(query, "some_column = t1.some_column")
        print("OK.", file=sys.stderr)
        self.page.clear_query_tool()

    def after(self):
        self.page.close_query_tool(False)
        self.page.remove_server(self.server)
        test_utils.delete_table(self.server, self.test_db,
                                self.first_table_name)
        test_utils.delete_table(self.server, self.test_db,
                                self.second_table_name)

    def _auto_complete(self, word, expected_string):
        self.page.fill_codemirror_area_with(word)
        hint_displayed = False
        retry = 3
        while retry > 0:
            ActionChains(self.page.driver).key_down(
                Keys.CONTROL).send_keys(Keys.SPACE).key_up(
                Keys.CONTROL).perform()
            if self.page.check_if_element_exist_by_xpath(
                    QueryToolLocators.code_mirror_hint_box_xpath, 15):
                hint_displayed = True
                break
            else:
                retry -= 1
        if hint_displayed:
            # if IntelliSense is present then verify this
            self.page.find_by_xpath(
                QueryToolLocators.code_mirror_hint_item_xpath.format(
                    expected_string))
        else:
            # if no IntelliSense is present it means there is only one option
            #  so check if required string is present in codeMirror
            code_mirror = self.driver.find_elements(
                By.XPATH, QueryToolLocators.code_mirror_data_xpath)
            for data in code_mirror:
                code_mirror_text = data.text
                print("Single entry..........")
                if expected_string not in code_mirror_text:
                    print("single entry exception.........")
                    raise RuntimeError("Required String %s is not "
                                       "present" % expected_string)
