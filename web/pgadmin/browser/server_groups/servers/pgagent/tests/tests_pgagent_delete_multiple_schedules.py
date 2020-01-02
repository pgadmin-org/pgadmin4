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


class PgAgentDeleteMultipleSchedulesTestCase(BaseTestGenerator):
    """This class will test the delete pgAgent job schedule API"""
    scenarios = [
        ('Delete multiple pgAgent schedules',
         dict(url='/browser/pga_schedule/obj/'))
    ]

    def setUp(self):
        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)
        name = "test_multi_sc_job_delete%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)
        sch1_name = "test_multi_schedule1_delete%s" % str(uuid.uuid4())[1:8]
        self.schedule_id1 = pgagent_utils.create_pgagent_schedule(
            self, sch1_name, self.job_id)

        # Create one more schedule
        sch2_name = "test_multi_schedule2_delete%s" % str(uuid.uuid4())[1:8]
        self.schedule_id2 = pgagent_utils.create_pgagent_schedule(
            self, sch2_name, self.job_id)

    def runTest(self):
        """This function will deletes pgAgent job schedule"""
        response = self.tester.delete(
            '{0}{1}/{2}/{3}/'.format(
                self.url, str(utils.SERVER_GROUP), str(self.server_id),
                str(self.job_id)
            ),
            data=json.dumps({'ids': [self.schedule_id1, self.schedule_id2]}),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
