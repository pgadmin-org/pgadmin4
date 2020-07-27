##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import uuid
import json

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as language_utils


class LanguagesDeleteMultipleTestCase(BaseTestGenerator):
    scenarios = utils.generate_scenarios('delete_multiple',
                                         language_utils.test_cases)

    def setUp(self):
        self.server_data = parent_node_dict["database"][-1]
        self.server_id = self.server_data["server_id"]
        self.db_id = self.server_data['db_id']
        self.db_name = self.server_data["db_name"]
        self.lang_names = ["language_%s" % str(uuid.uuid4())[1:8],
                           "language_%s" % str(uuid.uuid4())[1:8]]

        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")
        self.language_ids = [language_utils.create_language(
            self.server,
            self.db_name,
            self.lang_names[0]
        ),
            language_utils.create_language(
                self.server,
                self.db_name,
                self.lang_names[1])
        ]

    def runTest(self):
        """This function will delete languages under test database."""
        data = {'ids': self.language_ids}
        response = self.tester.delete("{0}{1}/{2}/{3}/".format(
            self.url, utils.SERVER_GROUP, self.server_id, self.db_id),
            follow_redirects=True,
            data=json.dumps(data),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function disconnect the test database."""

        database_utils.disconnect_database(self, self.server_id, self.db_id)
