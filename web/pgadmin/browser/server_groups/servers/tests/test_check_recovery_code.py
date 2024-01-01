##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils
from regression import parent_node_dict
from unittest.mock import patch
import json


class CheckRecoveryCodeTestCase(BaseTestGenerator):
    """
    This class will try to test cover the wal_reply code.
    """

    scenarios = utils.generate_scenarios('wal_replay_server',
                                         servers_utils.test_cases)

    def resume_wal_replay(self):
        return self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' + str(self.server_id))

    def pause_wal_replay(self):
        return self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' + str(self.server_id))

    def runTest(self):

        server_id = parent_node_dict["server"][-1]["server_id"]
        if not server_id:
            raise Exception("Server not found to test GET API")

        if self.mocking_required:

            with patch(self.mock_data['function_name'],
                       side_effect=[eval(self.mock_data['return_value'])]):
                response = self.run_test_cases()

                res = json.loads(response.data.decode('utf-8'))
                self.assertEqual(res['data']['in_recovery'], True)
                self.assertEqual(res['data']['wal_pause'], self.pause)
                self.assertEqual(response.status_code,
                                 self.expected_data["status_code"])
        else:
            response = self.run_test_cases()
            self.assertEqual(response.status_code,
                             self.expected_data["status_code"])

    def run_test_cases(self):

        if hasattr(self, 'pause') and self.pause:
            response = self.pause_wal_replay()
        else:
            response = self.resume_wal_replay()

        return response
