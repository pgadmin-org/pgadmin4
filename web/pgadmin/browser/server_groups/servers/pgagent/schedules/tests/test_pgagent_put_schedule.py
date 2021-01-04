##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.pgagent.tests import utils as \
    pgagent_utils
from . import utils as schedules_utils


class PgAgentPutScheduleTestCase(BaseTestGenerator):
    """This class will test the update pgAgent schedule API"""
    # Generates scenarios
    scenarios = utils.generate_scenarios("pgagent_put_schedule",
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

        name = "test_job_update%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

        sch_name = "test_schedule_update%s" % str(uuid.uuid4())[1:8]
        self.schedule_id = pgagent_utils.create_pgagent_schedule(
            self, sch_name, self.job_id)

    def runTest(self):
        """This function will update pgAgent schedule"""

        # Check and Delete entry for pga_exception table for the specified
        # date and time as no primary key is defined for pga_exception table
        # and there is a unique constraint for date and time. So when we run
        # the test cases multiple time then it will fail with unique
        # constraint error.
        if 'jscexceptions' in self.data:
            exception_data = self.data['jscexceptions']
            if 'added' in exception_data:
                pgagent_utils.delete_pgagent_exception(
                    self, self.data['jscexceptions']['added'][0]['jexdate'],
                    self.data['jscexceptions']['added'][0]['jextime'])
            elif 'changed' in exception_data:
                date = self.data['jscexceptions']['changed'][0]['jexdate']
                time = self.data['jscexceptions']['changed'][0]['jextime']
                self.excp_id = pgagent_utils.create_pgagent_exception(
                    self, self.schedule_id, date, time)
                self.data['jscexceptions']['changed'][0]['jexid'] = \
                    self.excp_id

            elif 'deleted' in exception_data:
                date = self.data['jscexceptions']['deleted'][0]['jexdate']
                time = self.data['jscexceptions']['deleted'][0]['jextime']
                self.excp_id = pgagent_utils.create_pgagent_exception(
                    self, self.schedule_id, date, time)
                self.data['jscexceptions']['deleted'][0]['jexid'] = \
                    self.excp_id

        self.data['jscid'] = str(self.schedule_id)

        if self.is_positive_test:
            response = schedules_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = pgagent_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_schedule(self)
        pgagent_utils.delete_pgagent_job(self)
