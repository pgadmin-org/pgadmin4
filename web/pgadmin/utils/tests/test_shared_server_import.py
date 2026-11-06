##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################
"""Only an administrator can create a shared server through the
servers.json import (load_database_servers)."""

import io
import json
import os
import shutil
import tempfile
from contextlib import redirect_stdout
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator

GROUP = 'Shared server import test group'
SHARED_GROUP = 'Shared server import test shared group'
GROUPS = (GROUP, SHARED_GROUP)


class _SharedImportMixin:
    """Shared set-up: a scratch directory, and clean test groups."""

    is_admin = False

    def setUp(self):
        # gettext needs a request context to pick a locale.
        self.ctx = self.app.test_request_context()
        self.ctx.push()
        from pgadmin.model import User
        self.user = User.query.first()
        self.tmp = tempfile.mkdtemp()
        self.path = os.path.join(self.tmp, 'servers.json')
        self._cleanup()
        patcher = patch.object(type(self.user), 'has_role',
                               return_value=self.is_admin)
        patcher.start()
        self.addCleanup(patcher.stop)

    def tearDown(self):
        from pgadmin.model import db
        db.session.rollback()
        self._cleanup()
        shutil.rmtree(self.tmp, ignore_errors=True)
        self.ctx.pop()

    def _cleanup(self):
        from pgadmin.model import db, Server, ServerGroup
        for name in GROUPS:
            group = ServerGroup.query.filter_by(
                user_id=self.user.id, name=name).first()
            if group:
                Server.query.filter_by(servergroup_id=group.id).delete()
                db.session.delete(group)
        db.session.commit()

    def _entry(self, group=GROUP, **kwargs):
        return dict({'Group': group, 'Host': 'db.example.com',
                     'Port': 5432, 'Username': 'test_user',
                     'MaintenanceDB': 'postgres'}, **kwargs)

    def _write(self, servers):
        with open(self.path, 'w') as f:
            json.dump({'Servers': servers}, f)

    def _load(self, selected, from_setup=False, **kwargs):
        from pgadmin.utils import load_database_servers
        out = io.StringIO()
        # The web path opens the file beneath the storage directory, so
        # make the scratch directory the storage directory.
        with redirect_stdout(out), \
                patch('pgadmin.utils.filename_with_file_manager_path',
                      return_value=self.path), \
                patch('pgadmin.utils.get_file_manager_storage_dir',
                      return_value=self.tmp):
            result = load_database_servers(
                self.path, selected, self.user, from_setup=from_setup,
                **kwargs)
        return result, out.getvalue()

    def _servers(self, group=None):
        from pgadmin.model import Server, ServerGroup
        groups = ServerGroup.query.filter(
            ServerGroup.user_id == self.user.id,
            ServerGroup.name.in_(GROUPS if group is None else [group]))
        return Server.query.filter(
            Server.servergroup_id.in_([g.id for g in groups])).all()

    def _group_exists(self, name):
        from pgadmin.model import ServerGroup
        return ServerGroup.query.filter_by(
            user_id=self.user.id, name=name).count() > 0


class TestNonAdminMixedFileRefused(_SharedImportMixin, BaseTestGenerator):
    """A file with a shared server and an invalid one is refused, and the
    shared server is not created."""

    def runTest(self):
        self._write({
            '1': self._entry(group=SHARED_GROUP, Name='evil', Shared=True,
                             SharedUsername='postgres'),
            '2': {'Group': GROUP, 'Name': 'no host', 'Port': 5432,
                  'Username': 'test_user', 'MaintenanceDB': 'postgres'},
        })
        (ok, msg), _ = self._load(['1'])

        self.assertFalse(ok)
        self.assertIn("'Host' or 'Service' attribute not found", msg)
        self.assertEqual(self._servers(), [])
        self.assertFalse(self._group_exists(SHARED_GROUP))


class TestNonAdminSharedEntrySkipped(_SharedImportMixin, BaseTestGenerator):
    """Only the non-shared server is imported, and no empty group is left
    for the shared one."""

    def runTest(self):
        self._write({
            '1': self._entry(group=SHARED_GROUP, Name='shared one',
                             Shared=True, SharedUsername='postgres'),
            '2': self._entry(Name='private one'),
        })
        (ok, _), out = self._load(['1', '2'])

        self.assertTrue(ok)
        self.assertIn("Won't import the server 'shared one'", out)
        servers = self._servers()
        self.assertEqual([s.name for s in servers], ['private one'])
        self.assertFalse(servers[0].shared)
        self.assertFalse(self._group_exists(SHARED_GROUP))


class TestNonAdminSharedEntryNotValidated(
        _SharedImportMixin, BaseTestGenerator):
    """The loader refuses a shared entry itself, even if validation let
    it through."""

    def runTest(self):
        self._write({
            '1': self._entry(group=SHARED_GROUP, Name='shared one',
                             Shared=True, SharedUsername='postgres'),
        })
        with patch('pgadmin.utils.validate_json_data', return_value=None):
            (ok, _), out = self._load(['1'])

        self.assertTrue(ok)
        self.assertIn("Won't import the server 'shared one'", out)
        self.assertEqual(self._servers(), [])
        self.assertFalse(self._group_exists(SHARED_GROUP))


