##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2022, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

#  Get Postgres and Python encoding

import psycopg

encode_dict = {
    'SQL_ASCII': ['SQL_ASCII', 'raw-unicode-escape'],
    'SQLASCII': ['SQLASCII', 'raw-unicode-escape'],
    # EUC_TW Not availble in Python,
    # so psycopg3 do not support it, we are on our own
    'EUC_TW': ['BIG5', 'big5'],
    'EUCTW': ['BIG5', 'big5']
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
        key = 'raw_unicode_escape'
    postgres_encoding = psycopg._encodings.py2pgenc(key).decode()

    python_encoding = psycopg._encodings._py_codecs.get(postgres_encoding,
                                                        'utf-8')

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
        postgres_encoding, python_encoding = val
        psycopg._encodings._py_codecs[key] = python_encoding

    encodings.update((k.encode(), v
                      ) for k, v in psycopg._encodings._py_codecs.items())
    psycopg._encodings.pg_codecs = {
        v: k.encode() for k, v in psycopg._encodings._py_codecs.items()}
