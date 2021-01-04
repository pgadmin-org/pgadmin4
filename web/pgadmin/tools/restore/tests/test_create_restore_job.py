##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import time
import random
import os

import simplejson as json

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from pgadmin.utils import server_utils as server_utils, does_utility_exist
import pgadmin.tools.backup.tests.test_backup_utils as backup_utils


class RestoreJobTest(BaseTestGenerator):
    """Backup api test cases"""
    scenarios = [
        ('When restore the object with the default options',
         dict(
             params=dict(
                 file='test_restore_file',
                 format='custom',
                 custom=False,
                 verbose=True,
                 blobs=True,
                 schemas=[],
                 tables=[],
                 database='test_restore_database'
             ),
             url='/restore/job/{0}',
             expected_cmd_opts=['--verbose'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             backup_options=dict(
                 params=dict(
                     file='test_restore_file',
                     format='custom',
                     verbose=True,
                     blobs=True,
                     schemas=[],
                     tables=[],
                     database='test_restore_database'
                 ),
                 url='/backup/job/{0}/object',
                 expected_params=dict(
                     expected_cmd_opts=['--verbose', '--format=c', '--blobs'],
                     not_expected_cmd_opts=[],
                     expected_exit_code=[0, None]
                 )

             )
         ))
    ]

    def setUp(self):
        if 'default_binary_paths' not in self.server or \
            self.server['default_binary_paths'] is None or \
            self.server['type'] not in self.server['default_binary_paths'] or\
                self.server['default_binary_paths'][self.server['type']] == '':
            self.skipTest(
                "default_binary_paths is not set for the server {0}".format(
                    self.server['name']
                )
            )

        binary_path = os.path.join(
            self.server['default_binary_paths'][self.server['type']],
            'pg_restore')

        if os.name == 'nt':
            binary_path = binary_path + '.exe'

        retVal = does_utility_exist(binary_path)
        if retVal is not None:
            self.skipTest(retVal)

    def create_backup(self):
        url = self.backup_options['url'].format(self.server_id)
        job_id = backup_utils.create_backup_job(self.tester, url,
                                                self.backup_options['params'],
                                                self.assertEqual)
        self.backup_file = backup_utils.run_backup_job(
            self.tester,
            job_id,
            self.backup_options['expected_params'],
            self.assertIn,
            self.assertNotIn,
            self.assertEqual
        )

    def runTest(self):
        self.db_name = ''
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        server_utils.connect_server(self, self.server_id)
        utils.create_database(self.server, self.params['database'])

        self.create_backup()
        url = self.url.format(self.server_id)

        # Create the restore job
        response = self.tester.post(url,
                                    data=json.dumps(self.params),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        job_id = response_data['data']['job_id']

        cnt = 0
        the_process = None
        while True:
            if cnt >= 5:
                break
            # Check the process list
            response1 = self.tester.get('/misc/bgprocess/?_={0}'.format(
                random.randint(1, 9999999)))
            self.assertEqual(response1.status_code, 200)
            process_list = json.loads(response1.data.decode('utf-8'))

            try:
                the_process = next(
                    p for p in process_list if p['id'] == job_id)
            except Exception:
                the_process = None

            if the_process and 'execution_time' in the_process:
                break
            time.sleep(0.5)
            cnt += 1

        self.assertTrue('execution_time' in the_process)
        self.assertTrue('stime' in the_process)
        self.assertTrue('exit_code' in the_process)
        self.assertTrue(the_process['exit_code'] in
                        self.expected_exit_code)

        if self.expected_cmd_opts:
            for opt in self.expected_cmd_opts:
                self.assertIn(opt, the_process['details'])
        if self.not_expected_cmd_opts:
            for opt in self.not_expected_cmd_opts:
                self.assertNotIn(opt, the_process['details'])

        # Check the process details
        p_details = self.tester.get('/misc/bgprocess/{0}?_={1}'.format(
            job_id, random.randint(1, 9999999))
        )
        self.assertEqual(p_details.status_code, 200)
        json.loads(p_details.data.decode('utf-8'))

        p_details = self.tester.get(
            '/misc/bgprocess/{0}/{1}/{2}/?_={3}'.format(
                job_id, 0, 0, random.randint(1, 9999999)
            )
        )
        self.assertEqual(p_details.status_code, 200)
        p_details_data = json.loads(p_details.data.decode('utf-8'))

        # Retrieve the restore job process logs
        cnt = 0
        while True:
            out, err, status = RestoreJobTest.get_params(p_details_data)
            if status or cnt >= 5:
                break

            p_details = self.tester.get(
                '/misc/bgprocess/{0}/{1}/{2}/?_={3}'.format(
                    job_id, out, err, random.randint(1, 9999999))
            )
            self.assertEqual(p_details.status_code, 200)
            p_details_data = json.loads(p_details.data.decode('utf-8'))

            cnt += 1
            time.sleep(1)

        # Check the job is complete.
        restore_ack = self.tester.put('/misc/bgprocess/{0}'.format(job_id))
        self.assertEqual(restore_ack.status_code, 200)
        restore_ack_res = json.loads(restore_ack.data.decode('utf-8'))

        self.assertEqual(restore_ack_res['success'], 1)

        if self.backup_file is not None:
            if os.path.isfile(self.backup_file):
                os.remove(self.backup_file)

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

    def tearDown(self):
        connection = utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        utils.drop_database(connection, self.params['database'])
