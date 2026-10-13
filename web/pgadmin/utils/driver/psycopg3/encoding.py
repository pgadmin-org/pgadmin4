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

import psycopg
from flask import current_app

# Python codec used for SQL_ASCII databases. It behaves exactly like
# raw_unicode_escape, except that a backslash sequence which is not a valid
# \uXXXX or \UXXXXXXXX escape (for example the '\U' in a column named
# 'C:\User') is kept as the literal bytes rather than raising
# UnicodeDecodeError. psycopg decodes column names and query text with the
# connection codec, so a strict decode there breaks View/Edit Data.
SQL_ASCII_CODEC = 'pgadmin_sql_ascii'
_SQL_ASCII_ERRORS = 'pgadmin_sql_ascii_literal'


def _keep_invalid_escape(exc):
    if not isinstance(exc, UnicodeDecodeError):
        raise exc
    # Every byte maps to the same code point in latin-1, which is also what
    # raw_unicode_escape produces for the bytes it does not unescape.
    return exc.object[exc.start:exc.end].decode('latin-1'), exc.end


def _sql_ascii_decode(data, errors='strict'):
    if errors == 'strict':
        errors = _SQL_ASCII_ERRORS
    return codecs.raw_unicode_escape_decode(data, errors)


def _sql_ascii_search(name):
    if name != SQL_ASCII_CODEC:
        return None
    return codecs.CodecInfo(
        name=SQL_ASCII_CODEC,
        encode=codecs.raw_unicode_escape_encode,
        decode=_sql_ascii_decode,
    )


codecs.register_error(_SQL_ASCII_ERRORS, _keep_invalid_escape)
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
