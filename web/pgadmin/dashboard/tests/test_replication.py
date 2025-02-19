##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils import server_utils
from regression import parent_node_dict
import json


class DashboardReplicationTestCase(BaseTestGenerator):
    """
    This class validates the version in range functionality
    by defining different version scenarios; where dict of
    parameters describes the scenario appended by test name.
    """

    scenarios = [(
        'TestCase for replication slots', dict(
            endpoint='/dashboard/replication_slots',
            data=[],
        )), (
        'TestCase for replication stats', dict(
            endpoint='/dashboard/replication_stats',
            data=[],
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["info"] == "Server connected.":

            url = self.endpoint + '/{0}'.format(self.server_id)
            response = self.tester.get(url)
            self.assertEqual(response.status_code, 200)
        else:
            raise Exception("Error while connecting server to add the"
                            " database.")

    def tearDown(self):
        pass
