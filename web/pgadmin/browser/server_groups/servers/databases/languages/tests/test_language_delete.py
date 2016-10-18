# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

from __future__ import print_function
import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from . import utils as language_utils


class LanguagesDeleteTestCase(BaseTestGenerator):
    scenarios = [
        ('Language delete test case', dict(url='/browser/language/obj/'))
    ]

    def setUp(self):
        self.server_data = parent_node_dict["database"][-1]
        self.server_id = self.server_data["server_id"]
        self.db_id = self.server_data['db_id']
        self.db_name = self.server_data["db_name"]
        self.lang_name = "language_%s" % str(uuid.uuid4())[1:4]

        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")
        self.language_id = language_utils.create_language(self.server,
                                                          self.db_name,
                                                          self.lang_name)

    def runTest(self):
        """This function will delete language under test database."""

        response = self.tester.delete("{0}{1}/{2}/{3}/{4}".format(
            self.url, utils.SERVER_GROUP, self.server_id, self.db_id,
            self.language_id), follow_redirects=True)
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function disconnect the test database."""

        database_utils.disconnect_database(self, self.server_id, self.db_id)
