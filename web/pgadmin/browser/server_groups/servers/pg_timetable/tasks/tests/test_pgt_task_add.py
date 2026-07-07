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
from pgadmin.browser.server_groups.servers.pg_timetable.tests import \
    utils as pgt_utils
from . import utils as tasks_utils


class PgtTaskAddTestCase(BaseTestGenerator):
    """This class will test the add task in the pgTimetable chain API"""
    scenarios = utils.generate_scenarios("pgt_task_create",
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

        name = "test_chain_add%s" % str(uuid.uuid4())[1:8]
        self.chain_id = pgt_utils.create_pgtimetable_chain(self, name)

    def runTest(self):
        self.pgt_task_name = "test_task_add%s" % str(uuid.uuid4())[1:8]

        if "task_name" in self.data:
            self.data["task_name"] = self.pgt_task_name

        if self.is_positive_test:
            response = tasks_utils.api_create(self)

            utils.assert_status_code(self, response)

            response_data = json.loads(response.data)
            self.task_id = response_data['node']['_id']
            is_present = pgt_utils.verify_pgtimetable_task(self)
            self.assertTrue(is_present,
                            "pgTimetable task was not created successfully.")
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = tasks_utils.api_create(self)

                    utils.assert_status_code(self, response)
                    utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        pgt_utils.delete_pgtimetable_chain(self)
