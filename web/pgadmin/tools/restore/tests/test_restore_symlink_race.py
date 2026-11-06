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

RESTORE_JOB_URL = '/restore/job/{0}'
GATE = 'pgadmin.misc.file_manager._refuses_leaf_symlinks'
DEV_FD = 'pgadmin.utils._dev_fd_reopens'
CLOSE = 'pgadmin.tools.restore.os.close'


class RestoreSymlinkRaceTest(BaseTestGenerator):
    """In server mode the restore file is opened by pgAdmin without
    following a leaf symbolic link and handed to pg_restore or psql as
    /dev/fd/N."""

    scenarios = [
        ('Plain format file is passed as a descriptor',
         dict(kind='file', fmt='plain', utility='psql')),
        ('Custom format file is passed as a descriptor',
         dict(kind='file', fmt='custom', utility='pg_restore')),
        ('Leaf symlink planted after validation is refused',
         dict(kind='race', fmt='custom', utility='pg_restore')),
        ('Directory format passes the real path',
         dict(kind='directory', fmt='directory', utility='pg_restore')),
        ('Descriptor is closed when start() fails',
         dict(kind='fail', fmt='custom', utility='pg_restore')),
        ('A path-bearing OSError is reported without the path',
         dict(kind='leak', fmt='custom', utility='pg_restore')),
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
            self.utility)
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

    @patch('pgadmin.tools.restore.RestoreMessage')
    @patch('pgadmin.tools.restore.filename_with_file_manager_path')
    @patch('pgadmin.tools.restore.BatchProcess')
    @patch('pgadmin.utils.driver.{0}.server_manager.ServerManager.'
           'export_password_env'.format(PG_DEFAULT_DRIVER))
    def runTest(self, export_password_env_mock, batch_process_mock,
                filename_mock, restore_message_mock):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        export_password_env_mock.return_value = True
        server_utils.connect_server(self, self.server_id)

        target = os.path.join(self.tmpdir, 'restore_source')
        real = os.path.join(self.tmpdir, 'real_file')
        is_dir = self.kind == 'directory'
        if is_dir:
            os.mkdir(target)
        else:
            with open(real, 'w') as f:
                f.write('-- fake dump')

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
            if not is_dir:
                os.rename(real, target)
            filename_mock.return_value = target

        batch_process_mock.return_value.id = 140391
        restore_message_mock.message = 'test'
        batch_process_mock.return_value.desc = restore_message_mock
        start_mock = batch_process_mock.return_value.start
        if self.kind == 'fail':
            start_mock.side_effect = RuntimeError('start failed')

        params = dict(file='restore_source', format=self.fmt, verbose=True,
                      schemas=[], tables=[], database='postgres')
        with patch(GATE, return_value=True), \
                patch(DEV_FD, return_value=True), \
                patch(CLOSE, side_effect=os.close) as close_mock:
            response = self.tester.post(
                RESTORE_JOB_URL.format(self.server_id),
                data=json.dumps(params), content_type='html/json')

        if self.kind == 'race':
            self.assertEqual(response.status_code, 400)
            self.assertEqual(json.loads(response.data)['errormsg'],
                             'Refusing to use a symbolic link.')
            self.assertFalse(batch_process_mock.called)
            return

        if self.kind == 'leak':
            self.assertEqual(response.status_code, 500)
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
        close_mock.assert_any_call(fds[0])
        if self.kind == 'fail':
            self.assertEqual(response.status_code, 410)
