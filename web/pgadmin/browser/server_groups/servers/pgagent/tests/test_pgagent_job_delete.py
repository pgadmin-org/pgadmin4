##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgagent_utils


class PgAgentDeleteTestCase(BaseTestGenerator):
    """This class will test the delete pgAgent job API"""
    # Generates scenarios
    scenarios = utils.generate_scenarios("pgagent_job_delete",
                                         pgagent_utils.test_cases)

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

        if self.is_list:
            name2 = "test_job2_delete%s" % str(uuid.uuid4())[1:8]
            self.job_id2 = pgagent_utils.create_pgagent_job(self, name2)

    def runTest(self):
        """This function will deletes pgAgent job"""
        if self.is_positive_test:
            if self.is_list:
                self.data['ids'] = [self.job_id, self.job_id2]
                response = pgagent_utils.api_delete(self, '')
            else:
                response = pgagent_utils.api_delete(self)

            # Assert response
            utils.assert_status_code(self, response)

        is_present = pgagent_utils.verify_pgagent_job(self)
        self.assertFalse(
            is_present, "pgAgent job was not deleted successfully")

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
        if self.is_list:
            pgagent_utils.delete_pgagent_job(self, self.job_id2)
