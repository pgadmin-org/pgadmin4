##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from pgadmin.utils import is_valid_connection_param_key, \
    get_invalid_connection_param_key
from pgadmin.utils.route import BaseTestGenerator


class TestConnectionParamKeyValidation(BaseTestGenerator):
    """
    make_conninfo() quotes connection-parameter values but not their keys,
    so a key that smuggles its own "keyword=value" pairs (via an '=' sign
    or embedded/leading/trailing whitespace) would reach libpq as extra,
    unconfined connection directions. Only exact libpq keywords are allowed
    as connection-parameter keys.
    """

    scenarios = [
        # --- Accepted: exact libpq keywords ---
        ('A plain keyword is accepted',
         dict(connection_params={'sslmode': 'require'},
              invalid_key=None)),
        ('A file keyword is accepted',
         dict(connection_params={'passfile': 'pgpass'},
              invalid_key=None)),
        ('Several exact keywords are accepted',
         dict(connection_params={'host': 'db', 'port': '5432',
                                 'sslmode': 'verify-full'},
              invalid_key=None)),
        ('No parameters at all',
         dict(connection_params=None, invalid_key=None)),
        ('An empty dict',
         dict(connection_params={}, invalid_key=None)),
        ('Something that is not a dict',
         dict(connection_params=['sslmode=require'], invalid_key=None)),

        # --- Refused: injected keys ---
        ('A key carrying a second keyword via "=" is refused',
         dict(connection_params={'sslmode=require passfile':
                                 '/../bob/.pgpass'},
              invalid_key='sslmode=require passfile')),
        ('A key with a leading space is refused',
         dict(connection_params={' passfile': '/../bob/.pgpass'},
              invalid_key=' passfile')),
        ('A key with a trailing space is refused',
         dict(connection_params={'passfile ': '/../bob/.pgpass'},
              invalid_key='passfile ')),
        ('A key smuggling a keyword via whitespace and "=" is refused',
         dict(connection_params={'keepalives=1 sslkeylogfile': '/tmp/x'},
              invalid_key='keepalives=1 sslkeylogfile')),
        ('A key reintroducing GSSAPI is refused',
         dict(connection_params={'application_name=c require_auth': 'gss'},
              invalid_key='application_name=c require_auth')),
        ('A key that is not a libpq keyword at all is refused',
         dict(connection_params={'not_a_real_keyword': 'x'},
              invalid_key='not_a_real_keyword')),
        ('A valid key alongside an injected key is still refused',
         dict(connection_params={'sslmode': 'require',
                                 'sslmode=require passfile': '/x'},
              invalid_key='sslmode=require passfile')),
    ]

    def runTest(self):
        invalid = get_invalid_connection_param_key(self.connection_params)
        self.assertEqual(invalid, self.invalid_key)

        # The injected key must also fail the single-key check, and a
        # valid key must pass it.
        if self.invalid_key is not None:
            self.assertFalse(
                is_valid_connection_param_key(self.invalid_key))
        if isinstance(self.connection_params, dict):
            for key in self.connection_params:
                if key != self.invalid_key:
                    self.assertTrue(
                        is_valid_connection_param_key(key),
                        'Expected {0!r} to be a valid libpq keyword'.format(
                            key))
