##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc, \
    current_app
from pgadmin.tools.import_export import IEMessage
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
        ('When export file with default options',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres',
                 args=[
                     ' --command',
                     '\\copy {0}.{1}  ({2},{3})  TO \'{4}\'   CSV   '
                     'QUOTE {5} ESCAPE \'\'\'\';'
                 ],
                 cmd='import_export'
             ),
             params=dict(
                 filename='test_export_file.csv',
                 format='csv',
                 is_import=False,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 database='postgres',
                 columns=['test_col_1', 'test_col_2'],
                 icolumns=[],
                 schema="export_test_schema",
                 table="export_test_table",
                 storage='/'
             ),
             url='/import_export/job/{0}',
             expected_cmd_opts=['--command', 'copy', 'TO',
                                'export_test_schema', 'export_test_table'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When import file with default options',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_import_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres',
                 args=[
                     ' --command',
                     '\\copy {0}.{1}  ({2},{3})  FROM \'{4}\'   CSV   '
                     'QUOTE {5} ESCAPE \'\'\'\';'
                 ],
                 cmd='import_export'
             ),
             params=dict(
                 filename='test_import_file.csv',
                 format='csv',
                 is_import=True,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 database='postgres',
                 columns=['test_col_1', 'test_col_2'],
                 icolumns=[],
                 schema="import_test_schema",
                 table="import_test_table",
                 storage='/'
             ),
             url='/import_export/job/{0}',
             expected_cmd_opts=['--command', 'copy', 'FROM',
                                'import_test_schema', 'import_test_table'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         ))
    ]

    @patch.object(Preferences, 'module', return_value=MagicMock())
    @patch('pgadmin.tools.import_export.IEMessage.get_server_name')
    @patch('pgadmin.misc.bgprocess.processes.Popen')
    @patch('pgadmin.misc.bgprocess.processes.db')
    @patch('pgadmin.tools.import_export.current_user')
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

                self.assertEqual(cmd_obj.bfile, self.params['filename'])
                self.assertEqual(cmd_obj.database,
                                 self.class_params['database'])

                command = ' "' + self.class_params['args'][0] + '"' + \
                          ' "' + '\\' + self.class_params['args'][1].format(
                              self.params['schema'],
                              self.params['table'],
                              self.params['columns'][0],
                              self.params['columns'][1],
                              self.params['filename'],
                              '\\' + self.params['quote']
                ) + '"'
                self.assertEqual(cmd_obj._cmd, command)

            db_mock.session.add.side_effect = db_session_add_mock
            db_mock.session.commit = MagicMock(return_value=True)

            pref_module.return_value.preference.return_value.get. \
                return_value = 5

            get_server_name_mock.return_value = "{0} ({1}:{2})" \
                .format(
                    self.class_params['name'],
                    self.class_params['host'],
                    self.class_params['port'])

            args = self.class_params['args'][1].format(
                self.params['schema'],
                self.params['table'],
                self.params['columns'][0],
                self.params['columns'][1],
                self.params['filename'],
                self.params['quote']
            )

            import_export_obj = IEMessage(
                *[self.class_params['args'][0], args],
                **{
                    'sid': self.class_params['sid'],
                    'schema': self.params['schema'],
                    'table': self.params['table'],
                    'is_import': self.params['is_import'],
                    'database': self.params['database'],
                    'filename': self.params['filename'],
                    'storage': self.params['storage'],
                }
            )

            p = BatchProcess(
                desc=import_export_obj,
                cmd=self.class_params['cmd'],
                args=args
            )

            # Check that _create_process has been called
            self.assertTrue(db_mock.session.add.called)

            # Check start method
            self._check_start(popen_mock, p, import_export_obj)

            # Check list method
            self._check_list(p, import_export_obj)

    @patch('pgadmin.misc.bgprocess.processes.Process')
    def _check_start(self, popen_mock, p, import_export_obj, process_mock):
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
            import_export_obj, self.class_params['args'],
            self.class_params['cmd'])

        cmd_test = self.class_params['cmd']
        assert_true = self.assertTrue

        class PopenMockSideEffect():
            def __init__(self, cmd, **kwargs):
                assert_true(cmd_test in cmd)
                assert_true('env' in kwargs)

            # Need not to call the actual poll, so passing.
            def poll(self):
                pass

        popen_mock.side_effect = PopenMockSideEffect
        p.start()

        self.assertTrue(popen_mock.called)

    @patch('os.path.realpath')
    @patch('pgadmin.misc.bgprocess.processes.get_storage_directory')
    @patch('pgadmin.misc.bgprocess.processes.get_complete_file_path')
    @patch('pgadmin.misc.bgprocess.processes.Process')
    @patch('pgadmin.misc.bgprocess.processes.BatchProcess.'
           'update_process_info')
    def _check_list(self, p, import_export_obj,
                    update_process_info_mock, process_mock,
                    get_complete_file_path_mock, get_storage_directory_mock,
                    realpath_mock):
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
            TestMockProcess(import_export_obj,
                            self.class_params['args'],
                            self.class_params['cmd'])]

        update_process_info_mock.return_value = [True, True]
        get_complete_file_path_mock.return_value = self.params['filename']
        realpath_mock.return_value = self.params['filename']
        get_storage_directory_mock.return_value = '//'

        ret_value = p.list()
        self.assertEqual(1, len(ret_value))
        self.assertTrue('details' in ret_value[0])
        self.assertTrue('desc' in ret_value[0])
