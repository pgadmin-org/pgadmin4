##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as package_utils


class PackageDeleteMultipleTestCase(BaseTestGenerator):
    """ This class will delete new package under test schema. """

    scenarios = [
        # Fetching default URL for package node.
        ('Fetch Package Node URL', dict(
            url='/browser/package/obj/'))
    ]

    def setUp(self):
        super().setUp()
        schema_info = parent_node_dict["schema"][-1]
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        server_con = server_utils.connect_server(self, self.server_id)

        if server_con:
            if "type" in server_con["data"]:
                if server_con["data"]["type"] == "pg":
                    message = "Packages are not supported by PG."
                    self.skipTest(message)

        self.pkg_name = "pkg_%s" % str(uuid.uuid4())[1:8]
        self.proc_name = "proc_%s" % str(uuid.uuid4())[1:8]

        self.pkg_name_1 = "pkg_%s" % str(uuid.uuid4())[1:8]
        self.proc_name_1 = "proc_%s" % str(uuid.uuid4())[1:8]

        self.package_ids = [package_utils.create_package(self.server,
                                                         self.db_name,
                                                         self.schema_name,
                                                         self.pkg_name,
                                                         self.proc_name),
                            package_utils.create_package(self.server,
                                                         self.db_name,
                                                         self.schema_name,
                                                         self.pkg_name_1,
                                                         self.proc_name_1)
                            ]

    def runTest(self):
        """ This function will delete package under test schema. """

        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")

        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")

        data = {'ids': self.package_ids}
        delete_response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/',
            data=json.dumps(data),
            content_type='html/json',
            follow_redirects=True)

        self.assertEqual(delete_response.status_code, 200)

    def tearDown(self):
        """This function disconnect the test database."""

        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
