##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests that every place a utility's --dbname is built gives it
utility_conninfo(): the database name in desktop mode, and in server mode
also the client credential files, which libpq ranks above a pg_service.conf
entry (the PG* environment variables are ranked below it).

The tools are called with a mocked manager, so no server is needed.
"""

import inspect
import json
import os
import shutil
import tempfile
import unittest
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

from psycopg.conninfo import conninfo_to_dict

from pgadmin.misc.bgprocess.processes import BatchProcess
from pgadmin.utils import (
    NO_CLIENT_FILE, database_conninfo, fs_short_path,
    utility_connection_params)
from pgadmin.utils.route import BaseTestGenerator

DATABASE = 'host=evil dbname=x'
CONNECTION_PARAMS = {'passfile': '.pgpass'}


def _resolved(path):
    """A storage file path as get_complete_file_path() returns it: on
    Windows the short (8.3) form with forward slashes, which libpq is given;
    unchanged on POSIX, where fs_short_path() is the identity."""
    return fs_short_path(path).replace('\\', '/')


SCENARIOS = [
    ('Server mode', dict(server_mode=True)),
    ('Desktop mode', dict(server_mode=False)),
    ('Server mode, connection parameters only on the server row',
     dict(server_mode=True, params_on_manager=False)),
]


class _CallSiteBase:
    # False: the manager holds no connection parameters, so a call site
    # must take the file settings from the server row.
    params_on_manager = True
    # The libpq service of the server, and connection parameters held in
    # addition to the passfile.
    service = None
    extra_params = {}

    def setUp(self):
        # Argument-marshalling tests: skip BaseTestGenerator's server setup.
        unittest.TestCase.setUp(self)
        self.storage = os.path.realpath(
            tempfile.mkdtemp(prefix='pga_call_sites_'))
        with open(os.path.join(self.storage, '.pgpass'), 'w') as f:
            f.write('*:*:*:*:secret\n')

    def tearDown(self):
        shutil.rmtree(self.storage, ignore_errors=True)

    def _patches(self):
        return [
            patch.dict(self.app.config, {'SERVER_MODE': self.server_mode}),
            patch.object(self.app, 'PGADMIN_RUNTIME', False),
            patch('pgadmin.utils.get_storage_directory',
                  return_value=self.storage),
        ]

    def _run(self, func, *args, **kwargs):
        patches = self._patches()
        with self.app.test_request_context(
                data=kwargs.pop('request_data', None),
                content_type='application/json'):
            for p in patches:
                p.start()
            try:
                return func(*args, **kwargs)
            finally:
                for p in reversed(patches):
                    p.stop()

    def _manager(self):
        # service and kerberos_conn are set, as a MagicMock attribute would
        # be truthy.
        return MagicMock(version=180000, user='postgres', use_ssh_tunnel=0,
                         service=self.service, kerberos_conn=False,
                         connection_params=(
                             dict(CONNECTION_PARAMS, **self.extra_params)
                             if self.params_on_manager else {}))

    def _server(self, **kwargs):
        # A real dict, as the server row holds; a bare MagicMock attribute
        # would be taken for no parameters and hide a missing fallback.
        return MagicMock(
            connection_params=dict(CONNECTION_PARAMS, **self.extra_params),
            service=self.service, **kwargs)

    def _expected(self):
        """The conninfo dict --dbname must hold for DATABASE."""
        if not self.server_mode:
            return {'dbname': DATABASE}
        return {'dbname': DATABASE,
                'passfile': _resolved(os.path.join(self.storage, '.pgpass')),
                'sslcert': NO_CLIENT_FILE, 'sslkey': NO_CLIENT_FILE}

    def _assert_dbname(self, args, expected=None):
        self.assertEqual(args.count('--dbname'), 1, args)
        value = args[args.index('--dbname') + 1]
        self.assertEqual(
            conninfo_to_dict(value),
            self._expected() if expected is None else expected)


class BackupArgsTestCase(_CallSiteBase, BaseTestGenerator):
    """pg_dump, and pg_dumpall for the server and globals backups."""

    scenarios = SCENARIOS

    def _args(self, backup_type, maintenance_db='postgres'):
        from pgadmin.tools.backup import _get_args_params_values
        manager = self._manager()
        server = self._server(host='localhost', port=5432,
                              maintenance_db=maintenance_db)
        data = dict(format='custom', schemas=[], tables=[],
                    database=DATABASE)
        with patch('pgadmin.utils.driver.get_driver',
                   return_value=MagicMock()):
            return self._run(_get_args_params_values, data, MagicMock(),
                             backup_type, 'test_backup_file', server,
                             manager)

    def runTest(self):
        # pg_dump
        self._assert_dbname(self._args('objects'))

        # pg_dumpall: --database is the maintenance database as a
        # connection string; in server mode --dbname additionally holds
        # the files, so that its per-database pg_dump processes get them
        # too.
        for backup_type in ('server', 'globals'):
            args = self._args(backup_type)
            self.assertEqual(args[args.index('--database') + 1],
                             database_conninfo('postgres'))
            if self.server_mode:
                expected = self._expected()
                del expected['dbname']
                self._assert_dbname(args, expected)
            else:
                self.assertNotIn('--dbname', args)

        # A maintenance database name that is a connection string must not
        # reach pg_dumpall raw, where its keywords would override the
        # files passed in --dbname.
        for hostile in (
                'host=internal-db user=admin dbname=postgres '
                'passfile=/var/lib/pgadmin/.pgpass',
                'service=probesvc',
                'servicefile=/etc/x service=probesvc'):
            for backup_type in ('server', 'globals'):
                args = self._args(backup_type, hostile)
                value = args[args.index('--database') + 1]
                self.assertEqual(value, database_conninfo(hostile))
                self.assertNotIn(hostile, args)
                self.assertEqual(conninfo_to_dict(value),
                                 {'dbname': hostile})
                if self.server_mode:
                    expected = self._expected()
                    del expected['dbname']
                    self._assert_dbname(args, expected)


class ConnectionParamsSourceTestCase(_CallSiteBase, BaseTestGenerator):
    """The files in --dbname come from the same connection parameters as
    the environment: the manager's copy, else the server row's."""

    scenarios = [('Server mode', dict(server_mode=True))]

    def runTest(self):
        manager = self._manager()
        manager.connection_params = {}
        server = MagicMock(connection_params=dict(CONNECTION_PARAMS))
        self.assertEqual(utility_connection_params(manager, server),
                         CONNECTION_PARAMS)
        manager.connection_params = {'passfile': 'other'}
        self.assertEqual(utility_connection_params(manager, server),
                         {'passfile': 'other'})
        self.assertIsNone(utility_connection_params(None, None))

        # The manager has no copy: --dbname must carry the user's file
        # from the server row, not NO_CLIENT_FILE.
        from pgadmin.tools.maintenance import utility_conninfo
        manager.connection_params = {}
        conninfo = self._run(
            lambda: utility_conninfo(
                'postgres', utility_connection_params(manager, server)))
        self.assertEqual(conninfo_to_dict(conninfo)['passfile'],
                         _resolved(os.path.join(self.storage, '.pgpass')))


class RestoreArgsTestCase(_CallSiteBase, BaseTestGenerator):
    """pg_restore and the psql used to restore a plain backup."""

    scenarios = SCENARIOS

    def runTest(self):
        from pgadmin.tools.restore import (
            get_restore_util_args, get_sql_util_args)
        manager = self._manager()
        server = self._server(host='localhost', port=5432,
                              username='postgres')
        data = dict(database=DATABASE, format='custom')

        args = self._run(get_restore_util_args, data, manager, server,
                         MagicMock(), MagicMock(), '/tmp/file')
        self._assert_dbname(args)

        args = self._run(get_sql_util_args, data, manager, server,
                         '/tmp/file')
        self._assert_dbname(args)


class _BatchCallSiteBase(_CallSiteBase):
    """Routes that start a BatchProcess, called without their decorators.

    Each _invoke_*() method calls the route with a database name. With
    batch=True BatchProcess is a mock; with batch=False the real class is
    used, with only the creation of the process record and the start of the
    utility replaced (see _real_batch_process()). It returns the mock (or
    None) and the error messages the route's responses were given.
    """

    def _server_and_manager(self):
        server = self._server(host='localhost', port=5432,
                              username='postgres', id=1)
        manager = self._manager()
        manager.utility.return_value = '/usr/bin/psql'
        manager.connection.return_value.connected.return_value = True
        return server, manager

    def _batch_args(self, batch_mock):
        self.assertTrue(batch_mock.called)
        return batch_mock.call_args_list[0][1]['args']

    @staticmethod
    def _patch_module(stack, module, returns, plain=()):
        """Patch names of module: those in returns return the value given,
        those in plain are replaced by a MagicMock."""
        mocks = {}
        for name, value in returns.items():
            mocks[name] = stack.enter_context(
                patch.object(module, name, return_value=value))
        for name in plain:
            mocks[name] = stack.enter_context(patch.object(module, name))
        return mocks

    @staticmethod
    def _real_batch_process(stack):
        """Keep the real BatchProcess, so its set_env_variables() decides,
        but create no process record or log directory and start nothing.
        Returns the mock that replaces start()."""
        def create_process(self, desc, cmd, args):
            self.id = 't'
            self.desc = desc
            self.cmd = cmd
            self.args = args
            self.log_dir = None

        stack.enter_context(
            patch.object(BatchProcess, '_create_process', create_process))
        return stack.enter_context(
            patch.object(BatchProcess, 'start', autospec=True))

    @staticmethod
    def _errors(*mocks):
        return [str(call.kwargs['errormsg'])
                for mock in mocks for call in mock.call_args_list
                if call.kwargs.get('errormsg')]

    def _batch(self, stack, module, batch):
        if batch:
            return stack.enter_context(patch.object(module, 'BatchProcess'))
        return self._real_batch_process(stack)

    def _invoke_maintenance(self, database, batch=True):
        import pgadmin.tools.maintenance as maintenance
        server, manager = self._server_and_manager()
        driver = MagicMock()
        driver.connection_manager.return_value = manager
        view = inspect.unwrap(maintenance.create_maintenance_job)

        data = json.dumps({'database': database, 'op': 'VACUUM'})
        with ExitStack() as stack:
            mock = self._batch(stack, maintenance, batch)
            mocks = self._patch_module(
                stack, maintenance,
                dict(get_server=server, get_driver=driver,
                     does_utility_exist=None, render_template='VACUUM;'),
                ('Message', 'make_json_response'))
            self._run(view, 1, 2, request_data=data)
        return mock, self._errors(mocks['make_json_response'])

    def _invoke_import_export(self, database, batch=True):
        import pgadmin.tools.import_export as import_export
        server, manager = self._server_and_manager()
        driver = MagicMock()
        driver.connection_manager.return_value = manager
        view = inspect.unwrap(import_export.create_import_export_job)

        data = json.dumps({'database': database, 'filename': 'f.csv',
                           'format': 'csv', 'is_import': True,
                           'schema': 'public', 'table': 't',
                           'columns': []})
        with ExitStack() as stack:
            mock = self._batch(stack, import_export, batch)
            stack.enter_context(patch('pgadmin.utils.driver.get_driver',
                                      return_value=driver))
            mocks = self._patch_module(
                stack, import_export,
                dict(get_server=server, does_utility_exist=None,
                     get_storage_directory=self.storage,
                     filename_with_file_manager_path='/tmp/f.csv',
                     open_utility_file_or_error=('/tmp/f.csv', None, None),
                     render_template='COPY t FROM STDIN;',
                     _get_formatted_column_list='',
                     _get_force_quote_column_list=''),
                ('_save_import_export_settings', 'IEMessage',
                 'make_json_response', 'bad_request'))
            self._run(view, 1, request_data=data)
        return mock, self._errors(mocks['make_json_response'],
                                  mocks['bad_request'])

    def _invoke_mview(self, database, batch=True):
        import pgadmin.browser.server_groups.servers.databases.schemas \
            .views as views
        server, manager = self._server_and_manager()
        manager.db_info = {2: {'datname': database}}
        driver = MagicMock()
        driver.connection_manager.return_value = manager
        view = inspect.unwrap(views.MViewNode.refresh_data)

        this = MagicMock()
        this.template_path = 'mviews'
        this.conn.execute_dict.return_value = (
            True, {'rows': [{'name': 'v', 'schema': 's'}]})
        data = json.dumps({'concurrent': False, 'with_data': True})
        with ExitStack() as stack:
            mock = self._batch(stack, views, batch)
            mocks = self._patch_module(
                stack, views,
                dict(get_server=server, get_driver=driver,
                     does_utility_exist=None, render_template='REFRESH;'),
                ('Message', 'make_json_response'))
            self._run(view, this, 1, 1, 2, 3, 4, request_data=data)
        return mock, self._errors(mocks['make_json_response'])

    def _invoke_backup(self, backup_type, database, batch=True):
        """An object backup of database, or a server or globals backup
        whose maintenance database is database."""
        import pgadmin.tools.backup as backup
        server, manager = self._server_and_manager()
        server.maintenance_db = database
        driver = MagicMock()
        driver.connection_manager.return_value = manager
        view = inspect.unwrap(backup.create_backup_objects_job)

        data = json.dumps({'type': backup_type, 'database': database,
                           'file': 'f.backup', 'format': 'custom',
                           'schemas': [], 'tables': []})
        with ExitStack() as stack:
            mock = self._batch(stack, backup, batch)
            stack.enter_context(patch('pgadmin.utils.driver.get_driver',
                                      return_value=driver))
            mocks = self._patch_module(
                stack, backup,
                dict(get_server=server, does_utility_exist=None,
                     filename_with_file_manager_path='/tmp/f.backup',
                     open_utility_file_or_error=('/tmp/f.backup', None,
                                                 None)),
                ('BackupMessage', 'make_json_response'))
            self._run(view, 1, request_data=data)
        return mock, self._errors(mocks['make_json_response'])

    def _invoke_restore(self, restore_format, database, batch=True):
        """A restore with pg_restore (custom) or psql (plain)."""
        import pgadmin.tools.restore as restore
        server, manager = self._server_and_manager()
        driver = MagicMock()
        driver.connection_manager.return_value = manager
        view = inspect.unwrap(restore.create_restore_job)

        data = json.dumps({'database': database, 'file': 'f.backup',
                           'format': restore_format})
        with ExitStack() as stack:
            mock = self._batch(stack, restore, batch)
            stack.enter_context(patch('pgadmin.utils.driver.get_driver',
                                      return_value=driver))
            mocks = self._patch_module(
                stack, restore,
                dict(get_server=server, does_utility_exist=None,
                     filename_with_file_manager_path='/tmp/f.backup',
                     open_utility_file_or_error=('/tmp/f.backup', None,
                                                 None)),
                ('RestoreMessage', 'make_json_response'))
            self._run(view, 1, request_data=data)
        return mock, self._errors(mocks['make_json_response'])


class MaintenanceArgsTestCase(_BatchCallSiteBase, BaseTestGenerator):
    """The psql run by a maintenance job."""

    scenarios = SCENARIOS

    def runTest(self):
        batch, _ = self._invoke_maintenance(DATABASE)
        self._assert_dbname(self._batch_args(batch))


class ImportExportArgsTestCase(_BatchCallSiteBase, BaseTestGenerator):
    """The psql run by an import or export job."""

    scenarios = SCENARIOS

    def runTest(self):
        batch, _ = self._invoke_import_export(DATABASE)
        self._assert_dbname(self._batch_args(batch))


class MaterializedViewRefreshArgsTestCase(_BatchCallSiteBase,
                                          BaseTestGenerator):
    """The psql run to refresh a materialized view."""

    scenarios = SCENARIOS

    def runTest(self):
        batch, _ = self._invoke_mview(DATABASE)
        self._assert_dbname(self._batch_args(batch))


class ServiceAllowlistCallSitesTestCase(_BatchCallSiteBase,
                                        BaseTestGenerator):
    """Every tool's real job creation, with a real set_env_variables(),
    never starts a utility that would use a service the administrator has
    not allowed (SERVER_MODE_ALLOWED_SERVICES), whichever way a user could
    reach one: the server's service, a service or servicefile among its
    connection parameters, or a database name that reads as service=...
    """

    ALLOWED = 'allowed_svc'
    HOSTILE_PARAMS = {'service': 'forbidden', 'servicefile': '/etc/x'}

    scenarios = [
        ('Maintenance', dict(
            server_mode=True,
            invoke=lambda t, db, batch: t._invoke_maintenance(db, batch))),
        ('Import/export', dict(
            server_mode=True,
            invoke=lambda t, db, batch: t._invoke_import_export(db, batch))),
        ('Materialized view refresh', dict(
            server_mode=True,
            invoke=lambda t, db, batch: t._invoke_mview(db, batch))),
        ('Object backup (pg_dump)', dict(
            server_mode=True,
            invoke=lambda t, db, batch: t._invoke_backup(
                'objects', db, batch))),
        ('Server backup (pg_dumpall)', dict(
            server_mode=True,
            invoke=lambda t, db, batch: t._invoke_backup(
                'server', db, batch))),
        ('Globals backup (pg_dumpall)', dict(
            server_mode=True,
            invoke=lambda t, db, batch: t._invoke_backup(
                'globals', db, batch))),
        ('Restore, custom format (pg_restore)', dict(
            server_mode=True,
            invoke=lambda t, db, batch: t._invoke_restore(
                'custom', db, batch))),
        ('Restore, plain format (psql)', dict(
            server_mode=True,
            invoke=lambda t, db, batch: t._invoke_restore(
                'plain', db, batch))),
    ]

    def _start(self, service, database, extra_params=None):
        """Run the tool; return the instance start() was called with (None
        if it was not) and the error messages."""
        self.service = service
        self.extra_params = extra_params or {}
        with patch.dict(self.app.config, {
                'SERVER_MODE_ALLOWED_SERVICES': [self.ALLOWED]}):
            start, errors = self.invoke(self, database, False)
        return (start.call_args[0][0] if start.called else None), errors

    def runTest(self):
        # (i) A service that is not allowed: nothing starts, and the
        # response says why.
        started, errors = self._start('forbidden', 'postgres')
        self.assertIsNone(started)
        self.assertTrue(
            any('SERVER_MODE_ALLOWED_SERVICES' in e for e in errors),
            errors)

        # (ii) An allowed service reaches the utility.
        started, errors = self._start(self.ALLOWED, 'postgres')
        self.assertIsNotNone(started, errors)
        self.assertEqual(started.env['PGSERVICE'], self.ALLOWED)

        # (iii) No service on the server, but a service in the connection
        # parameters and a database that reads as one: neither may reach
        # the utility.
        started, errors = self._start(
            None, 'service=forbidden',
            dict(self.HOSTILE_PARAMS, passfile='.pgpass'))
        self.assertIsNotNone(started, errors)
        self.assertNotIn('PGSERVICE', started.env)
        self.assertNotIn('PGSERVICEFILE', started.env)
        values = [started.args[i + 1] for i, arg in enumerate(started.args)
                  if arg in ('--dbname', '--database')]
        self.assertTrue(values, started.args)
        for value in values:
            params = conninfo_to_dict(value)
            self.assertNotIn('service', params, value)
            self.assertNotIn('servicefile', params, value)
        self.assertTrue(
            any(conninfo_to_dict(v).get('dbname') == 'service=forbidden'
                for v in values), values)
