##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from unittest.mock import patch
import simplejson as json
import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.pgagent.tests import utils as \
    pgagent_utils
from . import utils as schedules_utils


class PgAgentAddScheduleTestCase(BaseTestGenerator):
    """This class will test the add schedule in the pgAgent job API"""
    scenarios = utils.generate_scenarios("pgagent_create_schedule",
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

        # Create a test job
        name = "test_job_get%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

    def runTest(self):
        # Check and Delete entry for pga_exception table for the above
        # date and time as no primary key is defined for pga_exception table
        # and there is a unique constraint for date and time. So when we run
        # the test cases multiple time then it will fail with unique
        # constraint error.
        if 'jscexceptions' in self.data:
            jexdate = self.data['jscexceptions'][0]["jexdate"]
            jextime = self.data['jscexceptions'][0]["jextime"]
            pgagent_utils.delete_pgagent_exception(self, jexdate, jextime)

        self.pgagent_schedule_name = "test_sch_add%s" % str(uuid.uuid4())[1:8]

        if "jscjobid" in self.data:
            self.data["jscjobid"] = self.job_id
            self.data["jscname"] = self.pgagent_schedule_name

        if self.is_positive_test:
            response = schedules_utils.api_create(self)

            # Assert response
            utils.assert_status_code(self, response)

            # Verify in backend
            response_data = json.loads(response.data)
            self.schedule_id = response_data['node']['_id']
            is_present = pgagent_utils.verify_pgagent_schedule(self)
            self.assertTrue(is_present,
                            "pgAgent schedule was not created successfully.")

        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = schedules_utils.api_create(self)

                    # Assert response
                    utils.assert_status_code(self, response)
                    utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
