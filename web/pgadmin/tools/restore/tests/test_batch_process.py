##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc, \
    current_app
from pgadmin.tools.restore import RestoreMessage
from pgadmin.utils.route import BaseTestGenerator
from pickle import dumps, loads
from unittest.mock import patch, MagicMock
from pgadmin.utils.preferences import Preferences
import datetime
import pytz

start_time = \
    datetime.datetime.now(pytz.utc).strftime("%Y-%m-%d %H:%M:%S.%f %z")


class BatchProcessTest(BaseTestGenerator):
    """Test the BatchProcess class"""
    scenarios = [
        ('When restore server',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_restore_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 username='postgres',
                 bfile='test_restore',
                 args=[
                     '--file',
                     "restore_file",
                     '--host',
                     "localhost",
                     '--port',
                     "5444",
                     '--username',
                     "postgres",
                     '--no-password',
                     '--database',
                     "postgres"
                 ],
                 cmd='restore_server'
             )
         ))
    ]

    @patch.object(Preferences, 'module', return_value=MagicMock())
    @patch('pgadmin.tools.restore.RestoreMessage.get_server_name')
    @patch('pgadmin.misc.bgprocess.processes.Popen')
    @patch('pgadmin.misc.bgprocess.processes.db')
    @patch('pgadmin.tools.restore.current_user')
    @patch('pgadmin.misc.bgprocess.processes.current_user')
    def runTest(self, current_user_mock, current_user, db_mock,
                popen_mock, get_server_name_mock, pref_module):
        with self.app.app_context():
            current_user.id = 1
            current_user_mock.id = 1
            current_app.PGADMIN_RUNTIME = False

            def db_session_add_mock(j):
                try:
                    cmd_obj = loads(bytes.fromhex(j.desc))
                except Exception:
                    cmd_obj = loads(j.desc)
                self.assertTrue(isinstance(cmd_obj, IProcessDesc))
                self.assertEqual(cmd_obj.bfile, self.class_params['bfile'])
                self.assertEqual(cmd_obj.cmd,
                                 ' --file "restore_file" '
                                 '--host "{0}" '
                                 '--port "{1}" '
                                 '--username "{2}" '
                                 '--no-password '
                                 '--database "{3}"'.format(
                                     self.class_params['host'],
                                     self.class_params['port'],
                                     self.class_params['username'],
                                     self.class_params['database']
                                 ))

            pref_module.return_value.preference.return_value.get. \
                return_value = 5

            get_server_name_mock.return_value = "{0} ({1}:{2})" \
                .format(
                    self.class_params['name'],
                    self.class_params['host'],
                    self.class_params['port'])

            db_mock.session.add.side_effect = db_session_add_mock
            db_mock.session.commit = MagicMock(return_value=True)

            restore_obj = RestoreMessage(
                self.class_params['sid'],
                self.class_params['bfile'],
                *self.class_params['args']
            )

            p = BatchProcess(
                desc=restore_obj,
                cmd=self.class_params['cmd'],
                args=self.class_params['args']
            )

            # Check that _create_process has been called
            self.assertTrue(db_mock.session.add.called)

            # Check start method
            self._check_start(popen_mock, p, restore_obj)

            # Check list method
            self._check_list(p, restore_obj)

    @patch('pgadmin.misc.bgprocess.processes.Process')
    def _check_start(self, popen_mock, p, restore_obj, process_mock):
        class TestMockProcess():
            def __init__(self, desc, args, cmd):
                self.pid = 1
                self.exit_code = 1
                self.start_time = start_time
                self.end_time = None
                self.desc = dumps(desc)
                self.arguments = " ".join(args)
                self.command = cmd
                self.acknowledge = None
                self.process_state = 0
                self.utility_pid = 123
                self.server_id = None

        mock_result = process_mock.query.filter_by.return_value
        mock_result.first.return_value = TestMockProcess(
            restore_obj, self.class_params['args'],
            self.class_params['cmd'])

        cmd_test = self.class_params['cmd']
        assert_true = self.assertTrue

        class popenMockSideEffect():
            def __init__(self, cmd, **kwargs):
                assert_true(cmd_test in cmd)
                assert_true('env' in kwargs)

            def poll(self):
                pass

        popen_mock.side_effect = popenMockSideEffect
        p.start()

        self.assertTrue(popen_mock.called)

    @patch('pgadmin.misc.bgprocess.processes.Process')
    @patch('pgadmin.misc.bgprocess.processes.BatchProcess.'
           'update_process_info')
    def _check_list(self, p, restore_obj,
                    update_process_info_mock, process_mock):
        class TestMockProcess():
            def __init__(self, desc, args, cmd):
                self.pid = 1
                self.exit_code = 1
                self.start_time = start_time
                self.end_time = None
                self.desc = dumps(desc)
                self.arguments = " ".join(args)
                self.command = cmd
                self.acknowledge = None
                self.process_state = 0
                self.utility_pid = 123
                self.server_id = None

        process_mock.query.filter_by.return_value = [
            TestMockProcess(restore_obj,
                            self.class_params['args'],
                            self.class_params['cmd'])
        ]

        update_process_info_mock.return_value = [True, True]

        ret_value = p.list()
        self.assertEqual(1, len(ret_value))
        self.assertTrue('details' in ret_value[0])
        self.assertTrue('desc' in ret_value[0])
