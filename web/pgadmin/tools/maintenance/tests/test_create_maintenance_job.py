##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import time
import random
import simplejson as json

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict


class MaintenanceJobTest(BaseTestGenerator):
    """Maintenance api test cases"""
    scenarios = [
        ('When maintenance the object with the default options',
         dict(
             params=dict(
                 data={
                     'database': 'postgres',
                     'op': 'VACUUM',
                     'vacuum_analyze': False,
                     'vacuum_freeze': False,
                     'vacuum_full': False,
                     'verbose': True
                 },
                 cmd="VACUUM VERBOSE;\n"
             ),
             url='/maintenance/job/{0}/{1}',
             expected_cmd='VACUUM VERBOSE',
             expected_exit_code=[0, None]
         ))
    ]

    def setUp(self):
        if self.server['default_binary_paths'] is None:
            self.skipTest(
                "default_binary_paths is not set for the server {0}".format(
                    self.server['name']
                )
            )

    def runTest(self):
        self.server_id = parent_node_dict["database"][-1]["server_id"]
        self.db_id = parent_node_dict["database"][-1]["db_id"]
        url = self.url.format(self.server_id, self.db_id)

        # Create the backup job
        response = self.tester.post(url,
                                    data=json.dumps(self.params['data']),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        job_id = response_data['data']['job_id']

        cnt = 0
        while 1:
            if cnt >= 10:
                break
            # Check the process list
            response1 = self.tester.get('/misc/bgprocess/?_='.format(
                random.randint(1, 9999999)))
            self.assertEqual(response1.status_code, 200)
            process_list = json.loads(response1.data.decode('utf-8'))

            if len(process_list) > 0 and 'execution_time' in process_list[0]:
                break
            time.sleep(0.5)
            cnt += 1

        self.assertTrue('execution_time' in process_list[0])
        self.assertTrue('stime' in process_list[0])
        self.assertTrue('exit_code' in process_list[0])
        self.assertTrue(process_list[0]['exit_code'] in
                        self.expected_exit_code)

        self.assertIn(self.expected_cmd, process_list[0]['details'])

        # Check the process details
        p_details = self.tester.get('/misc/bgprocess/{0}?_='.format(
            job_id, random.randint(1, 9999999))
        )
        self.assertEqual(p_details.status_code, 200)

        p_details = self.tester.get('/misc/bgprocess/{0}/{1}/{2}/?_='.format(
            job_id, 0, 0, random.randint(1, 9999999))
        )
        self.assertEqual(p_details.status_code, 200)
        p_details_data = json.loads(p_details.data.decode('utf-8'))

        # Retrieve the backup job process logs
        while 1:
            out, err, status = MaintenanceJobTest.get_params(p_details_data)
            if status:
                break

            p_details = self.tester.get(
                '/misc/bgprocess/{0}/{1}/{2}/?_={3}'.format(
                    job_id, out, err, random.randint(1, 9999999))
            )
            self.assertEqual(p_details.status_code, 200)
            p_details_data = json.loads(p_details.data.decode('utf-8'))

            time.sleep(1)

        # Check the job is complete.
        backup_ack = self.tester.put('/misc/bgprocess/{0}'.format(job_id))
        self.assertEqual(backup_ack.status_code, 200)
        backup_ack_res = json.loads(backup_ack.data.decode('utf-8'))

        self.assertEqual(backup_ack_res['success'], 1)

    @staticmethod
    def get_params(data):
        out = 0
        out_done = False
        err = 0
        err_done = False
        if 'out' in data:
            out = data['out'] and data['out']['pos']

            if 'done' in data['out']:
                out_done = data['out']['done']

        if 'err' in data:
            err = data['err'] and data['err']['pos']

            if 'done' in data['err']:
                err_done = data['err']['done']

        return out, err, (out_done and err_done)
