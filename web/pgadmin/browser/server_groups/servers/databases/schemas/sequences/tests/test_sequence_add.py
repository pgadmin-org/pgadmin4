##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils


class SequenceAddTestCase(BaseTestGenerator):
    """ This class will add new sequence(s) under schema node. """
    skip_on_database = ['gpdb']
    scenarios = [
        # Fetching default URL for sequence node.
        (
            'Create sequence with positive values',
            dict(
                url='/browser/sequence/obj/',
                # Valid optional data
                data={
                    "cache": "1",
                    "cycled": True,
                    "increment": "1",
                    "maximum": "100000",
                    "minimum": "1",
                    "name": "test_sequence_add_%s" % (str(uuid.uuid4())[1:8]),
                    "securities": [],
                    "start": "100"
                }
            )
        ),
        (
            'Create sequence with negative values',
            dict(
                url='/browser/sequence/obj/',
                # Valid optional data
                data={
                    "cache": "1",
                    "cycled": True,
                    "increment": "-5",
                    "maximum": "-10",
                    "minimum": "-40",
                    "name": "test_sequence_add_%s" % (str(uuid.uuid4())[1:8]),
                    "securities": [],
                    "start": "-30"
                }
            )
        )
    ]

    def setUp(self):
        super(SequenceAddTestCase, self).setUp()

    def runTest(self):
        """This function will add sequence(s) under schema node."""
        db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add sequence.")
        schema_id = schema_info["schema_id"]
        schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      db_name,
                                                      schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add sequence.")
        db_user = self.server["username"]

        common_data = {
            "relacl": [
                {
                    "grantee": db_user,
                    "grantor": db_user,
                    "privileges":
                        [
                            {
                                "privilege_type": "r",
                                "privilege": True,
                                "with_grant": True
                            },
                            {
                                "privilege_type": "w",
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
            "schema": schema_name,
            "seqowner": db_user,
        }

        self.data.update(common_data)

        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(schema_id) + '/',
            data=json.dumps(self.data),
            content_type='html/json')
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
