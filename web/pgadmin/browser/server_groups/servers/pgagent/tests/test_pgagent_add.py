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


class PgAgentAddTestCase(BaseTestGenerator):
    """This class will test the add pgAgent job API"""
    scenarios = [
        ('Add pgAgent job', dict(url='/browser/pga_job/obj/'))
    ]

    def setUp(self):
        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)

    def runTest(self):
        """This function will adds pgAgent job"""
        self.pgagent_job = "test_job_add%s" % str(uuid.uuid4())[1:8]
        data = {
            'jobname': self.pgagent_job,
            'jobenabled': True,
            'jobhostagent': '',
            'jobjclid': 1,
            'jobdesc': '',
            'jsteps': [{
                'jstid': None,
                'jstjobid': None,
                'jstname': 'test_step',
                'jstdesc': '',
                'jstenabled': True,
                'jstkind': True,
                'jstconntype': True,
                'jstcode': 'SELECT 1;',
                'jstconnstr': None,
                'jstdbname': 'postgres',
                'jstonerror': 'f',
                'jstnextrun': '',
            }],
            'jschedules': [{
                'jscid': None,
                'jscjobid': None,
                'jscname': 'test_sch',
                'jscdesc': '',
                'jscenabled': True,
                'jscstart': '2050-01-01 12:14:21 +05:30',
                'jscend': None,
                'jscweekdays': [False] * 7,
                'jscmonthdays': [False] * 32,
                'jscmonths': [False] * 12,
                'jschours': [False] * 24,
                'jscminutes': [False] * 60,
                'jscexceptions': [{'jexdate': '2050-01-01',
                                   'jextime': '12:00'}],
            }],
        }

        response = self.tester.post(
            '{0}{1}/{2}/'.format(
                self.url, str(utils.SERVER_GROUP), str(self.server_id)
            ),
            data=json.dumps(data),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

        response_data = json.loads(response.data)
        self.job_id = response_data['node']['_id']
        is_present = pgagent_utils.verify_pgagent_job(self)
        self.assertTrue(
            is_present, "pgAgent job was not created successfully"
        )

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
