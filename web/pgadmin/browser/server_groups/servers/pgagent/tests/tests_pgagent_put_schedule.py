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


class PgAgentPutScheduleTestCase(BaseTestGenerator):
    """This class will test the update pgAgent schedule API"""
    scenarios = [
        ('Update schedule with start and end time', dict(
            url='/browser/pga_schedule/obj/',
            data={
                'jscdesc': 'Test Schedule',
                'jscstart': '2050-01-01 12:00:00 +05:30',
                'jscend': '2050-01-20 12:00:00 +05:30',
            })),
        ('Update schedule with repeat', dict(
            url='/browser/pga_schedule/obj/',
            data={
                'jscmonthdays': '[true,false,true,false,true,false,false,'
                                'false,false,false,false,false,false,false,'
                                'false,false,false,false,false,false,false,'
                                'false,false,false,false,false,false,false,'
                                'false,false,false,false]',
                'jscweekdays': '[true,false,false,true,false,false,false]',
                'jscmonths': '[true,false,false,true,false,false,false,false,'
                             'false,false,false,false]',
                'jschours': '[false,false,false,false,true,false,false,false,'
                            'false,false,false,false,false,false,false,false,'
                            'false,false,false,false,false,false,false,false]'
            })),
        ('Update schedule add exception', dict(
            url='/browser/pga_schedule/obj/',
            data={
                'jscexceptions': {
                    'added': [{'jexdate': '2050-01-01',
                               'jextime': '12:00:00'}]
                }},
            delete_existing_exception=True)),
        ('Update schedule change exception date and time', dict(
            url='/browser/pga_schedule/obj/',
            data={
                'jscexceptions': {
                    'changed': [{'jexdate': '2050-01-31',
                                 'jextime': '20:00:00'}]
                }},
            create_exception=True)),
        ('Update schedule delete exception', dict(
            url='/browser/pga_schedule/obj/',
            data={
                'jscexceptions': {
                    'deleted': [{'jexdate': '2050-01-01',
                                 'jextime': '12:00:00'}]
                }},
            create_exception=True,
            is_delete=True)),
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
        sch_name = "test_schedule_update%s" % str(uuid.uuid4())[1:8]
        self.schedule_id = pgagent_utils.create_pgagent_schedule(
            self, sch_name, self.job_id)

    def runTest(self):
        """This function will update pgAgent schedule"""

        # Check and Delete entry for pga_exception table for the specified
        # date and time as no primary key is defined for pga_exception table
        # and there is a unique constraint for date and time. So when we run
        # the test cases multiple time then it will fail with unique
        # constraint error.
        if hasattr(self, 'delete_existing_exception'):
            pgagent_utils.delete_pgagent_exception(
                self, self.data['jscexceptions']['added'][0]['jexdate'],
                self.data['jscexceptions']['added'][0]['jextime'])

        # Create exception for update and delete
        if hasattr(self, 'create_exception'):
            date = None
            time = None
            if hasattr(self, 'is_delete'):
                date = self.data['jscexceptions']['deleted'][0]['jexdate']
                time = self.data['jscexceptions']['deleted'][0]['jextime']
            else:
                date = self.data['jscexceptions']['changed'][0]['jexdate']
                time = self.data['jscexceptions']['changed'][0]['jextime']

            self.excp_id = pgagent_utils.create_pgagent_exception(
                self, self.schedule_id, date, time)

            # Add created exception id in data
            if hasattr(self, 'is_delete'):
                self.data['jscexceptions']['deleted'][0]['jexid'] = \
                    self.excp_id
            else:
                self.data['jscexceptions']['changed'][0]['jexid'] = \
                    self.excp_id

        self.data['jscid'] = str(self.schedule_id)
        response = self.tester.put(
            '{0}{1}/{2}/{3}/{4}'.format(
                self.url, str(utils.SERVER_GROUP), str(self.server_id),
                str(self.job_id), str(self.schedule_id)
            ),
            data=json.dumps(self.data),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_schedule(self)
        pgagent_utils.delete_pgagent_job(self)
