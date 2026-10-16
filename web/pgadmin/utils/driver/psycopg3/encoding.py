##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

#  Get Postgres and Python encoding

import codecs
import encodings.raw_unicode_escape
import re

import psycopg
from flask import current_app

# Python codec used for SQL_ASCII databases. Each byte decodes to the code
# point of the same value (as latin-1), except that a \uXXXX or \UXXXXXXXX
# escape for a code point from U+0100 to U+10FFFF is unescaped. Encoding is
# raw_unicode_escape, which writes code points below U+0100 as single bytes
# and anything higher as such an escape, so this reads back what pgAdmin
# writes. Escapes below U+0100 (which pgAdmin never writes) and invalid
# sequences, such as the '\U' in a column named 'C:\User', are kept as their
# literal bytes so that they are neither rewritten on save nor raise
# UnicodeDecodeError.
#
# As with raw_unicode_escape, a 'u' or 'U' is only an escape when preceded
# by an odd number of backslashes.
SQL_ASCII_CODEC = 'pgadmin_sql_ascii'

# Both patterns only start matching at the beginning of a run of
# backslashes, so a long run is not rescanned from every backslash in it.
_ESCAPE = re.compile(
    r'(?<!\\)(\\+)(?:u([0-9A-Fa-f]{4})|U([0-9A-Fa-f]{8}))')

# A trailing run of backslashes, perhaps followed by an incomplete escape,
# that the next chunk of input could still turn into (part of) an escape.
_PARTIAL_ESCAPE = re.compile(r'(?<!\\)(\\+)(?:[uU][0-9A-Fa-f]{0,7})?\Z')


def _unescape(match):
    backslashes, short_hex, long_hex = match.groups()
    code_point = int(short_hex or long_hex, 16)
    if len(backslashes) % 2 and 0x100 <= code_point <= 0x10FFFF:
        return backslashes[:-1] + chr(code_point)
    return match.group(0)


def _sql_ascii_decode_text(data, final=True):
    # latin-1 maps every byte to the code point of the same value, so the
    # escapes can be found in the decoded text.
    text = bytes(data).decode('latin-1')
    end = len(text)
    if not final:
        partial = _PARTIAL_ESCAPE.search(text)
        if partial:
            # Pairs of backslashes never start an escape, so only hold
            # back the last backslash of an odd run. This keeps a long run
            # from being buffered and rescanned on every call.
            backslashes = len(partial.group(1))
            if backslashes % 2:
                end = partial.start() + backslashes - 1
    return _ESCAPE.sub(_unescape, text[:end]), end


def _sql_ascii_decode(data, errors='strict'):
    # Every byte sequence is valid, so errors never applies.
    return _sql_ascii_decode_text(data)


class _SQLAsciiIncrementalDecoder(codecs.BufferedIncrementalDecoder):
    def _buffer_decode(self, data, errors, final):
        return _sql_ascii_decode_text(data, final)


def _sql_ascii_search(name):
    if name != SQL_ASCII_CODEC:
        return None
    return codecs.CodecInfo(
        name=SQL_ASCII_CODEC,
        encode=codecs.raw_unicode_escape_encode,
        decode=_sql_ascii_decode,
        incrementalencoder=encodings.raw_unicode_escape.IncrementalEncoder,
        incrementaldecoder=_SQLAsciiIncrementalDecoder,
    )


codecs.register(_sql_ascii_search)

encode_dict = {
    'SQL_ASCII': ['SQL_ASCII', SQL_ASCII_CODEC],
    'SQLASCII': ['SQLASCII', SQL_ASCII_CODEC],
    # EUC_TW Not availble in Python,
    # so psycopg3 do not support it, we are on our own
    'EUC_TW': ['BIG5', 'big5'],
    'EUCTW': ['BIG5', 'big5'],
    # psycopg3 do not support unicode
    'UNICODE': ['utf-8', 'utf-8']
}


def get_encoding(key):
    """
    :param key: Database Encoding
    :return:
    [Postgres_encoding, Python_encoding] -
    Postgres encoding, Python encoding, type cast encoding
    """
    #
    # Reference: https://www.postgresql.org/docs/11/multibyte.html
    #
    if key == 'ascii':
        key = SQL_ASCII_CODEC
    try:
        postgres_encoding = psycopg._encodings.py2pgenc(key).decode()
    except Exception as e:
        # For unsupported encodings by psycopg like UNICODE
        current_app.logger.error(e)
        postgres_encoding = 'utf-8'

    python_encoding = psycopg._encodings.py_codecs.get(
        postgres_encoding.upper().encode(), 'utf-8')

    _dict = encode_dict.get(postgres_encoding.upper(),
                            [postgres_encoding,
                             python_encoding])
    return _dict


def configure_driver_encodings(encodings):
    # Replace the python encoding for original name and renamed encodings
    # psycopg removes the underscore in conn.encoding
    # Setting the encodings dict value will only help for select statements
    # because for parameterized DML, param values are converted based on
    # python encoding of pyscopg's internal encodings dict.

    for key, val in encode_dict.items():
        _, python_encoding = val
        psycopg._encodings.py_codecs[key.encode()] = python_encoding

    encodings.update(psycopg._encodings.py_codecs)
    psycopg._encodings.pg_codecs = {
        v: k for k, v in psycopg._encodings.py_codecs.items()}
