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
import json

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers.\
    tests import utils as fdw_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers.\
    foreign_servers.tests import utils as fsrv_utils
from regression import parent_node_dict
from regression import test_utils as utils


class ForeignTableAddTestCase(BaseTestGenerator):
    """
    This class will add foreign table under database node.
    """

    scenarios = [
        # Fetching default URL for foreign server node.
        ('Check foreign table Node', dict(url='/browser/foreign-table/obj/'))
    ]

    def setUp(self):
        """ This function will create foreign data wrapper and
        foreign server. """

        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.schema_id = self.schema_data['schema_id']
        self.fdw_name = "fdw_%s" % (str(uuid.uuid4())[1:4])
        self.fsrv_name = "fsrv_%s" % (str(uuid.uuid4())[1:4])
        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)
        self.fsrv_id = fsrv_utils.create_fsrv(self.server, self.db_name,
                                              self.fsrv_name, self.fdw_name)

    def runTest(self):
        """This function will add foreign table under test database."""

        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")

        fsrv_response = fsrv_utils.verify_fsrv(self.server, self.db_name,
                                               self.fsrv_name)
        if not fsrv_response:
            raise Exception("Could not find Foreign Server.")

        data = {
            "acl": [],
            "basensp": self.schema_name,
            "columns":
                [
                    {
                        "attname": "ename",
                        "datatype": "text",
                        "coloptions": []
                    }
                ],
            "constraints": [],
            "ftoptions": [],
            "inherits": [],
            "ftsrvname": self.fsrv_name,
            "name": "ft_%s" % (str(uuid.uuid4())[1:4]),
            "owner": self.server["username"],
            "relacl": [],
            "seclabels": [],
            "stracl": []
        }

        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) + '/'
            + str(self.schema_id) + '/', data=json.dumps(data),
            content_type='html/json')

        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """ This function disconnect the test database. """

        database_utils.disconnect_database(self, self.server_id, self.db_id)
