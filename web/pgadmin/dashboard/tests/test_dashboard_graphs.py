##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils import server_utils
from regression import parent_node_dict
import json


class DashboardGraphsTestCase(BaseTestGenerator):
    """
    This class validates the version in range functionality
    by defining different version scenarios; where dict of
    parameters describes the scenario appended by test name.
    """

    scenarios = [(
        'TestCase for session_stats graph', dict(
            did=-1,
            chart_data={
                'session_stats': ['Total', 'Active', 'Idle'],
            }
        )), (
        'TestCase for tps_stats graph', dict(
            did=-1,
            chart_data={
                'tps_stats': ['Transactions', 'Commits', 'Rollbacks'],
            }
        )), (
        'TestCase for ti_stats graph', dict(
            did=-1,
            chart_data={
                'ti_stats': ['Inserts', 'Updates', 'Deletes'],
            }
        )), (
        'TestCase for to_stats graph', dict(
            did=-1,
            chart_data={
                'to_stats': ['Fetched', 'Returned'],
            }
        )), (
        'TestCase for bio_stats graph', dict(
            did=-1,
            chart_data={
                'bio_stats': ['Reads', 'Hits'],
            }
        )), (
        'TestCase for two graphs', dict(
            did=-1,
            chart_data={
                'session_stats': ['Total', 'Active', 'Idle'],
                'bio_stats': ['Reads', 'Hits'],
            }
        )), (
        'TestCase for five graphs', dict(
            did=-1,
            chart_data={
                'session_stats': ['Total', 'Active', 'Idle'],
                'tps_stats': ['Transactions', 'Commits', 'Rollbacks'],
                'ti_stats': ['Inserts', 'Updates', 'Deletes'],
                'to_stats': ['Fetched', 'Returned'],
                'bio_stats': ['Reads', 'Hits'],
            }
        )), (
        'TestCase for no graph', dict(
            did=-1,
            chart_data={},
        ))
    ]

    def setUp(self):
        pass

    def getStatsUrl(self, sid=-1, did=-1, chart_names=''):
        base_url = '/dashboard/dashboard_stats'
        base_url = base_url + '/' + str(sid)
        base_url += '/' + str(did) if did > 0 else ''
        base_url += '?chart_names=' + chart_names
        return base_url

    def runTest(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["info"] == "Server connected.":

            url = self.getStatsUrl(self.server_id, self.did,
                                   ",".join(self.chart_data.keys()))
            response = self.tester.get(url)
            self.assertEqual(response.status_code, 200)

            resp_data = json.loads(response.data)

            # All requested charts received
            self.assertEqual(len(resp_data.keys()),
                             len(self.chart_data.keys()))

            # All requested charts data received
            for chart_name, chart_vals in self.chart_data.items():
                self.assertEqual(set(resp_data[chart_name].keys()),
                                 set(chart_vals))

        else:
            raise Exception("Error while connecting server to add the"
                            " database.")

    def tearDown(self):
        pass
