##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from flask import session

from pgadmin.misc.bgprocess.processes import BatchProcess
from pgadmin.utils.constants import INTERNAL, KERBEROS
from pgadmin.utils.locker import KerberosNotAllowed
from pgadmin.utils.route import BaseTestGenerator


class TestSetEnvVariablesKerberos(BaseTestGenerator):
    """Check that in server mode a utility's environment makes libpq refuse
    GSSAPI and SSPI where the connection may not use Kerberos, merged with
    the server's own require_auth, and is left alone in desktop mode.
    """

    scenarios = [
        ('An internal user has GSSAPI and SSPI refused',
         dict(params={},
              expected={'PGREQUIREAUTH': '!gss,!sspi',
                        'PGGSSENCMODE': 'disable'},
              absent=('PGGSSLIB',))),
        ('The server\'s require_auth is merged',
         dict(params={'require_auth': 'scram-sha-256,gss',
                      'gssencmode': 'require'},
              expected={'PGREQUIREAUTH': 'scram-sha-256',
                        'PGGSSENCMODE': 'disable'})),
        ('Negated methods of the server are kept',
         dict(params={'require_auth': '!password'},
              expected={'PGREQUIREAUTH': '!password,!gss,!sspi',
                        'PGGSSENCMODE': 'disable'})),
        ('A server accepting only GSSAPI is refused',
         dict(params={'require_auth': 'gss'}, error=True)),
        ('A Kerberos user connecting with Kerberos has only SSPI refused',
         dict(source=KERBEROS, kerberos_conn=True, params={},
              expected={'PGREQUIREAUTH': '!sspi', 'PGGSSLIB': 'gssapi'},
              absent=('PGGSSENCMODE',))),
        ('A Kerberos user\'s PGGSSLIB is forced to gssapi',
         dict(source=KERBEROS, kerberos_conn=True,
              params={'gsslib': 'sspi'},
              expected={'PGGSSLIB': 'gssapi'})),
        ('A Kerberos user may use a server accepting only GSSAPI',
         dict(source=KERBEROS, kerberos_conn=True,
              params={'require_auth': 'gss'},
              expected={'PGREQUIREAUTH': 'gss', 'PGGSSLIB': 'gssapi'})),
        ('A Kerberos user on a server without Kerberos is as any other',
         dict(source=KERBEROS, kerberos_conn=False, params={},
              expected={'PGREQUIREAUTH': '!gss,!sspi',
                        'PGGSSENCMODE': 'disable'},
              absent=('PGGSSLIB',))),
        ('Desktop mode sets nothing',
         dict(server_mode=False, params={},
              absent=('PGREQUIREAUTH', 'PGGSSENCMODE', 'PGGSSLIB'))),
        ('Desktop mode leaves the server\'s require_auth alone',
         dict(server_mode=False, params={'require_auth': 'gss'},
              expected={'PGREQUIREAUTH': 'gss'})),
    ]

    server_mode = True
    source = INTERNAL
    kerberos_conn = False
    expected = {}
    absent = ()

    def runTest(self):
        # Skip __init__, which would create a Process row.
        p = BatchProcess.__new__(BatchProcess)
        p.id = 'test'
        p.env = dict()
        p.manager_obj = MagicMock(
            connection_params=self.params, use_ssh_tunnel=False,
            service=None, kerberos_conn=self.kerberos_conn)
        server = SimpleNamespace(service=None, connection_params={},
                                 kerberos_conn=self.kerberos_conn)

        config = {'SERVER_MODE': self.server_mode}

        with self.app.test_request_context(), \
                patch.dict(self.app.config, config), \
                patch('pgadmin.utils.locker.config.SERVER_MODE',
                      self.server_mode), \
                patch('pgadmin.utils.locker.libpq_version',
                      return_value=160000), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False):
            session['auth_source_manager'] = {'current_source': self.source}
            session['KRB5CCNAME'] = 'FILE:/tmp/pgadmin_cache_alice'
            if getattr(self, 'error', False):
                with self.assertRaises(KerberosNotAllowed):
                    p.set_env_variables(server)
                return
            p.set_env_variables(server)

        for key, value in self.expected.items():
            self.assertEqual(p.env.get(key), value, key)
        for key in self.absent:
            self.assertNotIn(key, p.env)
