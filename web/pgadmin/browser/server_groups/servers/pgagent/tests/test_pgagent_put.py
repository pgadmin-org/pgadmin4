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


class PgAgentPutTestCase(BaseTestGenerator):
    """This class will test the put pgAgent job API"""
    scenarios = [
        ('Update pgAgent job description', dict(
            url='/browser/pga_job/obj/',
            data={
                "jobdesc": "This is a test comment",
            })),
        ('Update pgagent job add schedule', dict(
            url='/browser/pga_job/obj/',
            data={'jschedules': {
                'added': [{
                    'jscjobid': '',
                    'jscenabled': True,
                    'jscdesc': 'This is a test comment',
                    'jscname': 'test_sc1',
                    'jscexceptions': [{'jexdate': '2050-01-01',
                                       'jextime': '12:30'}],
                    'jscstart': '2050-01-01 12:14:21 +05:30',
                    'jscend': '2050-03-01 12:14:21 +05:30',
                    'jscminutes': [False] * 60,
                    # Below format is added to test the malformed array
                    # literal issue.
                    'jscweekdays': '[false, true, false, true, false, '
                                   'false, false]',
                    'jscmonthdays': [False] * 32,
                    'jschours': [True] * 24,
                    # Below format is added to test the malformed array
                    # literal issue.
                    'jscmonths': '[true, false, false, true, false, false,'
                                 'true, false, false, true, false, false]'
                }]
            }
            })),
        ('Update pgagent job add steps with local connection', dict(
            url='/browser/pga_job/obj/',
            data={'jsteps': {
                'added': [{
                    'jstjobid': '',
                    'jstname': 'test_st1',
                    'jstdesc': '',
                    'jstenabled': True,
                    'jstkind': True,
                    'jstconntype': True,
                    'jstcode': 'SELECT 1;',
                    'jstconnstr': None,
                    'jstdbname': 'postgres',
                    'jstonerror': 'f',
                    'jstnextrun': '',
                }]
            }
            })),
        ('Update pgagent job add steps with remote connection', dict(
            url='/browser/pga_job/obj/',
            data={'jsteps': {
                'added': [{
                    'jstjobid': '',
                    'jstname': 'test_st1',
                    'jstdesc': '',
                    'jstenabled': True,
                    'jstkind': True,
                    'jstconntype': False,
                    'jstcode': 'SELECT 1;',
                    'jstconnstr': 'host=localhost port=5432 dbname=postgres',
                    'jstdbname': '',
                    'jstonerror': 'f',
                    'jstnextrun': '',
                }]
            }
            })),
    ]

    def setUp(self):
        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)
        name = "test_job_put%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

    def runTest(self):
        """This function will put pgAgent job"""

        if 'jschedules' in self.data and 'added' in self.data['jschedules']:
            self.data['jschedules']['added'][0]['jscjobid'] = self.job_id

        if 'jsteps' in self.data and 'added' in self.data['jsteps']:
            self.data['jsteps']['added'][0]['jstjobid'] = self.job_id

        response = self.tester.put(
            '{0}{1}/{2}/{3}'.format(
                self.url, str(utils.SERVER_GROUP), str(self.server_id),
                str(self.job_id)
            ),
            data=json.dumps(self.data),
            follow_redirects=True,
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
