##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc, \
    current_app
from pgadmin.tools.maintenance import Message
from pgadmin.utils.route import BaseTestGenerator
from pickle import dumps, loads
from unittest.mock import patch, MagicMock


class BatchProcessTest(BaseTestGenerator):
    """Test the BatchProcess class"""
    scenarios = [
        ('When maintained server',
         dict(
             class_params=dict(
                 sid=1,
                 host='localhost',
                 port=5444,
                 username='postgres',
                 args=[
                     '--host',
                     "localhost",
                     '--port',
                     "5444",
                     '--username',
                     '--dbname',
                     "postgres",
                     '--command',
                     "VACUUM VERBOSE;\n"
                 ],
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
             expected_msg="Maintenance (Vacuum)",
             expected_details_cmd='VACUUM VERBOSE;'
         ))
    ]

    @patch('pgadmin.misc.bgprocess.processes.Popen')
    @patch('pgadmin.misc.bgprocess.processes.db')
    @patch('pgadmin.tools.maintenance.Server')
    @patch('pgadmin.misc.bgprocess.processes.current_user')
    def runTest(self, current_user_mock, server_mock, db_mock,
                popen_mock):
        with self.app.app_context():
            current_user_mock.id = 1
            current_app.PGADMIN_RUNTIME = False

            class TestMockServer():
                def __init__(self, name, host, port):
                    self.name = name
                    self.host = host
                    self.port = port

            def db_session_add_mock(j):
                cmd_obj = loads(j.desc)
                self.assertTrue(isinstance(cmd_obj, IProcessDesc))
                self.assertEqual(cmd_obj.query, self.class_params['cmd'])
                self.assertEqual(cmd_obj.message, self.expected_msg)
                self.assertEqual(cmd_obj.data, self.class_params['data'])

            mock_obj = TestMockServer(self.class_params['username'],
                                      self.class_params['host'],
                                      self.class_params['port'])
            mock_result = server_mock.query.filter_by.return_value
            mock_result.first.return_value = mock_obj

            db_mock.session.add.side_effect = db_session_add_mock
            db_mock.session.commit = MagicMock(return_value=True)

            maintenance_obj = Message(
                self.class_params['sid'],
                self.class_params['data'],
                self.class_params['cmd']
            )

            p = BatchProcess(
                desc=maintenance_obj,
                cmd=self.class_params['cmd'],
                args=self.class_params['args']
            )

            # Check that _create_process has been called
            self.assertTrue(db_mock.session.add.called)

            # Check start method
            self._check_start(popen_mock, p, maintenance_obj)

            # Check list method
            self._check_list(p, maintenance_obj)

    @patch('pgadmin.misc.bgprocess.processes.Process')
    def _check_start(self, popen_mock, p, maintenance_obj, process_mock):
        class TestMockProcess():
            def __init__(self, desc, args, cmd):
                self.pid = 1
                self.exit_code = 1
                self.start_time = '2018-04-17 06:18:56.315445 +0000'
                self.end_time = None
                self.desc = dumps(desc)
                self.arguments = " ".join(args)
                self.command = cmd
                self.acknowledge = None
                self.process_state = 0

        mock_result = process_mock.query.filter_by.return_value
        mock_result.first.return_value = TestMockProcess(
            maintenance_obj, self.class_params['args'],
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
    def _check_list(self, p, maintenance_obj, update_process_info_mock,
                    process_mock):
        class TestMockProcess():
            def __init__(self, desc, args, cmd):
                self.pid = 1
                self.exit_code = 1
                self.start_time = '2018-04-17 06:18:56.315445 +0000'
                self.end_time = None
                self.desc = dumps(desc)
                self.arguments = " ".join(args)
                self.command = cmd
                self.acknowledge = None
                self.process_state = 0

        process_mock.query.filter_by.return_value = [
            TestMockProcess(maintenance_obj,
                            self.class_params['args'],
                            self.class_params['cmd'])
        ]

        update_process_info_mock.return_value = [True, True]

        ret_value = p.list()
        self.assertEqual(1, len(ret_value))
        self.assertTrue('details' in ret_value[0])
        self.assertTrue('desc' in ret_value[0])
