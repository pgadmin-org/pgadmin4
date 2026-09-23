##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from unittest.mock import patch

from pgadmin.utils import connection_params_to_env
from pgadmin.utils.route import BaseTestGenerator


class TestConnectionParamsToEnv(BaseTestGenerator):
    """Check that the connection parameters set against a server are
    translated into the libpq environment variables that carry them, so
    that the utilities connect the way the server dialog says they should.
    """

    scenarios = [
        ('No parameters at all',
         dict(
             connection_params=None,
             expected_env={}
         )),
        ('Something that is not a dict',
         dict(
             connection_params=['sslmode=require'],
             expected_env={}
         )),
        ('GSS encryption mode is passed through',
         dict(
             connection_params={'gssencmode': 'disable'},
             expected_env={'PGGSSENCMODE': 'disable'}
         )),
        ('SSL mode is passed without any certificate being configured',
         dict(
             connection_params={'sslmode': 'verify-full'},
             expected_env={'PGSSLMODE': 'verify-full'}
         )),
        ('The wider Kerberos and SSL parameters are all passed',
         dict(
             connection_params={
                 'gssencmode': 'require',
                 'gsslib': 'gssapi',
                 'krbsrvname': 'postgres',
                 'sslmode': 'require',
                 'ssl_min_protocol_version': 'TLSv1.3',
                 'target_session_attrs': 'read-write',
                 'channel_binding': 'require',
             },
             expected_env={
                 'PGGSSENCMODE': 'require',
                 'PGGSSLIB': 'gssapi',
                 'PGKRBSRVNAME': 'postgres',
                 'PGSSLMODE': 'require',
                 'PGSSLMINPROTOCOLVERSION': 'TLSv1.3',
                 'PGTARGETSESSIONATTRS': 'read-write',
                 'PGCHANNELBINDING': 'require',
             }
         )),
        ('Booleans are converted to the integers libpq expects',
         dict(
             connection_params={'sslcompression': True, 'sslsni': False,
                                'gssdelegation': True},
             expected_env={'PGSSLCOMPRESSION': '1', 'PGSSLSNI': '0',
                           'PGGSSDELEGATION': '1'}
         )),
        ('Parameters libpq has no environment variable for are dropped',
         dict(
             connection_params={'keepalives': 1, 'keepalives_idle': 30,
                                'sslpassword': 'secret',
                                'fallback_application_name': 'pgAdmin 4',
                                'gssencmode': 'prefer'},
             expected_env={'PGGSSENCMODE': 'prefer'}
         )),
        ('Empty values are dropped rather than passed as an empty string',
         dict(
             connection_params={'gssencmode': '', 'krbsrvname': None,
                                'sslmode': 'prefer'},
             expected_env={'PGSSLMODE': 'prefer'}
         )),
        ('File parameters are resolved to a complete path',
         dict(
             connection_params={'sslcert': 'client.crt',
                                'passfile': 'pgpass'},
             file_paths={'client.crt': '/storage/client.crt',
                         'pgpass': '/storage/pgpass'},
             expected_env={'PGSSLCERT': '/storage/client.crt',
                           'PGPASSFILE': '/storage/pgpass'}
         )),
        ('An unresolvable file is passed as an empty value',
         dict(
             connection_params={'sslkey': 'missing.key'},
             file_paths={},
             expected_env={'PGSSLKEY': ''}
         )),
        ('A CRL directory is resolved without the file check',
         dict(
             connection_params={'sslcrldir': 'crls'},
             file_paths={'crls': '/storage/crls'},
             dirs=['/storage/crls'],
             expected_env={'PGSSLCRLDIR': '/storage/crls'}
         )),
        ('A CRL directory that does not exist is passed as an empty value',
         dict(
             connection_params={'sslcrldir': 'missing'},
             file_paths={'missing': '/storage/missing'},
             dirs=[],
             expected_env={'PGSSLCRLDIR': ''}
         )),
        ('A root certificate of "system" is left alone',
         dict(
             connection_params={'sslrootcert': 'system'},
             file_paths={},
             expected_env={'PGSSLROOTCERT': 'system'}
         )),
    ]

    def runTest(self):
        file_paths = getattr(self, 'file_paths', None)

        if file_paths is None:
            env = connection_params_to_env(self.connection_params)
        else:
            dirs = getattr(self, 'dirs', [])
            with patch('pgadmin.utils.get_complete_file_path',
                       side_effect=lambda f, **kwargs: file_paths.get(f)), \
                    patch('pgadmin.utils.os.path.isdir',
                          side_effect=lambda d: d in dirs):
                env = connection_params_to_env(self.connection_params)

        self.assertEqual(env, self.expected_env)
