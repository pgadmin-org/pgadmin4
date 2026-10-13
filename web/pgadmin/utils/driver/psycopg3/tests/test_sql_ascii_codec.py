##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for the codec used for SQL_ASCII databases (#5940).

Identifiers or data containing a backslash followed by 'u' or 'U' (for
example a table or column called 'C:\\User\\te') used to make
raw_unicode_escape raise "truncated \\UXXXXXXXX escape" whilst psycopg
decoded the column names, breaking View/Edit Data.
"""

import codecs

from pgadmin.utils.driver.psycopg3.encoding import SQL_ASCII_CODEC
from pgadmin.utils.route import BaseTestGenerator


class TestSQLAsciiCodec(BaseTestGenerator):
    """Decode/encode behaviour of the SQL_ASCII codec."""

    scenarios = [
        ('Invalid \\U escape is kept literally',
         dict(data=b'C:\\User\\te', expected='C:\\User\\te')),
        ('Invalid \\u escape is kept literally',
         dict(data=b'C:\\users', expected='C:\\users')),
        ('Truncated escape at the end is kept literally',
         dict(data=b'abc\\u12', expected='abc\\u12')),
        ('Valid \\u escape is still unescaped',
         dict(data=b'caf\\u00e9', expected='caf\u00e9',
              round_trip=False)),
        ('Valid escape after an invalid one is still unescaped',
         dict(data=b'\\User \\u00e9', expected='\\User \u00e9',
              round_trip=False)),
        ('High bytes decode as latin-1, as with raw_unicode_escape',
         dict(data=b'\xe9\\Ux', expected='\xe9\\Ux')),
        ('Other backslash sequences are left alone',
         dict(data=b'C:\\temp\\new', expected='C:\\temp\\new')),
    ]

    # raw_unicode_escape writes code points below 256 as single bytes, so
    # an unescaped \u00e9 does not encode back to the original escape.
    round_trip = True

    def setUp(self):
        # No DB connection needed for this test.
        pass

    def runTest(self):
        decoded = self.data.decode(SQL_ASCII_CODEC)
        self.assertEqual(decoded, self.expected)
        self.assertEqual(str(self.data, SQL_ASCII_CODEC), self.expected)

        # Encoding must match raw_unicode_escape, so queries built from
        # the decoded names are sent to the server unchanged.
        self.assertEqual(decoded.encode(SQL_ASCII_CODEC),
                         decoded.encode('raw_unicode_escape'))
        if self.round_trip:
            self.assertEqual(decoded.encode(SQL_ASCII_CODEC), self.data)

        # psycopg decodes server error messages with errors='replace',
        # which must keep invalid escapes literally as well.
        self.assertEqual(self.data.decode(SQL_ASCII_CODEC, 'replace'),
                         self.expected)

        # Decoding a byte at a time, as a stream reader would, gives the
        # same result as decoding the whole value at once.
        decoder = codecs.getincrementaldecoder(SQL_ASCII_CODEC)()
        self.assertEqual(
            ''.join(decoder.decode(self.data[i:i + 1])
                    for i in range(len(self.data))) +
            decoder.decode(b'', final=True),
            self.expected)
        self.assertEqual(
            codecs.getincrementalencoder(SQL_ASCII_CODEC)().encode(decoded),
            decoded.encode(SQL_ASCII_CODEC))
