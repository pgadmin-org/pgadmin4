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


class PgAgentPutTestCase(BaseTestGenerator):
    """This class will test the put pgAgent job API"""
    # Generates scenarios
    scenarios = utils.generate_scenarios("pgagent_job_put",
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

        name = "test_job_put%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

    def runTest(self):
        """This function will put pgAgent job"""

        if 'jschedules' in self.data and 'added' in self.data['jschedules']:
            self.data['jschedules']['added'][0]['jscjobid'] = self.job_id

        if 'jsteps' in self.data and 'added' in self.data['jsteps']:
            self.data['jsteps']['added'][0]['jstjobid'] = self.job_id

        if self.is_positive_test:
            response = pgagent_utils.api_put(self)

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
        pgagent_utils.delete_pgagent_job(self)
