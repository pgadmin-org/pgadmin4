##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from unittest.mock import MagicMock, patch

from pgadmin.utils.driver.psycopg3.connection import Connection
from pgadmin.utils.route import BaseTestGenerator

MODULE = 'pgadmin.utils.driver.psycopg3.connection'


class TestDecodePassword(BaseTestGenerator):
    """Saved password decryption failures must be non-fatal."""

    scenarios = [
        ('Undecryptable ciphertext is discarded', dict(
            side_effect=UnicodeDecodeError('utf-8', b'\xff', 0, 1, 'bad'),
            discarded=True)),
        ('Valid ciphertext is decrypted', dict(
            return_value=b'secret', discarded=False, expected='secret')),
        ('Unexpected errors still propagate', dict(
            side_effect=TypeError('no key'), raises=True)),
    ]

    def runTest(self):
        conn = Connection.__new__(Connection)
        conn.password = 'enc'
        conn.saved_password_discarded = False
        manager = MagicMock(sid=1, password='enc')

        user = MagicMock()
        dec = MagicMock()
        # Explicit replacement objects: patching with the default MagicMock
        # would make mock inspect the flask proxies outside an app context.
        with patch(MODULE + '.User', user), \
                patch(MODULE + '.current_user', MagicMock()), \
                patch(MODULE + '.current_app', MagicMock()), \
                patch(MODULE + '.decrypt', dec):
            user.query.filter_by.return_value.first.return_value = object()
            if hasattr(self, 'side_effect'):
                dec.side_effect = self.side_effect
            else:
                dec.return_value = self.return_value

            if getattr(self, 'raises', False):
                with self.assertRaises(TypeError):
                    conn._decode_password('enc', manager, None, 'key')
                return

            result = conn._decode_password('enc', manager, None, 'key')

        if self.discarded:
            self.assertEqual(result, (False, '', None, True))
            self.assertIsNone(conn.password)
            self.assertIsNone(manager.password)
            self.assertTrue(conn.saved_password_discarded)
        else:
            self.assertEqual(result, (False, '', self.expected, False))
