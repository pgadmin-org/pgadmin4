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


class PgAgentPutStepTestCase(BaseTestGenerator):
    """This class will test the update pgAgent steps API"""
    scenarios = [
        ('Update step with kind, description, code and error', dict(
            url='/browser/pga_jobstep/obj/',
            data={
                'jstdesc': 'Test Steps',
                'jstkind': False,
                'jstcode': 'SELECT 12345',
                'jstonerror': 'i'
            })),
        ('Update step with connection type and string', dict(
            url='/browser/pga_jobstep/obj/',
            data={
                'jstconntype': False,
                'jstconnstr':
                    'host=localhost port=5432 dbname=mydb connect_timeout=10'
            }))
    ]

    def setUp(self):
        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)
        name = "test_job_update%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)
        step_name = "test_step_update%s" % str(uuid.uuid4())[1:8]
        self.step_id = pgagent_utils.create_pgagent_step(
            self, step_name, self.job_id)

    def runTest(self):
        """This function will update pgAgent steps"""

        self.data['jstid'] = str(self.step_id)
        response = self.tester.put(
            '{0}{1}/{2}/{3}/{4}'.format(
                self.url, str(utils.SERVER_GROUP), str(self.server_id),
                str(self.job_id), str(self.step_id)
            ),
            data=json.dumps(self.data),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_step(self)
        pgagent_utils.delete_pgagent_job(self)
