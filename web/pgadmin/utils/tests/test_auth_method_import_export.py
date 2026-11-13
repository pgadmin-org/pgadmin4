##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################

"""servers.json carries the server authentication method as AuthMethod.
A file without it imports as password, an unknown value fails the import,
and Kerberos cannot be combined with a token method."""

import io
import json
from contextlib import redirect_stdout

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.tests.test_passexec_import_export import \
    _ImportExportMixin, GROUP


class TestAuthMethodExport(_ImportExportMixin, BaseTestGenerator):
    """Every export names the method of the server."""

    def runTest(self):
        self._add_server('plain')
        self._add_server('direct', auth_method='oauth_direct')
        self._add_server('exchange', auth_method='oauth_exchange')
        self._add_server('entra', auth_method='entra')

        dumped = self._dump()

        self.assertEqual(dumped['plain']['AuthMethod'], 'password')
        self.assertEqual(dumped['direct']['AuthMethod'], 'oauth_direct')
        self.assertEqual(dumped['exchange']['AuthMethod'], 'oauth_exchange')
        self.assertEqual(dumped['entra']['AuthMethod'], 'entra')


class TestAuthMethodImport(_ImportExportMixin, BaseTestGenerator):
    """Each method is imported, and a missing key means password."""

    def runTest(self):
        self._load([
            {'Name': 'missing'},
            {'Name': 'password', 'AuthMethod': 'password'},
            {'Name': 'direct', 'AuthMethod': 'oauth_direct'},
            {'Name': 'exchange', 'AuthMethod': 'oauth_exchange'},
            {'Name': 'entra', 'AuthMethod': 'entra',
             'ConnectionParameters': {'sslmode': 'verify-full'}},
            {'Name': 'kerberos', 'KerberosAuthentication': True},
            {'Name': 'kerberos-password', 'AuthMethod': 'password',
             'KerberosAuthentication': True},
            {'Name': 'token-no-kerberos', 'AuthMethod': 'oauth_direct',
             'KerberosAuthentication': False},
        ])

        self.assertEqual(
            {name: self._loaded(name).auth_method for name in (
                'missing', 'password', 'direct', 'exchange', 'entra',
                'kerberos',
                'kerberos-password', 'token-no-kerberos')},
            {'missing': 'password', 'password': 'password',
             'direct': 'oauth_direct', 'exchange': 'oauth_exchange',
             'entra': 'entra', 'kerberos': 'password',
             'kerberos-password': 'password',
             'token-no-kerberos': 'oauth_direct'})
        self.assertTrue(self._loaded('kerberos').kerberos_conn)


class TestAuthMethodRoundTrip(_ImportExportMixin, BaseTestGenerator):
    """A method survives export and import."""

    def runTest(self):
        self._add_server('direct', auth_method='oauth_direct')
        dumped = self._dump()
        self._cleanup()

        self._load([{k: v for k, v in dumped['direct'].items()
                     if k not in ('Group', 'Host', 'Port', 'Username',
                                  'MaintenanceDB')}])

        self.assertEqual(self._loaded('direct').auth_method, 'oauth_direct')


class TestAuthMethodImportRefused(_ImportExportMixin, BaseTestGenerator):
    """A file with an unknown method, or Kerberos together with a token
    method, is refused as a whole with a message naming the server."""

    scenarios = [
        ('Unknown method',
         dict(bad={'AuthMethod': 'magic'}, expect='magic')),
        ('Method in the wrong case',
         dict(bad={'AuthMethod': 'OAuth_Direct'}, expect='OAuth_Direct')),
        ('Blank method',
         dict(bad={'AuthMethod': ''}, expect='AuthMethod')),
        ('Entra without an SSL mode',
         dict(bad={'AuthMethod': 'entra'}, expect='verify-full')),
        ('Entra without SSL mode verify-full',
         dict(bad={'AuthMethod': 'entra',
                   'ConnectionParameters': {'sslmode': 'verify-ca'}},
              expect='verify-full')),
        ('Kerberos with entra',
         dict(bad={'AuthMethod': 'entra', 'KerberosAuthentication': True,
                   'ConnectionParameters': {'sslmode': 'verify-full'}},
              expect='Kerberos')),
        ('Kerberos with oauth_direct',
         dict(bad={'AuthMethod': 'oauth_direct',
                   'KerberosAuthentication': True}, expect='Kerberos')),
        ('Kerberos with oauth_exchange',
         dict(bad={'AuthMethod': 'oauth_exchange',
                   'KerberosAuthentication': True}, expect='Kerberos')),
    ]

    def runTest(self):
        from pgadmin.model import Server, ServerGroup
        from pgadmin.utils import load_database_servers

        base = {'Group': GROUP, 'Host': 'db.example.com', 'Port': 5432,
                'Username': 'test_user', 'MaintenanceDB': 'postgres'}
        servers = {'good': dict(base, Name='good'),
                   'bad': dict(base, Name='bad', **self.bad)}
        with open(self.path, 'w') as f:
            json.dump({'Servers': servers}, f)

        # The setup.py path prints the error and exits.
        out = io.StringIO()
        with redirect_stdout(out), self.assertRaises(SystemExit):
            load_database_servers(
                self.path, None, self.user, from_setup=True)

        self.assertIn(self.expect, out.getvalue())
        self.assertIn("'bad'", out.getvalue())
        # Nothing at all was imported.
        group = ServerGroup.query.filter_by(
            user_id=self.user.id, name=GROUP).first()
        self.assertTrue(group is None or Server.query.filter_by(
            servergroup_id=group.id).count() == 0)
