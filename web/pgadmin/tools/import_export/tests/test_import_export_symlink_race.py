##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import errno
import json
import os
import shutil
import tempfile
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from pgadmin.utils import server_utils, does_utility_exist
from config import PG_DEFAULT_DRIVER

IMPORT_EXPORT_URL = '/import_export/job/{0}'
GATE = 'pgadmin.misc.file_manager._refuses_leaf_symlinks'
DEV_FD = 'pgadmin.utils._dev_fd_reopens'
CLOSE = 'pgadmin.tools.import_export.os.close'


class ImportExportSymlinkRaceTest(BaseTestGenerator):
    """In server mode the import/export file is opened by pgAdmin without
    following a leaf symbolic link and psql's \\copy is given /dev/fd/N."""

    scenarios = [
        ('Export file is passed as a descriptor',
         dict(kind='file', is_import=False)),
        ('Import file is passed as a descriptor',
         dict(kind='file', is_import=True)),
        ('Leaf symlink planted after validation is refused',
         dict(kind='race', is_import=True)),
        ('Validation fails before the file is opened',
         dict(kind='invalid', is_import=False)),
        ('Descriptor is closed when start() fails',
         dict(kind='fail', is_import=False)),
        ('A path-bearing OSError is reported without the path',
         dict(kind='leak', is_import=True)),
    ]

    def setUp(self):
        if 'default_binary_paths' not in self.server or \
            self.server['default_binary_paths'] is None or \
            self.server['type'] not in self.server['default_binary_paths'] or \
                self.server['default_binary_paths'][self.server['type']] == '':
            self.skipTest("default_binary_paths is not set for the server")

        binary_path = os.path.join(
            self.server['default_binary_paths'][self.server['type']], 'psql')
        if os.name == 'nt':
            binary_path = binary_path + '.exe'
        ret_val = does_utility_exist(binary_path)
        if ret_val is not None:
            self.skipTest(ret_val)

        self.tmpdir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmpdir, True)
        # The file must lie inside the storage directory it is opened
        # beneath; here that is the test's own directory.
        storage = patch('pgadmin.utils.get_file_manager_storage_dir',
                        return_value=self.tmpdir)
        storage.start()
        self.addCleanup(storage.stop)

    @patch('pgadmin.tools.import_export.IEMessage')
    @patch('pgadmin.tools.import_export.filename_with_file_manager_path')
    @patch('pgadmin.tools.import_export.BatchProcess')
    @patch('pgadmin.utils.driver.{0}.server_manager.ServerManager.'
           'export_password_env'.format(PG_DEFAULT_DRIVER))
    def runTest(self, export_password_env_mock, batch_process_mock,
                filename_mock, ie_message_mock):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        export_password_env_mock.return_value = True
        server_utils.connect_server(self, self.server_id)

        target = os.path.join(self.tmpdir, 'ie_file.csv')
        real = os.path.join(self.tmpdir, 'real_file')
        with open(real, 'w') as f:
            f.write('a,b\n')

        if self.kind == 'race':
            def plant(*args, **kwargs):
                os.symlink(real, target)
                return target
            filename_mock.side_effect = plant
        elif self.kind == 'leak':
            # filename_with_file_manager_path() raises an OSError whose str()
            # carries the absolute storage path; the handler must return only
            # the reason.
            self.leak_path = os.path.join(self.tmpdir, 'sd', 'y')
            filename_mock.side_effect = OSError(
                errno.ELOOP, 'Too many levels of symbolic links',
                self.leak_path)
        else:
            os.rename(real, target)
            filename_mock.return_value = target

        batch_process_mock.return_value.id = 140391
        ie_message_mock.message = 'test'
        batch_process_mock.return_value.desc = ie_message_mock
        start_mock = batch_process_mock.return_value.start
        if self.kind == 'fail':
            start_mock.side_effect = RuntimeError('start failed')

        params = dict(filename='ie_file.csv', format='csv',
                      is_import=self.is_import, database='postgres',
                      columns=['test_col_1'], not_null_columns=[],
                      null_columns=[], force_quote_columns=[],
                      schema='test_schema', table='test_table')
        if self.kind == 'invalid':
            params['format'] = 'bogus'

        opened = []
        real_open = os.open

        def spy_open(*args, **kwargs):
            fd = real_open(*args, **kwargs)
            if args[0] == target:
                opened.append(fd)
            return fd

        with patch(GATE, return_value=True), \
                patch(DEV_FD, return_value=True), \
                patch(CLOSE, side_effect=os.close) as close_mock, \
                patch('pgadmin.utils.os.open', side_effect=spy_open):
            response = self.tester.post(
                IMPORT_EXPORT_URL.format(self.server_id),
                data=json.dumps(params), content_type='html/json')

        if self.kind == 'race':
            self.assertEqual(response.status_code, 400)
            self.assertEqual(json.loads(response.data)['errormsg'],
                             'Refusing to use a symbolic link.')
            self.assertFalse(batch_process_mock.called)
            return

        if self.kind == 'leak':
            self.assertEqual(response.status_code, 400)
            errmsg = json.loads(response.data)['errormsg']
            self.assertEqual(errmsg, 'Too many levels of symbolic links')
            self.assertNotIn(self.leak_path, errmsg)
            self.assertFalse(batch_process_mock.called)
            return

        if self.kind == 'invalid':
            self.assertEqual(response.status_code, 400)
            self.assertFalse(batch_process_mock.called)
            # The open comes after validation, so nothing can leak here.
            self.assertEqual(opened, [])
            return

        self.assertTrue(batch_process_mock.called)
        stored_args = batch_process_mock.call_args[1]['args']
        self.assertIn("'{0}'".format(target), stored_args[3])
        self.assertEqual(ie_message_mock.call_args[1]['filename'], target)
        self.assertTrue(start_mock.called)
        start_kwargs = start_mock.call_args[1]
        launch_args = start_kwargs.get('args')
        fds = start_kwargs.get('pass_fds')
        self.assertIsNotNone(launch_args)
        self.assertIsNotNone(fds)
        self.assertEqual(len(fds), 1)
        self.assertEqual(launch_args[:2], stored_args[:2])
        self.assertEqual(launch_args[2], '--command')
        direction = 'FROM' if self.is_import else 'TO'
        self.assertIn("{0} '/dev/fd/{1}' WITH".format(direction, fds[0]),
                      launch_args[3])
        self.assertNotIn(target, launch_args[3])
        close_mock.assert_any_call(fds[0])
        if self.kind == 'fail':
            self.assertEqual(response.status_code, 400)
