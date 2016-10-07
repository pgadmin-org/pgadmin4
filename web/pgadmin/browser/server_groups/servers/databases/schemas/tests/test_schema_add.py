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
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils


class SchemaAddTestCase(BaseTestGenerator):
    """ This class will add new schema under database node. """
    scenarios = [
        # Fetching default URL for schema node.
        ('Check Schema Node URL', dict(url='/browser/schema/obj/'))
    ]

    def runTest(self):
        """ This function will add schema under database node. """
        database_info = parent_node_dict["database"][-1]
        server_id = database_info["server_id"]

        db_id = database_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 server_id,
                                                 db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database to add the schema.")
        db_user = self.server["username"]
        data = {
            "deffuncacl": [],
            "defseqacl": [],
            "deftblacl": [],
            "deftypeacl": [],
            "name": "test_schema_{0}".format(str(uuid.uuid4())[1:6]),
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
        response = self.tester.post(self.url + str(utils.SERVER_GROUP) + '/' +
                                    str(server_id) + '/' + str(db_id) +
                                    '/', data=json.dumps(data),
                                    content_type='html/json')
        self.assertEquals(response.status_code, 200)
