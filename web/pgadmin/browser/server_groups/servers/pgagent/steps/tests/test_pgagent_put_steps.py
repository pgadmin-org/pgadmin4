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
from pgadmin.browser.server_groups.servers.pgagent.tests import utils as \
    pgagent_utils
from . import utils as steps_utils


class PgAgentPutStepTestCase(BaseTestGenerator):
    """This class will test the update pgAgent steps API"""
    scenarios = utils.generate_scenarios("pgagent_put_step",
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

        name = "test_job_update%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

        step_name = "test_step_update%s" % str(uuid.uuid4())[1:8]
        self.step_id = pgagent_utils.create_pgagent_step(
            self, step_name, self.job_id)

    def runTest(self):
        """This function will update pgAgent steps"""
        self.data['jstid'] = str(self.step_id)

        if self.is_positive_test:
            response = steps_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = steps_utils.api_put(self)
            else:
                if "step_id" in self.data:
                    self.step_id = self.data["step_id"]
                response = steps_utils.api_put(self)
            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_step(self)
        pgagent_utils.delete_pgagent_job(self)
