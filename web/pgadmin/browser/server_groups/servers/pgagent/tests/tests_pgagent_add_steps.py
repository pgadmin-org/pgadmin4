##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import simplejson as json
import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgagent_utils


class PgAgentAddStepTestCase(BaseTestGenerator):
    """This class will test the add step in the pgAgent job API"""
    scenarios = [
        ('Create step for pgAgent job', dict(
            url='/browser/pga_jobstep/obj/'))
    ]

    def setUp(self):
        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)
        name = "test_job_get%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

    def runTest(self):
        self.pgagent_step_name = "test_step_add%s" % str(uuid.uuid4())[1:8]
        data = {
            'jstjobid': self.job_id,
            'jstname': self.pgagent_step_name,
            'jstdesc': '',
            'jstenabled': True,
            'jstkind': True,
            'jstconntype': True,
            'jstcode': 'SELECT 1;',
            'jstconnstr': None,
            'jstdbname': 'postgres',
            'jstonerror': 'f',
            'jstnextrun': '',
        }

        response = self.tester.post(
            '{0}{1}/{2}/{3}/'.format(
                self.url, str(utils.SERVER_GROUP), str(self.server_id),
                str(self.job_id)
            ),
            data=json.dumps(data),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

        response_data = json.loads(response.data)
        self.step_id = response_data['node']['_id']
        is_present = pgagent_utils.verify_pgagent_step(self)
        self.assertTrue(
            is_present, "pgAgent step was not created successfully"
        )

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
