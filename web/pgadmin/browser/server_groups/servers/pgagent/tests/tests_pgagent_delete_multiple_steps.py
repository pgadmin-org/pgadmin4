##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgagent_utils


class PgAgentDeleteMultipleStepsTestCase(BaseTestGenerator):
    """This class will test the delete pgAgent job steps API"""
    scenarios = [
        ('Delete multiple pgAgent steps',
         dict(url='/browser/pga_jobstep/obj/'))
    ]

    def setUp(self):
        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)
        name = "test_multiple_st_job_delete%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)
        step_name1 = "test_multiple_step1_delete%s" % str(uuid.uuid4())[1:8]
        self.step_id1 = pgagent_utils.create_pgagent_step(
            self, step_name1, self.job_id)
        step_name2 = "test_multiple_step2_delete%s" % str(uuid.uuid4())[1:8]
        self.step_id2 = pgagent_utils.create_pgagent_step(
            self, step_name2, self.job_id)

    def runTest(self):
        """This function will deletes pgAgent job schedule"""
        response = self.tester.delete(
            '{0}{1}/{2}/{3}/'.format(
                self.url, str(utils.SERVER_GROUP), str(self.server_id),
                str(self.job_id)
            ),
            data=json.dumps({'ids': [self.step_id1, self.step_id2]}),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
