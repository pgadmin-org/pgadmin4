##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################
import io
import json
import os
import shutil
import tempfile
from contextlib import redirect_stdout
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils import passexec

COMMANDS = {'vault': ['/bin/get-pass', '--ttl', '300']}
FREE_TEXT = 'echo SECRET-TOKEN-123'
GROUP = 'Passexec import export test group'


class _ImportExportMixin:
    """Shared set-up: a scratch directory, and a clean test group."""

    def setUp(self):
        # gettext needs a request context to pick a locale.
        self.ctx = self.app.test_request_context()
        self.ctx.push()
        from pgadmin.model import User
        self.user = User.query.first()
        self.tmp = tempfile.mkdtemp()
        self.path = os.path.join(self.tmp, 'servers.json')
        self._cleanup()

    def tearDown(self):
        from pgadmin.model import db
        db.session.rollback()
        self._cleanup()
        shutil.rmtree(self.tmp, ignore_errors=True)
        self.ctx.pop()

    def _cleanup(self):
        from pgadmin.model import db, Server, ServerGroup
        group = ServerGroup.query.filter_by(
            user_id=self.user.id, name=GROUP).first()
        if group:
            Server.query.filter_by(servergroup_id=group.id).delete()
            db.session.delete(group)
        db.session.commit()

    def _add_server(self, name, **kwargs):
        from pgadmin.model import db, Server, ServerGroup
        group = ServerGroup.query.filter_by(
            user_id=self.user.id, name=GROUP).first()
        if group is None:
            group = ServerGroup(user_id=self.user.id, name=GROUP)
            db.session.add(group)
            db.session.flush()
        server = Server(user_id=self.user.id, servergroup_id=group.id,
                        name=name, host='db.example.com', port=5432,
                        username='test_user', maintenance_db='postgres',
                        **kwargs)
        db.session.add(server)
        db.session.commit()
        return server

    def _dump(self):
        from pgadmin.utils import dump_database_servers
        with redirect_stdout(io.StringIO()):
            ok, _ = dump_database_servers(
                self.path, None, self.user, from_setup=True)
        self.assertTrue(ok)
        with open(self.path) as f:
            servers = json.load(f)['Servers']
        return {s['Name']: s for s in servers.values()
                if s['Group'] == GROUP}

    def _load(self, servers):
        from pgadmin.utils import load_database_servers
        servers = {str(i): dict({'Group': GROUP, 'Host': 'db.example.com',
                                 'Port': 5432, 'Username': 'test_user',
                                 'MaintenanceDB': 'postgres'}, **s)
                   for i, s in enumerate(servers, 1)}
        with open(self.path, 'w') as f:
            json.dump({'Servers': servers}, f)
        out = io.StringIO()
        with redirect_stdout(out):
            ok, _ = load_database_servers(
                self.path, None, self.user, from_setup=True)
        self.assertTrue(ok)
        return out.getvalue()

    def _loaded(self, name):
        from pgadmin.model import Server, ServerGroup
        group = ServerGroup.query.filter_by(
            user_id=self.user.id, name=GROUP).first()
        return Server.query.filter_by(
            servergroup_id=group.id, name=name).one()


class TestServerModePasswordExecExport(
        _ImportExportMixin, BaseTestGenerator):
    """Server mode exports the command name, never free text."""

    def runTest(self):
        self._add_server('with-name', passexec_name='vault',
                         passexec_expiration=100)
        self._add_server('no-name', passexec_expiration=50)
        self._add_server('legacy-text', passexec_cmd=FREE_TEXT)
        with patch.dict(self.app.config, {'SERVER_MODE': True}):
            dumped = self._dump()

        self.assertEqual(dumped['with-name']['PasswordExecCommand'],
                         'vault')
        self.assertEqual(dumped['with-name']['PasswordExecExpiration'], 100)
        for name in ('no-name', 'legacy-text'):
            self.assertNotIn('PasswordExecCommand', dumped[name])
            self.assertNotIn('PasswordExecExpiration', dumped[name])
        self.assertNotIn('SECRET-TOKEN-123', json.dumps(dumped))


class TestServerModePasswordExecImport(
        _ImportExportMixin, BaseTestGenerator):
    """Server mode imports only names that are configured."""

    def runTest(self):
        with patch.dict(self.app.config, {'SERVER_MODE': True}), \
                patch.object(passexec.config, 'SERVER_PASSEXEC_COMMANDS',
                             COMMANDS, create=True):
            out = self._load([
                {'Name': 'by-name', 'PasswordExecCommand': 'vault',
                 'PasswordExecExpiration': 120},
                {'Name': 'by-text', 'PasswordExecCommand': FREE_TEXT,
                 'PasswordExecExpiration': 120},
                {'Name': 'unknown', 'PasswordExecCommand': 'missing'},
            ])

        s = self._loaded('by-name')
        self.assertEqual((s.passexec_name, s.passexec_cmd,
                          s.passexec_expiration), ('vault', None, 120))

        s = self._loaded('by-text')
        self.assertEqual((s.passexec_name, s.passexec_cmd,
                          s.passexec_expiration), (None, None, None))

        self.assertIn("'by-text'", out)
        self.assertIn("'unknown'", out)
        self.assertNotIn('SECRET-TOKEN-123', out)
        self.assertNotIn('echo', out)


class TestDesktopModePasswordExecRoundTrip(
        _ImportExportMixin, BaseTestGenerator):
    """Desktop mode still exports and imports the free-text command."""

    def runTest(self):
        self._add_server('desktop', passexec_cmd=FREE_TEXT,
                         passexec_expiration=30)
        with patch.dict(self.app.config, {'SERVER_MODE': False}):
            dumped = self._dump()
            self.assertEqual(dumped['desktop']['PasswordExecCommand'],
                             FREE_TEXT)
            self.assertEqual(dumped['desktop']['PasswordExecExpiration'],
                             30)

            self._load([{'Name': 'desktop-copy',
                         'PasswordExecCommand': FREE_TEXT,
                         'PasswordExecExpiration': 30}])
        s = self._loaded('desktop-copy')
        self.assertEqual((s.passexec_cmd, s.passexec_name,
                          s.passexec_expiration), (FREE_TEXT, None, 30))
