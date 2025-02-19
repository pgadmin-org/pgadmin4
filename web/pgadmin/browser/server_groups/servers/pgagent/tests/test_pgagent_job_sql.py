##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgagent_utils


class PgAgentSqlTestCase(BaseTestGenerator):
    """This class will test the get pgAgent job sql API"""
    scenarios = utils.generate_scenarios("pgagent_job_sql",
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

        name = "test_job_sql%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

        sch_name = "test_schedule_update%s" % str(uuid.uuid4())[1:8]
        self.schedule_id = pgagent_utils.create_pgagent_schedule(
            self, sch_name, self.job_id)

        self.excp_id = pgagent_utils.create_pgagent_exception(
            self, self.schedule_id, "2050-01-01", "12:00:00")

    def runTest(self):
        """This function will get pgAgent job sql"""

        if self.is_positive_test:
            response = pgagent_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = pgagent_utils.api_get(self)
            elif 'job_id' in self.data:
                # Non-existing job id
                existing_job_id = self.job_id
                self.job_id = self.data["job_id"]
                response = pgagent_utils.api_get(self)
                self.job_id = existing_job_id

                # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
