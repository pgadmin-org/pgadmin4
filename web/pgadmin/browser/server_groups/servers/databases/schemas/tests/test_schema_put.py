# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import json
import uuid

from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from . import utils as schema_utils


class SchemaPutTestCase(BaseTestGenerator):
    """ This class will update the schema under database node. """
    scenarios = [
        # Fetching default URL for extension node.
        ('Check Schema Node URL', dict(url='/browser/schema/obj/'))
    ]

    def setUp(self):
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        # Change the db name, so that schema will create in newly created db
        self.schema_name = "schema_get_%s" % str(uuid.uuid4())[1:6]
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        self.schema_details = schema_utils.create_schema(connection,
                                                         self.schema_name)

    def runTest(self):
        """ This function will delete schema under database node. """

        server_id = self.database_info["server_id"]
        db_id = self.database_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 server_id, db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to delete the"
                            " schema.")
        schema_id = self.schema_details[0]
        schema_name = self.schema_details[1]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to update.")

        db_user = self.server["username"]
        data = {
            "deffuncacl": {
                "added":
                    [
                        {
                            "grantee": db_user,
                            "grantor": db_user,
                            "privileges":
                                [
                                    {
                                        "privilege_type": "X",
                                        "privilege": True,
                                        "with_grant": True
                                    }
                                ]
                        }
                    ]
            },
            "defseqacl": {
                "added":
                    [
                        {
                            "grantee": db_user,
                            "grantor": db_user,
                            "privileges":
                                [
                                    {
                                        "privilege_type": "r",
                                        "privilege": True,
                                        "with_grant": False
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
                    ]
            },
            "deftblacl": {
                "added":
                    [
                        {
                            "grantee": "public",
                            "grantor": db_user,
                            "privileges":
                                [
                                    {
                                        "privilege_type": "D",
                                        "privilege": True,
                                        "with_grant": False
                                    },
                                    {
                                        "privilege_type": "x",
                                        "privilege": True,
                                        "with_grant": False
                                    }
                                ]
                        }
                    ]
            },
            "id": schema_id
        }
        put_response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' + str(server_id) +
            '/' + str(db_id) + '/' + str(schema_id),
            data=json.dumps(data), follow_redirects=True)

        self.assertEquals(put_response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, server_id, db_id)

    def tearDown(self):
        pass
