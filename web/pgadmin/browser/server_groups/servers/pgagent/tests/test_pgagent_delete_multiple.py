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


class PgAgentDeleteMultipleTestCase(BaseTestGenerator):
    """This class will test the delete multiple pgAgent job API"""
    scenarios = [
        ('Delete multiple pgAgent job', dict(url='/browser/pga_job/obj/'))
    ]

    def setUp(self):
        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)
        name1 = "test_job1_delete%s" % str(uuid.uuid4())[1:8]
        self.job_id1 = pgagent_utils.create_pgagent_job(self, name1)
        name2 = "test_job2_delete%s" % str(uuid.uuid4())[1:8]
        self.job_id2 = pgagent_utils.create_pgagent_job(self, name2)

    def runTest(self):
        """This function will deletes pgAgent job"""
        response = self.tester.delete(
            '{0}{1}/{2}/'.format(
                self.url, str(utils.SERVER_GROUP), str(self.server_id)
            ),
            data=json.dumps({'ids': [self.job_id1, self.job_id2]}),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """Clean up code"""
