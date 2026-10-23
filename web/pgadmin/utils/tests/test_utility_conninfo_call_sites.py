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
from unittest.mock import MagicMock, patch

from psycopg.conninfo import conninfo_to_dict

from pgadmin.utils import (
    NO_CLIENT_FILE, database_conninfo, utility_connection_params)
from pgadmin.utils.route import BaseTestGenerator

DATABASE = 'host=evil dbname=x'
CONNECTION_PARAMS = {'passfile': '.pgpass'}


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
        return MagicMock(version=180000, user='postgres', use_ssh_tunnel=0,
                         connection_params=(dict(CONNECTION_PARAMS)
                                            if self.params_on_manager
                                            else {}))

    def _server(self, **kwargs):
        # A real dict, as the server row holds; a bare MagicMock attribute
        # would be taken for no parameters and hide a missing fallback.
        return MagicMock(connection_params=dict(CONNECTION_PARAMS),
                         **kwargs)

    def _expected(self):
        """The conninfo dict --dbname must hold for DATABASE."""
        if not self.server_mode:
            return {'dbname': DATABASE}
        return {'dbname': DATABASE,
                'passfile': os.path.join(self.storage, '.pgpass'),
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
                         os.path.join(self.storage, '.pgpass'))


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
    """Routes that start a BatchProcess, called without their decorators."""

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


class MaintenanceArgsTestCase(_BatchCallSiteBase, BaseTestGenerator):
    """The psql run by a maintenance job."""

    scenarios = SCENARIOS

    def runTest(self):
        import pgadmin.tools.maintenance as maintenance
        server, manager = self._server_and_manager()
        driver = MagicMock()
        driver.connection_manager.return_value = manager
        view = inspect.unwrap(maintenance.create_maintenance_job)

        data = json.dumps({'database': DATABASE, 'op': 'VACUUM'})
        with patch.object(maintenance, 'BatchProcess') as batch, \
                patch.object(maintenance, 'get_server',
                             return_value=server), \
                patch.object(maintenance, 'get_driver',
                             return_value=driver), \
                patch.object(maintenance, 'does_utility_exist',
                             return_value=None), \
                patch.object(maintenance, 'render_template',
                             return_value='VACUUM;'), \
                patch.object(maintenance, 'Message'), \
                patch.object(maintenance, 'make_json_response'):
            self._run(view, 1, 2, request_data=data)
            self._assert_dbname(self._batch_args(batch))


class ImportExportArgsTestCase(_BatchCallSiteBase, BaseTestGenerator):
    """The psql run by an import or export job."""

    scenarios = SCENARIOS

    def runTest(self):
        import pgadmin.tools.import_export as import_export
        server, manager = self._server_and_manager()
        driver = MagicMock()
        driver.connection_manager.return_value = manager
        view = inspect.unwrap(import_export.create_import_export_job)

        data = json.dumps({'database': DATABASE, 'filename': 'f.csv',
                           'format': 'csv', 'is_import': True,
                           'schema': 'public', 'table': 't',
                           'columns': []})
        with patch.object(import_export, 'BatchProcess') as batch, \
                patch.object(import_export, 'get_server',
                             return_value=server), \
                patch('pgadmin.utils.driver.get_driver',
                      return_value=driver), \
                patch.object(import_export, 'does_utility_exist',
                             return_value=None), \
                patch.object(import_export, 'get_storage_directory',
                             return_value=self.storage), \
                patch.object(import_export, 'filename_with_file_manager_path',
                             return_value='/tmp/f.csv'), \
                patch.object(import_export, 'open_utility_file_or_error',
                             return_value=('/tmp/f.csv', None, None)), \
                patch.object(import_export, 'render_template',
                             return_value='COPY t FROM STDIN;'), \
                patch.object(import_export, '_get_formatted_column_list',
                             return_value=''), \
                patch.object(import_export, '_get_force_quote_column_list',
                             return_value=''), \
                patch.object(import_export, '_save_import_export_settings'), \
                patch.object(import_export, 'IEMessage'), \
                patch.object(import_export, 'make_json_response'):
            self._run(view, 1, request_data=data)
            self._assert_dbname(self._batch_args(batch))


class MaterializedViewRefreshArgsTestCase(_BatchCallSiteBase,
                                          BaseTestGenerator):
    """The psql run to refresh a materialized view."""

    scenarios = SCENARIOS

    def runTest(self):
        import pgadmin.browser.server_groups.servers.databases.schemas \
            .views as views
        server, manager = self._server_and_manager()
        manager.db_info = {2: {'datname': DATABASE}}
        driver = MagicMock()
        driver.connection_manager.return_value = manager
        view = inspect.unwrap(views.MViewNode.refresh_data)

        this = MagicMock()
        this.template_path = 'mviews'
        this.conn.execute_dict.return_value = (
            True, {'rows': [{'name': 'v', 'schema': 's'}]})
        data = json.dumps({'concurrent': False, 'with_data': True})
        with patch.object(views, 'BatchProcess') as batch, \
                patch.object(views, 'get_server', return_value=server), \
                patch.object(views, 'get_driver', return_value=driver), \
                patch.object(views, 'does_utility_exist',
                             return_value=None), \
                patch.object(views, 'render_template',
                             return_value='REFRESH;'), \
                patch.object(views, 'Message'), \
                patch.object(views, 'make_json_response'):
            self._run(view, this, 1, 1, 2, 3, 4, request_data=data)
            self._assert_dbname(self._batch_args(batch))
