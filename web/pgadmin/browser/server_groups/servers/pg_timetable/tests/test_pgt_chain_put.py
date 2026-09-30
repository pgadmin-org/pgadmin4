##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from unittest.mock import patch

import json
import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgt_utils


class PgtChainPutTestCase(BaseTestGenerator):
    """This class will test the put pgTimetable chain API"""
    scenarios = utils.generate_scenarios("pgt_chain_put",
                                         pgt_utils.test_cases)

    def setUp(self):
        super().setUp()
        flag, msg = pgt_utils.is_valid_server_to_run_pgtimetable(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgt_utils.is_pgtimetable_installed_on_server(self)
        if not flag:
            self.skipTest(msg)

        self.data = self.test_data

        name = "test_chain_put%s" % str(uuid.uuid4())[1:8]
        self.chain_id = pgt_utils.create_pgtimetable_chain(self, name)

        if getattr(self, 'create_task_with_params', False):
            task_name = "test_task_put%s" % str(uuid.uuid4())[1:8]
            self.task_id = pgt_utils.create_pgtimetable_task_with_params(
                self, task_name, self.chain_id,
                [
                    {'order_id': 1, 'value': 'param_one'},
                    {'order_id': 2, 'value': 'param_two'},
                    {'order_id': 3, 'value': 'param_three'},
                ]
            )
            for ctask in self.data['ctasks']['changed']:
                if ctask.get('task_id') == 'PLACEHOLDER_TASK_ID':
                    ctask['task_id'] = self.task_id

    def runTest(self):
        """This function will update pgTimetable chain"""

        if self.is_positive_test:
            response = pgt_utils.api_put(self)

            utils.assert_status_code(self, response)

            if hasattr(self, 'verify_params'):
                actual = pgt_utils.verify_pgtimetable_task_params(self)
                self.assertEqual(
                    actual, [tuple(p) for p in self.verify_params]
                )
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = pgt_utils.api_put(self)
            else:
                response = pgt_utils.api_put(self)

            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        pgt_utils.delete_pgtimetable_chain(self)
