##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import json
import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as tablespace_utils


class TableSpaceDeleteTestCase(BaseTestGenerator):
    """This class has delete table space scenario"""
    scenarios = [
        # Fetching default URL for tablespace node.
        ('Check Tablespace Node', dict(url='/browser/tablespace/obj/'))
    ]

    def setUp(self):
        super().setUp()
        if not self.server['tablespace_path']\
                or self.server['tablespace_path'] is None:
            message = "Tablespace delete test case. Tablespace path" \
                      " not configured for server: %s" % self.server['name']
            # Skip the test case if tablespace_path not found.
            self.skipTest(message)
        self.tablespace_name = "tablespace_delete_%s" % str(uuid.uuid4())[1:8]
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        self.tablespace_id = tablespace_utils.create_tablespace(
            self.server, self.tablespace_name)
        tablespace_dict = {
            "tablespace_id": self.tablespace_id,
            "tablespace_name": self.tablespace_name,
            "server_id": self.server_id
        }
        utils.write_node_info("tsid", tablespace_dict)

    def runTest(self):
        """This function tests the delete table space api"""
        tablespace_count = tablespace_utils.verify_table_space(
            self.server, self.tablespace_name)
        if tablespace_count == 0:
            raise Exception("No tablespace(s) to delete!!!")

        response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) +
            '/' + str(self.server_id) + '/' + str(self.tablespace_id),
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 200)
        delete_response_data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(delete_response_data['success'], 1)

    def tearDown(self):
        """This function deletes the tablespace"""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        tablespace_utils.delete_tablespace(connection, self.tablespace_name)
