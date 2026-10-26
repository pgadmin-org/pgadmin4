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
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from pgadmin.utils import server_utils, does_utility_exist
from config import PG_DEFAULT_DRIVER

BACKUP_OBJECT_URL = '/backup/job/{0}/object'
BACKUP_SERVER_URL = '/backup/job/{0}'
GATE = 'pgadmin.misc.file_manager._refuses_leaf_symlinks'
DEV_FD = 'pgadmin.utils._dev_fd_reopens'
CLOSE = 'pgadmin.tools.backup.os.close'


class BackupSymlinkRaceTest(BaseTestGenerator):
    """In server mode the backup file is opened by pgAdmin without following
    a leaf symbolic link and handed to pg_dump as /dev/fd/N."""

    scenarios = [
        ('Backup file is passed as a descriptor', dict(kind='file')),
        ('Leaf symlink planted after validation is refused',
         dict(kind='race')),
        ('Directory format passes the real path', dict(kind='directory')),
        ('Descriptor is closed when start() fails', dict(kind='fail')),
        ('Server backup (pg_dumpall) file is passed as a descriptor',
         dict(kind='server')),
        ('A path-bearing OSError is reported without the path',
         dict(kind='leak')),
    ]

    def setUp(self):
        # Opening the file without following a leaf symbolic link and handing
        # it to the utility as /dev/fd/N needs O_NOFOLLOW and descriptor-based
        # opens, which exist only on POSIX; on Windows the real path is passed
        # and this protection does not apply.
        if os.name == 'nt':
            self.skipTest(
                'Descriptor-based symlink-race protection is POSIX-only.')
        if 'default_binary_paths' not in self.server or \
            self.server['default_binary_paths'] is None or \
            self.server['type'] not in self.server['default_binary_paths'] or \
                self.server['default_binary_paths'][self.server['type']] == '':
            self.skipTest("default_binary_paths is not set for the server")

        binary_path = os.path.join(
            self.server['default_binary_paths'][self.server['type']],
            'pg_dump')
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

    @patch('pgadmin.tools.backup.Server')
    @patch('pgadmin.tools.backup.BackupMessage')
    @patch('pgadmin.tools.backup.filename_with_file_manager_path')
    @patch('pgadmin.tools.backup.BatchProcess')
    @patch('pgadmin.utils.driver.{0}.server_manager.ServerManager.'
           'export_password_env'.format(PG_DEFAULT_DRIVER))
    def runTest(self, export_password_env_mock, batch_process_mock,
                filename_mock, backup_message_mock, server_mock):
        class TestMockServer():
            def __init__(self, id):
                self.name = 'test_backup_server'
                self.host = 'localhost'
                self.port = 5444
                self.id = id
                self.username = 'postgres'
                self.maintenance_db = 'postgres'

        self.server_id = parent_node_dict["server"][-1]["server_id"]
        server_mock.query.filter_by.return_value.first.return_value = \
            TestMockServer(self.server_id)
        export_password_env_mock.return_value = True
        server_utils.connect_server(self, self.server_id)

        target = os.path.join(self.tmpdir, 'backup_target')
        outside = os.path.join(self.tmpdir, 'outside_file')
        with open(outside, 'w') as f:
            f.write('untouched')

        is_dir = self.kind == 'directory'
        if self.kind == 'race':
            def plant(*args, **kwargs):
                os.symlink(outside, target)
                return target
            filename_mock.side_effect = plant
        elif self.kind == 'leak':
            # filename_with_file_manager_path() raises an OSError whose str()
            # carries the absolute storage path (e.g. a symlinked parent gives
            # ELOOP); the handler must return only the reason.
            self.leak_path = os.path.join(self.tmpdir, 'sd', 'y')
            filename_mock.side_effect = OSError(
                errno.ELOOP, 'Too many levels of symbolic links',
                self.leak_path)
        else:
            filename_mock.return_value = target

        batch_process_mock.return_value.id = 140391
        backup_message_mock.message = 'test'
        batch_process_mock.return_value.desc = backup_message_mock
        start_mock = batch_process_mock.return_value.start
        if self.kind == 'fail':
            start_mock.side_effect = RuntimeError('start failed')

        if self.kind == 'server':
            url = BACKUP_SERVER_URL
            params = dict(file='backup_target', verbose=True, type='server')
        else:
            url = BACKUP_OBJECT_URL
            params = dict(file='backup_target', verbose=True, schemas=[],
                          tables=[], database='postgres',
                          format='directory' if is_dir else 'custom')
        with patch(GATE, return_value=True), \
                patch(DEV_FD, return_value=True), \
                patch(CLOSE, side_effect=os.close) as close_mock:
            response = self.tester.post(
                url.format(self.server_id),
                data=json.dumps(params), content_type='html/json')

        if self.kind == 'race':
            self.assertEqual(response.status_code, 400)
            self.assertEqual(json.loads(response.data)['errormsg'],
                             'Refusing to use a symbolic link.')
            self.assertFalse(batch_process_mock.called)
            with open(outside) as f:
                self.assertEqual(f.read(), 'untouched')
            return

        if self.kind == 'leak':
            self.assertEqual(response.status_code, 400)
            errmsg = json.loads(response.data)['errormsg']
            self.assertEqual(errmsg, 'Too many levels of symbolic links')
            self.assertNotIn(self.leak_path, errmsg)
            self.assertFalse(batch_process_mock.called)
            return

        self.assertTrue(batch_process_mock.called)
        stored_args = batch_process_mock.call_args[1]['args']
        self.assertIn(target, stored_args)
        self.assertTrue(start_mock.called)
        start_kwargs = start_mock.call_args[1]

        if is_dir:
            self.assertTrue(os.path.isdir(target))
            self.assertIn(target, start_kwargs.get('args') or [])
            self.assertFalse(start_kwargs.get('pass_fds'))
            return

        launch_args = start_kwargs.get('args')
        fds = start_kwargs.get('pass_fds')
        self.assertIsNotNone(launch_args)
        self.assertIsNotNone(fds)
        self.assertEqual(len(fds), 1)
        self.assertNotIn(target, launch_args)
        self.assertIn('/dev/fd/{0}'.format(fds[0]), launch_args)
        file_idx = launch_args.index('--file') + 1
        self.assertEqual(launch_args[file_idx], '/dev/fd/{0}'.format(fds[0]))
        self.assertEqual(stored_args[file_idx], target)
        close_mock.assert_any_call(fds[0])
        if self.kind == 'fail':
            self.assertEqual(response.status_code, 410)
