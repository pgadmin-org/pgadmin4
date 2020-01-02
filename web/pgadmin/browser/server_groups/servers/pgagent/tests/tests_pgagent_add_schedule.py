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


class PgAgentAddScheduleTestCase(BaseTestGenerator):
    """This class will test the add schedule in the pgAgent job API"""
    scenarios = [
        ('Create schedule with exception in pgAgent job', dict(
            url='/browser/pga_schedule/obj/'))
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
        # Check and Delete entry for pga_exception table for the above
        # date and time as no primary key is defined for pga_exception table
        # and there is a unique constraint for date and time. So when we run
        # the test cases multiple time then it will fail with unique
        # constraint error.
        jexdate = '2050-01-01'
        jextime = '12:00:00'
        pgagent_utils.delete_pgagent_exception(self, jexdate, jextime)

        self.pgagent_schedule_name = "test_sch_add%s" % str(uuid.uuid4())[1:8]
        data = {
            'jscjobid': self.job_id,
            'jscenabled': True,
            'jscdesc': '',
            'jscname': self.pgagent_schedule_name,
            'jscexceptions': [{'jexdate': jexdate,
                               'jextime': jextime}],
            'jscstart': '2050-01-01 12:14:21 +05:30',
            'jscend': '2050-03-01 12:14:21 +05:30',
            'jscminutes': [False] * 60,
            'jscweekdays': [True] * 7,
            'jscmonthdays': [True] * 32,
            'jschours': [False] * 24,
            'jscmonths': [True] * 12
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
        self.schedule_id = response_data['node']['_id']
        is_present = pgagent_utils.verify_pgagent_schedule(self)
        self.assertTrue(
            is_present, "pgAgent schedule was not created successfully"
        )

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