class TestAdminImportsSharedServer(_SharedImportMixin, BaseTestGenerator):
    """An administrator can import a shared server."""

    is_admin = True

    def runTest(self):
        self._write({
            '1': self._entry(Name='shared one', Shared=True,
                             SharedUsername='postgres', Username=None),
            '2': self._entry(Name='private one', SharedUsername='ignored'),
        })
        (ok, _), _ = self._load(['1', '2'])

        self.assertTrue(ok)
        servers = {s.name: s for s in self._servers()}
        self.assertTrue(servers['shared one'].shared)
        self.assertEqual(servers['shared one'].shared_username, 'postgres')
        self.assertEqual(servers['shared one'].username, 'postgres')
        self.assertFalse(servers['private one'].shared)
        self.assertIsNone(servers['private one'].shared_username)


class TestSetupNonAdmin(_SharedImportMixin, BaseTestGenerator):
    """The setup.py path skips shared servers for a non-admin and exits on
    an invalid file."""

    def runTest(self):
        self._write({
            '1': self._entry(group=SHARED_GROUP, Name='shared one',
                             Shared=True, SharedUsername='postgres'),
            '2': self._entry(Name='private one'),
        })
        (ok, _), out = self._load(None, from_setup=True)
        self.assertTrue(ok)
        self.assertIn("Won't import the server 'shared one'", out)
        self.assertEqual([s.name for s in self._servers()], ['private one'])

        self._write({
            '1': self._entry(group=SHARED_GROUP, Name='shared one',
                             Shared=True, SharedUsername='postgres'),
            '2': {'Group': GROUP, 'Name': 'no host', 'Port': 5432,
                  'Username': 'test_user', 'MaintenanceDB': 'postgres'},
        })
        with self.assertRaises(SystemExit):
            self._load(None, from_setup=True)
        self.assertFalse(self._group_exists(SHARED_GROUP))


class TestReplaceKeepsServersOnInvalidFile(
        _SharedImportMixin, BaseTestGenerator):
    """replace=True clears the existing servers only after the file has
    been validated."""

    def runTest(self):
        from pgadmin.model import db, Server, ServerGroup
        group = ServerGroup(user_id=self.user.id, name=GROUP)
        db.session.add(group)
        db.session.flush()
        db.session.add(Server(
            user_id=self.user.id, servergroup_id=group.id, name='existing',
            host='db.example.com', port=5432, username='test_user',
            maintenance_db='postgres'))
        db.session.commit()

        self._write({
            '1': {'Group': GROUP, 'Name': 'no host', 'Port': 5432,
                  'Username': 'test_user', 'MaintenanceDB': 'postgres'},
        })
        with patch('pgadmin.utils.clear_database_servers') as mock_clear:
            (ok, _), _ = self._load(['1'], replace=True)
            self.assertFalse(ok)
            mock_clear.assert_not_called()

        self.assertEqual([s.name for s in self._servers()], ['existing'])


class TestAdminSharedMustBeJsonTrue(_SharedImportMixin, BaseTestGenerator):
    """Only the JSON value true means shared. A string such as "false" or
    a number such as 1 is truthy in Python but must not share a server."""

    is_admin = True

    def runTest(self):
        self._write({
            '1': self._entry(Name='string false', Shared='false'),
            '2': self._entry(Name='number one', Shared=1),
            '3': self._entry(Name='real true', Shared=True),
        })
        (ok, _), _ = self._load(['1', '2', '3'])

        self.assertTrue(ok)
        servers = {s.name: s for s in self._servers()}
        self.assertFalse(servers['string false'].shared)
        self.assertFalse(servers['number one'].shared)
        self.assertTrue(servers['real true'].shared)


class TestNonAdminSharedStringFalseIsPrivate(
        _SharedImportMixin, BaseTestGenerator):
    """"Shared": "false" is not shared, so a non-admin imports it as a
    normal private server, while a real true is still skipped."""

    def runTest(self):
        self._write({
            '1': self._entry(Name='string false', Shared='false'),
            '2': self._entry(group=SHARED_GROUP, Name='real true',
                             Shared=True, SharedUsername='postgres'),
        })
        (ok, _), out = self._load(['1', '2'])

        self.assertTrue(ok)
        self.assertIn("Won't import the server 'real true'", out)
        servers = self._servers()
        self.assertEqual([s.name for s in servers], ['string false'])
        self.assertFalse(servers[0].shared)
        self.assertFalse(self._group_exists(SHARED_GROUP))


class TestReplaceWithValidFile(_SharedImportMixin, BaseTestGenerator):
    """replace=True with a valid file calls clear_database_servers, and
    still imports the new servers.

    clear_database_servers is mocked: the real one deletes every server of
    the user, including the server the rest of the regression suite
    connects to.
    """

    def runTest(self):
        self._write({'1': self._entry(Name='imported')})
        with patch('pgadmin.utils.clear_database_servers',
                   return_value=None) as mock_clear:
            (ok, _), _ = self._load(['1'], replace=True)
            mock_clear.assert_called_once()
            self.assertEqual(mock_clear.call_args[0][0].id, self.user.id)

        self.assertTrue(ok)
        self.assertEqual([s.name for s in self._servers()], ['imported'])
