##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as schema_utils
from unittest.mock import patch


class SchemaAddTestCase(BaseTestGenerator):
    """ This class will add new schema under database node. """
    scenarios = utils.generate_scenarios('schema_create',
                                         schema_utils.test_cases)

    def setUp(self):
        database_info = parent_node_dict["database"][-1]
        self.server_id = database_info["server_id"]
        self.db_id = database_info["db_id"]

    def create_schema(self, db_id):
        """
        This function create a schema and returns it
        :return: created schema response
        """
        is_nice = True
        state = "nice" if is_nice else "not nice"

        db_id = db_id or self.db_id
        return self.tester.post(self.url + str(utils.SERVER_GROUP) + '/' +
                                str(self.server_id) + '/' +
                                str(db_id) + '/',
                                data=json.dumps(self.data),
                                content_type='html/json')

    def runTest(self):
        """ This function will add schema under database node. """
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database to add the schema.")
        db_user = self.server["username"]
        self.data = {
            "deffuncacl": [],
            "defseqacl": [],
            "deftblacl": [],
            "deftypeacl": [],
            "name": "test_schema_{0}".format(str(uuid.uuid4())[1:8]),
            "namespaceowner": db_user,
            "nspacl": [
                {
                    "grantee": db_user,
                    "grantor": db_user,
                    "privileges":
                        [
                            {
                                "privilege_type": "C",
                                "privilege": True,
                                "with_grant": False
                            },
                            {
                                "privilege_type": "U",
                                "privilege": True,
                                "with_grant": False
                            }
                        ]
                }
            ],
            "seclabels": []
        }

        if self.is_positive_test:
            response = self.create_schema("")
        else:
            if hasattr(self, "error_db_id"):
                wrong_db_id = 99999
                response = self.create_schema(wrong_db_id)

            if hasattr(self, "missing_param"):
                del self.data['name']
                response = self.create_schema("")

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
