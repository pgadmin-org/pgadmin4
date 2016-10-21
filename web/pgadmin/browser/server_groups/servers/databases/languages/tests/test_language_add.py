# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
from __future__ import print_function
import json
import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from . import utils as language_utils


class LanguagesAddTestCase(BaseTestGenerator):
    scenarios = [
        ('Language add test case', dict(url='/browser/language/obj/'))
    ]

    def setUp(self):
        self.server_data = parent_node_dict["database"][-1]
        self.server_id = self.server_data["server_id"]
        self.db_id = self.server_data['db_id']
        self.db_name = self.server_data["db_name"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")

    def runTest(self):
        """This function will add language under test database."""

        db_user = self.server['username']

        self.data = {
            "lanacl": [],
            "laninl": "btint2sortsupport",
            "lanowner": db_user,
            "lanproc": "plpgsql_call_handler",
            "lanval": "fmgr_c_validator",
            "name": "language_%s" % str(uuid.uuid4())[1:4],
            "seclabels": [],
            "template_list":
                [
                    "plperl",
                    "plperlu",
                    "plpython2u",
                    "plpython3u",
                    "plpythonu",
                    "pltcl",
                    "pltclu"
                ],
            "trusted": "true"
                }

        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(
                self.db_id) + '/',
            data=json.dumps(self.data),
            content_type='html/json')

        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function delete added language and
        disconnect the test database."""

        language_utils.delete_language(self.server, self.db_name,
                                       self.data['name'])
        database_utils.disconnect_database(self, self.server_id, self.db_id)

