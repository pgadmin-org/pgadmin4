##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.pgagent.tests import utils as\
    pgagent_utils
from . import utils as schedules_utils


class PgAgentDeleteScheduleTestCase(BaseTestGenerator):
    """This class will test the delete pgAgent job schedule API"""
    scenarios = utils.generate_scenarios("pgagent_delete_schedule",
                                         schedules_utils.test_cases)

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

        sch_name = "test_schedule_delete%s" % str(uuid.uuid4())[1:8]
        self.schedule_id = pgagent_utils.create_pgagent_schedule(
            self, sch_name, self.job_id)

        # multiple schedules
        if self.is_list:
            sch_name2 = "test_schedule_delete%s" % str(uuid.uuid4())[1:8]
            self.schedule_id_2 = pgagent_utils.create_pgagent_schedule(
                self, sch_name2, self.job_id)

    def runTest(self):
        """This function will deletes pgAgent job schedule"""
        if self.is_positive_test:
            if self.is_list:
                self.data['ids'] = [self.schedule_id, self.schedule_id_2]
                response = schedules_utils.api_delete(self, '')
            else:
                response = schedules_utils.api_delete(self)

            # Assert response
            utils.assert_status_code(self, response)

        is_present = pgagent_utils.verify_pgagent_schedule(self)
        self.assertFalse(
            is_present, "pgAgent schedule was not deleted successfully")

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
