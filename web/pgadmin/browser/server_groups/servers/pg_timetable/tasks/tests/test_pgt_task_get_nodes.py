##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.pg_timetable.tests import \
    utils as pgt_utils
from . import utils as tasks_utils


class PgtTaskGetNodesTestCase(BaseTestGenerator):
    """This class will test the get nodes pgTimetable chain task API"""
    scenarios = utils.generate_scenarios("pgt_task_get_nodes",
                                         tasks_utils.test_cases)

    def setUp(self):
        super().setUp()
        flag, msg = pgt_utils.is_valid_server_to_run_pgtimetable(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgt_utils.is_pgtimetable_installed_on_server(self)
        if not flag:
            self.skipTest(msg)

        self.data = self.test_data

        name = "test_chain_get_nodes%s" % str(uuid.uuid4())[1:8]
        self.chain_id = pgt_utils.create_pgtimetable_chain(self, name)

        if hasattr(self, 'task_orders'):
            self.task_ids = []
            for order in self.task_orders:
                task_name = "test_task_get_nodes%s" % str(uuid.uuid4())[1:8]
                self.task_ids.append(pgt_utils.create_pgtimetable_task(
                    self, task_name, self.chain_id, task_order=order))

        else:
            task_name = "test_task_get_nodes%s" % str(uuid.uuid4())[1:8]
            self.task_id = pgt_utils.create_pgtimetable_task(
                self, task_name, self.chain_id)

            if self.is_list:
                task_name2 = "test_task_get_nodes%s" % str(uuid.uuid4())[1:8]
                self.task_id_2 = pgt_utils.create_pgtimetable_task(
                    self, task_name2, self.chain_id)

    def runTest(self):
        """This function will get pgTimetable chain task nodes"""
        if self.is_positive_test:
            if self.is_list:
                response = tasks_utils.api_get(self, '')
            else:
                response = tasks_utils.api_get(self)

            utils.assert_status_code(self, response)

            if hasattr(self, 'expected_task_order'):
                label_prefixes = [
                    row['label'].split(':')[0]
                    for row in response.json['data']
                ]
                self.assertEqual(label_prefixes, self.expected_task_order)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = tasks_utils.api_get(self)
            else:
                response = tasks_utils.api_get(self)
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        pgt_utils.delete_pgtimetable_chain(self)
