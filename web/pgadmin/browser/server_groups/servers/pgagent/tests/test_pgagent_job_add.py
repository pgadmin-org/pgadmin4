##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from unittest.mock import patch

import json
import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgagent_utils


class PgAgentAddTestCase(BaseTestGenerator):
    """This class will test the add pgAgent job API"""
    # Generates scenarios
    scenarios = utils.generate_scenarios("pgagent_job_create",
                                         pgagent_utils.test_cases)

    def setUp(self):
        # Load test data
        super().setUp()
        self.data = self.test_data

        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)

    def runTest(self):
        """This function will adds pgAgent job"""
        self.pgagent_job = "test_job_add%s" % str(uuid.uuid4())[1:8]

        if "jobname" in self.data:
            self.data["jobname"] = self.pgagent_job

        if self.is_positive_test:
            response = pgagent_utils.api_create(self)

            # Assert response
            utils.assert_status_code(self, response)

            # Verify in backend
            response_data = json.loads(response.data)
            self.job_id = response_data['node']['_id']
            is_present = pgagent_utils.verify_pgagent_job(self)
            self.assertTrue(is_present,
                            "pgAgent job was not created successfully")

        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = pgagent_utils.api_create(self)

                    # Assert response
                    utils.assert_status_code(self, response)
                    utils.assert_error_message(self, response)
            else:
                response = pgagent_utils.api_create(self)

                # Assert response
                utils.assert_status_code(self, response)
                utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        if self.is_positive_test:
            pgagent_utils.delete_pgagent_job(self)
