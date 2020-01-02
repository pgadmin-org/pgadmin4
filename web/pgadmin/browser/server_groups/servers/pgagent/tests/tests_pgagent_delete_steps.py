##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgagent_utils


class PgAgentDeleteStepTestCase(BaseTestGenerator):
    """This class will test the delete pgAgent job step API"""
    scenarios = [
        ('Delete pgAgent Step', dict(url='/browser/pga_jobstep/obj/'))
    ]

    def setUp(self):
        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)
        name = "test_job_delete%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)
        step_name = "test_step_delete%s" % str(uuid.uuid4())[1:8]
        self.step_id = pgagent_utils.create_pgagent_step(
            self, step_name, self.job_id)

    def runTest(self):
        """This function will deletes pgAgent job step"""
        response = self.tester.delete(
            '{0}{1}/{2}/{3}/{4}'.format(
                self.url, str(utils.SERVER_GROUP), str(self.server_id),
                str(self.job_id), str(self.step_id)
            ),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)
        is_present = pgagent_utils.verify_pgagent_step(self)
        self.assertFalse(
            is_present, "pgAgent step was not deleted successfully"
        )

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
