##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.pgagent.tests import utils as\
    pgagent_utils
from . import utils as schedules_utils


class PgAgentGetNodesScheduleTestCase(BaseTestGenerator):
    """This class will test the get nodes pgAgent job schedule API"""
    scenarios = utils.generate_scenarios("pgagent_get_nodes_schedule",
                                         schedules_utils.test_cases)

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

        name = "test_job_get_nodes%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

        sch_name = "test_schedule_get_nodes%s" % str(uuid.uuid4())[1:8]
        self.schedule_id = pgagent_utils.create_pgagent_schedule(
            self, sch_name, self.job_id)

        if self.is_list:
            sch_name2 = "test_schedule_get_nodes%s" % str(uuid.uuid4())[1:8]
            self.schedule_id_2 = pgagent_utils.create_pgagent_schedule(
                self, sch_name2, self.job_id)

    def runTest(self):
        """This function will gets pgAgent job schedule"""
        if self.is_positive_test:
            if self.is_list:
                response = schedules_utils.api_get(self, '')
            else:
                response = schedules_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = schedules_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
