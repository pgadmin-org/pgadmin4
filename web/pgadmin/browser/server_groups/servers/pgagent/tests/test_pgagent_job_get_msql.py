##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from unittest.mock import patch

import simplejson as json
import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgagent_utils


class PgAgentGetMsqlTestCase(BaseTestGenerator):
    """This class will test the put pgAgent job API"""
    # Generates scenarios
    scenarios = utils.generate_scenarios("pgagent_job_msql",
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

        name = "test_job_msql%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

    def runTest(self):
        """This function will get msql for pgAgent job"""

        if self.is_positive_test:
            url_encode_data = self.data
            url_encode_data["jobid"] = self.job_id

            response = pgagent_utils.api_get_msql(self, url_encode_data)

            # Assert response
            utils.assert_status_code(self, response)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
