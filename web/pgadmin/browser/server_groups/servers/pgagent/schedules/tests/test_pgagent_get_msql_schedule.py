##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.pgagent.tests import utils as \
    pgagent_utils
from . import utils as schedules_utils


class PgAgentGetMsqlScheduleTestCase(BaseTestGenerator):
    """This class will test the msql pgAgent job schedule API"""
    scenarios = utils.generate_scenarios("pgagent_msql_schedule",
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

        name = "test_job_msql%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

        sch_name = "test_schedule_msql%s" % str(uuid.uuid4())[1:8]
        self.schedule_id = pgagent_utils.create_pgagent_schedule(
            self, sch_name, self.job_id)

        if self.is_list:
            sch_name2 = "test_schedule_msql%s" % str(uuid.uuid4())[1:8]
            self.schedule_id_2 = pgagent_utils.create_pgagent_schedule(
                self, sch_name2, self.job_id)

    def runTest(self):
        """This function will get pgAgent msql job schedule"""
        if self.is_positive_test:
            url_encode_data = self.data
            if self.is_list:
                self.data["jschedules"]["changed"][0]["jscid"] = \
                    self.schedule_id
                self.data["jschedules"]["changed"][1]["jscid"] = \
                    self.schedule_id_2
                url_encode_data["jobid"] = self.job_id
                response = schedules_utils.\
                    api_get_msql(self, url_encode_data, '')
            else:
                url_encode_data["jscid"] = self.schedule_id
                response = schedules_utils.api_get_msql(self, url_encode_data)

            # Assert response
            utils.assert_status_code(self, response)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
