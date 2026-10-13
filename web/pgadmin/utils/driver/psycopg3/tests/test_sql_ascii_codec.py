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

Valid escapes for code points below U+0100 (for example a value '\\u0041')
used to be unescaped, so the text was shown and saved back differently
(#10547). pgAdmin never writes those escapes, so they are now kept as well.
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
        ('Escape above U+00FF is unescaped',
         dict(data=b'price \\u20ac', expected='price \u20ac')),
        ('Escape above U+FFFF is unescaped',
         dict(data=b'\\U0001f600', expected='\U0001f600')),
        # raw_unicode_escape writes hex digits in lower case.
        ('Upper case escape above U+00FF is unescaped',
         dict(data=b'\\u20AC', expected='\u20ac', round_trip=False)),
        ('Escape after an invalid one is still unescaped',
         dict(data=b'\\User \\u20ac', expected='\\User \u20ac')),
        ('Escape below U+0100 is kept literally',
         dict(data=b'\\u0041 caf\\u00e9', expected='\\u0041 caf\\u00e9')),
        ('Long escape below U+0100 is kept literally',
         dict(data=b'\\U00000041', expected='\\U00000041')),
        ('Escape beyond U+10FFFF is kept literally',
         dict(data=b'\\U00110000', expected='\\U00110000')),
        ('Escaped backslash before u is kept literally',
         dict(data=b'\\\\u20ac', expected='\\\\u20ac')),
        ('Odd run of backslashes before an escape unescapes it',
         dict(data=b'\\\\\\u20ac', expected='\\\\\u20ac')),
        ('Trailing backslash is kept literally',
         dict(data=b'abc\\', expected='abc\\')),
        ('Long run of backslashes before a non-escape is kept literally',
         dict(data=b'\\' * 20001 + b'x', expected='\\' * 20001 + 'x')),
        ('Long odd run of backslashes before an escape unescapes it',
         dict(data=b'\\' * 20001 + b'u20ac',
              expected='\\' * 20000 + '\u20ac')),
        ('High bytes decode as latin-1, as with raw_unicode_escape',
         dict(data=b'\xe9\\Ux', expected='\xe9\\Ux')),
        ('Other backslash sequences are left alone',
         dict(data=b'C:\\temp\\new', expected='C:\\temp\\new')),
    ]

    # Whether encoding the decoded text gives back the original bytes.
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
