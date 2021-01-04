##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.pgagent.tests import utils as \
    pgagent_utils
from . import utils as steps_utils


class PgAgentDeleteStepTestCase(BaseTestGenerator):
    """This class will test the delete pgAgent job step API"""
    scenarios = utils.generate_scenarios("pgagent_delete_step",
                                         steps_utils.test_cases)

    def setUp(self):
        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)

        # Load test data
        self.data = self.test_data

        name = "test_job_delete%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

        step_name = "test_step_delete%s" % str(uuid.uuid4())[1:8]
        self.step_id = pgagent_utils.create_pgagent_step(
            self, step_name, self.job_id)

        if self.is_list:
            step_name_2 = "test_step_delete%s" % str(uuid.uuid4())[1:8]
            self.step_id_2 = pgagent_utils.create_pgagent_step(
                self, step_name_2, self.job_id)

    def runTest(self):
        """This function will deletes pgAgent job step"""
        if self.is_positive_test:
            if self.is_list:
                self.data['ids'] = [self.step_id, self.step_id_2]
                response = steps_utils.api_delete(self, '')
            else:
                response = steps_utils.api_delete(self)

            # Assert response
            utils.assert_status_code(self, response)

        is_present = pgagent_utils.verify_pgagent_step(self)
        self.assertFalse(
            is_present, "pgAgent step was not deleted successfully")

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
