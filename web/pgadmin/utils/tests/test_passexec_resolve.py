##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################

"""Tests for resolve_server_passexec() and build_passexec()."""

from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.passexec import (
    resolve_server_passexec, build_passexec, PasswordExec,
    ServerPasswordExec)

CMDS = {'vault': ['/bin/get-pass'], 'other': ['/bin/other']}


def _server(**kw):
    s = MagicMock(id=7, user_id=1, shared=True, host='db.example.com',
                  port=5432, username='owner_db', shared_username='shr',
                  maintenance_db='postgres', passexec_name='vault',
                  passexec_expiration=60, passexec_cmd=None)
    for k, v in kw.items():
        setattr(s, k, v)
    return s


OWNER = MagicMock(id=1, username='owner@example.com',
                  auth_source='internal')
OTHER = MagicMock(id=2, username='jane.doe@example.com',
                  auth_source='ldap')


class TestResolveServerPassexec(BaseTestGenerator):
    """Which named command applies to which pgAdmin user."""

    scenarios = [
        ('Owner gets own command',
         dict(srv={}, user=OWNER, row=None,
              expected=('vault', 60, 'owner_db'))),
        ('Owner with no command',
         dict(srv=dict(passexec_name=None), user=OWNER, row=None,
              expected=None)),
        ('Unshared server uses the owner values for any user',
         dict(srv=dict(shared=False), user=OTHER, row=None,
              expected=('vault', 60, 'owner_db'))),
        ('Non-owner without a row inherits',
         dict(srv={}, user=OTHER, row=None,
              expected=('vault', 60, 'shr'))),
        ('Non-owner row with NULL inherits',
         dict(srv={}, user=OTHER,
              row=dict(passexec_name=None, username='jane_db'),
              expected=('vault', 60, 'jane_db'))),
        ('Non-owner row with empty string means none',
         dict(srv={}, user=OTHER,
              row=dict(passexec_name='', username='jane_db'),
              expected=None)),
        ('Non-owner row with its own command',
         dict(srv={}, user=OTHER,
              row=dict(passexec_name='other', passexec_expiration=5,
                       username='jane_db'),
              expected=('other', 5, 'jane_db'))),
        ('Non-owner inherits from an owner with none',
         dict(srv=dict(passexec_name=None), user=OTHER,
              row=dict(passexec_name=None, username='jane_db'),
              expected=None)),
    ]

    def runTest(self):
        server = _server(**self.srv)
        row = MagicMock(**self.row) if self.row is not None else None
        with patch('pgadmin.model.SharedServer') as ss:
            ss.query.filter_by.return_value.first.return_value = row
            self.assertEqual(resolve_server_passexec(server, self.user),
                             self.expected)


class TestBuildPassexec(BaseTestGenerator):
    """build_passexec() in server and desktop mode."""

    scenarios = [
        ('Builds a ServerPasswordExec for a non-owner',
         dict(test_method='test_builds')),
        ('Unknown name returns None and warns',
         dict(test_method='test_unknown_name')),
        ('Server mode never uses free text',
         dict(test_method='test_server_free_text')),
        ('Desktop mode keeps free text',
         dict(test_method='test_desktop')),
        ('Unauthenticated user gets None',
         dict(test_method='test_unauthenticated')),
        ('No configured commands returns None without a query',
         dict(test_method='test_no_commands')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    def _build(self, server, user=OTHER, row=None, server_mode=True,
               cmds=CMDS):
        with self.app.test_request_context(), \
                patch('pgadmin.utils.passexec.config.SERVER_MODE',
                      server_mode), \
                patch('pgadmin.utils.passexec.config.'
                      'SERVER_PASSEXEC_COMMANDS', cmds, create=True), \
                patch('pgadmin.utils.passexec.current_user', user), \
                patch('pgadmin.model.SharedServer') as ss:
            self.shared_server = ss
            ss.query.filter_by.return_value.first.return_value = row
            return build_passexec(server)

    def test_builds(self):
        res = self._build(
            _server(),
            row=MagicMock(passexec_name=None, username='jane_db'))
        self.assertIsInstance(res, ServerPasswordExec)
        self.assertEqual(res.env['PGADMIN_PASSEXEC_USERNAME'], 'jane_db')
        self.assertEqual(res.env['PGADMIN_PASSEXEC_PGADMIN_USER'],
                         'jane.doe@example.com')
        self.assertEqual(res.env['PGADMIN_PASSEXEC_AUTH_SOURCE'], 'ldap')
        self.assertEqual(res.argv, ['/bin/get-pass'])
        self.assertEqual(res.name, 'vault')

    def test_unknown_name(self):
        server = _server(passexec_name='gone', user_id=2)
        app = MagicMock()
        with patch('pgadmin.utils.passexec.current_app', app):
            res = self._build(server)
        self.assertIsNone(res)
        self.assertTrue(app.logger.warning.called)
        logged = ' '.join(str(a) for a in
                          app.logger.warning.call_args[0])
        self.assertIn('gone', logged)
        self.assertIn('7', logged)

    def test_server_free_text(self):
        res = self._build(_server(passexec_cmd='echo x', passexec_name=None,
                                  user_id=2))
        self.assertIsNone(res)

    def test_desktop(self):
        res = self._build(_server(passexec_cmd='echo x'),
                          server_mode=False)
        self.assertIs(type(res), PasswordExec)
        self.assertEqual(res.cmd, 'echo x')
        self.assertIsNone(self._build(
            _server(passexec_cmd=None, passexec_name='vault'),
            server_mode=False))

    def test_unauthenticated(self):
        anon = MagicMock(is_authenticated=False)
        self.assertIsNone(self._build(_server(), user=anon))

    def test_no_commands(self):
        res = self._build(
            _server(),
            row=MagicMock(passexec_name='vault', username='jane_db'),
            cmds={})
        self.assertIsNone(res)
        self.shared_server.query.filter_by.assert_not_called()
