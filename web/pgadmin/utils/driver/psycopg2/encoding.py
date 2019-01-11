##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

#  Get Postgres and Python encoding

encode_dict = {
    'SQL_ASCII': ['SQL_ASCII', 'raw_unicode_escape'],
    'SQLASCII': ['SQL_ASCII', 'raw_unicode_escape'],
    'MULE_INTERNAL': ['MULE_INTERNAL', 'raw_unicode_escape'],
    'MULEINTERNAL': ['MULEINTERNAL', 'raw_unicode_escape'],
    'LATIN1': ['LATIN1', 'latin1'],
    'LATIN2': ['LATIN2', 'latin2'],
    'LATIN3': ['LATIN3', 'latin3'],
    'LATIN4': ['LATIN4', 'latin4'],
    'LATIN5': ['LATIN5', 'latin5'],
    'LATIN6': ['LATIN6', 'latin6'],
    'LATIN7': ['LATIN7', 'latin7'],
    'LATIN8': ['LATIN8', 'latin8'],
    'LATIN9': ['LATIN9', 'latin9'],
    'LATIN10': ['LATIN10', 'latin10']
}


def getEncoding(key):
    """
    :param key: Database Encoding
    :return:
    [Postgres_encoding, Python_encoding] - Postgres and Python encoding
    """
    return encode_dict.get(key, ['UNICODE', 'utf-8'])

def configureDriverEncodings(encodings):
    # Replace the python encoding for original name and renamed encodings
    # psycopg2 removes the underscore in conn.encoding
    # Setting the encodings dict value will only help for select statements
    # because for parameterized DML, param values are converted based on
    # python encoding of pyscopg2s internal encodings dict.
    for key, val in encode_dict.items():
        postgres_encoding, python_encoding = val
        encodings[key] = python_encoding
