##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import random

from regression.feature_utils.base_feature_test import BaseFeatureTest
from regression.python_test_utils import test_utils


class TableDdlFeatureTest(BaseFeatureTest):
    """ This class test acceptance test scenarios """

    scenarios = [
        ("Test table DDL generation", dict())
    ]

    test_table_name = ""

    def before(self):

        self.page.add_server(self.server)

    def runTest(self):
        self.test_table_name = "test_table" + str(random.randint(1000, 3000))
        test_utils.create_table(self.server, self.test_db,
                                self.test_table_name)

        self.page.toggle_open_server(self.server['name'])
        self.page.toggle_open_tree_item('Databases')
        self.page.toggle_open_tree_item(self.test_db)
        self.page.toggle_open_tree_item('Schemas')
        self.page.toggle_open_tree_item('public')
        self.page.toggle_open_tree_item('Tables')
        self.page.select_tree_item(self.test_table_name)
        self.page.click_tab("SQL")

        self.page.find_by_xpath(
            "//*[contains(@class,'CodeMirror-lines') and "
            "contains(.,'CREATE TABLE public.%s')]" % self.test_table_name)

    def after(self):
        self.page.remove_server(self.server)
