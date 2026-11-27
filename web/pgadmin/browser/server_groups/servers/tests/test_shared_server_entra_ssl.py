##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A non-owner of a shared server who selects entra is checked against the
sslmode they connect with, the owner's, not the one their own row kept."""

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from pgadmin.browser.server_groups import servers as servers_module
from pgadmin.utils.route import BaseTestGenerator


class SharedServerEntraSslTest(BaseTestGenerator):
    scenarios = [
        ('Owner verify-full, stale per-user prefer',
         dict(owner='verify-full', own='prefer', refused=False)),
        ('Owner prefer, per-user verify-full',
         dict(owner='prefer', own='verify-full', refused=True)),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        own_params = {'sslmode': self.own, 'sslcert': 'own.crt'}
        effective = servers_module.shared_connection_params(
            {'sslmode': self.owner, 'sslcert': 'owner.crt',
             'sslkey': 'owner.key'},
            own_params)
        # The owner's non-sensitive keys, the user's own file paths only.
        self.assertEqual(effective, {'sslmode': self.owner,
                                     'sslcert': 'own.crt'})

        current = SimpleNamespace(auth_method='password',
                                  connection_params=own_params)
        with patch.object(servers_module, 'check_entra_available',
                          return_value=None):
            err = servers_module.ServerNode.\
                _check_update_auth_method_and_clear_password(
                    {'auth_method': 'entra'}, current, 'db.example.test',
                    effective)
        self.assertEqual(err is not None, self.refused)
        if self.refused:
            self.assertIn('verify-full', err)
