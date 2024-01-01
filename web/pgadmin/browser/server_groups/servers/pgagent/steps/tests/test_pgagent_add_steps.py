##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from unittest.mock import patch

import json
import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.pgagent.tests import utils as \
    pgagent_utils
from . import utils as steps_utils


class PgAgentAddStepTestCase(BaseTestGenerator):
    """This class will test the add step in the pgAgent job API"""
    scenarios = utils.generate_scenarios("pgagent_create_step",
                                         steps_utils.test_cases)

    def setUp(self):
        super().setUp()
        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)

        # Load test data
        self.data = self.test_data

        # Create job
        name = "test_job_get%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

    def runTest(self):
        self.pgagent_step_name = "test_step_add%s" % str(uuid.uuid4())[1:8]
        self.data["jstjobid"] = self.job_id
        self.data["jstname"] = self.pgagent_step_name

        if self.is_positive_test:
            response = steps_utils.api_create(self)

            # Assert response
            utils.assert_status_code(self, response)

            # Verify in backend
            response_data = json.loads(response.data)
            self.step_id = response_data['node']['_id']
            is_present = pgagent_utils.verify_pgagent_step(self)
            self.assertTrue(is_present,
                            "pgAgent step was not created successfully.")

        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = steps_utils.api_create(self)

                    # Assert response
                    utils.assert_status_code(self, response)
                    utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
