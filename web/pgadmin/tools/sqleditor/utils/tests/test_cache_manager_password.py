##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.crypto import decrypt
from unittest.mock import patch, MagicMock

import pgadmin.tools.sqleditor as sqleditor

CRYPT_KEY = 'test-crypt-key'
LONG_TOKEN = (
    'abc.rds.amazonaws.com:5432/?Action=connect&'
    'X-Amz-Algorithm=AWS4-HMAC-SHA256&'
    'X-Amz-Credential=ABC%2F20250820%2Fus-east-1&'
    'X-Amz-Signature=deadbeef+slashes%2F%2F'
) * 8


class CacheManagerPasswordTest(BaseTestGenerator):
    """
    Regression test for issue #9091.

    When a tool (Query Tool, View/Edit Data, etc.) prompts for a password
    that was not saved, the entered password is POSTed to the connect_server
    endpoint.  If the server's primary connection is already connected the
    endpoint short-circuits; _cache_manager_password_from_request makes sure
    the entered password is still cached on the manager (encrypted), so the
    tool's connection can reuse it instead of being re-prompted in a loop.
    """

    scenarios = [
        ('When a password is supplied it is encrypted and cached', dict(
            form_data={'password': LONG_TOKEN},
            crypt_key_present=True,
            expect_cached=True,
        )),
        ('When an existing cached password is overwritten', dict(
            form_data={'password': LONG_TOKEN},
            crypt_key_present=True,
            existing_password=b'stale-encrypted-token',
            expect_cached=True,
        )),
        ('When no password is supplied it is a no-op', dict(
            form_data={},
            crypt_key_present=True,
            expect_cached=False,
        )),
        ('When an empty password is supplied it is a no-op', dict(
            form_data={'password': ''},
            crypt_key_present=True,
            expect_cached=False,
        )),
        ('When the crypt key is missing it is a no-op', dict(
            form_data={'password': LONG_TOKEN},
            crypt_key_present=False,
            expect_cached=False,
        )),
    ]

    def runTest(self):
        manager = MagicMock()
        manager.password = getattr(self, 'existing_password', None)

        def _update_password(passwd):
            manager.password = passwd

        manager._update_password.side_effect = _update_password

        mock_request = MagicMock()
        mock_request.form = self.form_data
        mock_request.data = None

        crypt_key = CRYPT_KEY if self.crypt_key_present else None

        with patch.object(sqleditor, 'request', mock_request), \
            patch.object(sqleditor, 'get_crypt_key',
                         return_value=(self.crypt_key_present, crypt_key)):
            sqleditor._cache_manager_password_from_request(manager)

        if self.expect_cached:
            self.assertTrue(manager._update_password.called)
            self.assertTrue(manager.update_session.called)
            # The cached value must be the encrypted form of the supplied
            # password and must decrypt back to the original token intact.
            cached = manager.password
            self.assertIsNotNone(cached)
            self.assertNotEqual(cached, self.form_data['password'])
            decrypted = decrypt(cached, CRYPT_KEY)
            if isinstance(decrypted, bytes):
                decrypted = decrypted.decode()
            self.assertEqual(decrypted, self.form_data['password'])
        else:
            self.assertFalse(manager._update_password.called)
            self.assertFalse(manager.update_session.called)
