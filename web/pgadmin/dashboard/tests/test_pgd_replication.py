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
from regression.python_test_utils import test_utils
import json


class DashboardReplicationTestCase(BaseTestGenerator):
    """
    This class validates the version in range functionality
    by defining different version scenarios; where dict of
    parameters describes the scenario appended by test name.
    """

    scenarios = [(
        'TestCase for cluster nodes', dict(
            endpoint='/dashboard/pgd/cluster_nodes',
        )), (
        'TestCase for raft status', dict(
            endpoint='/dashboard/pgd/raft_status',
        )), (
        'TestCase for charts', dict(
            endpoint='/dashboard/pgd/charts',
            query='chart_names=pgd_replication_lag',
        )), (
        'TestCase for incoming replication slots', dict(
            endpoint='/dashboard/pgd/incoming',
        )), (
        'TestCase for outgoing replication slots', dict(
            endpoint='/dashboard/pgd/outgoing',
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["info"] == "Server connected.":
            if server_response['data']['replication_type'] != 'pgd':
                self.skipTest('Not a PGD Cluster')
            url = self.endpoint + '/{0}'.format(self.server_id)
            if hasattr(self, 'query'):
                url = '{0}?{1}'.format(url, self.query)
            response = self.tester.get(url)
            self.assertEqual(response.status_code, 200)
        else:
            raise Exception("Error while connecting server to add the"
                            " database.")

    def tearDown(self):
        pass
