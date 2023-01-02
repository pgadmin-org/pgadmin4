##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

#  Get Postgres and Python encoding

encode_dict = {
    'SQL_ASCII': ['SQL_ASCII', 'raw_unicode_escape', 'unicode_escape'],
    'SQLASCII': ['SQL_ASCII', 'raw_unicode_escape', 'unicode_escape'],
    'MULE_INTERNAL': ['MULE_INTERNAL', 'raw_unicode_escape', 'unicode_escape'],
    'MULEINTERNAL': ['MULEINTERNAL', 'raw_unicode_escape', 'unicode_escape'],
    'LATIN1': ['LATIN1', 'latin1', 'latin1'],
    'LATIN2': ['LATIN2', 'latin2', 'latin2'],
    'LATIN3': ['LATIN3', 'latin3', 'latin3'],
    'LATIN4': ['LATIN4', 'latin4', 'latin4'],
    'LATIN5': ['LATIN5', 'latin5', 'latin5'],
    'LATIN6': ['LATIN6', 'latin6', 'latin6'],
    'LATIN7': ['LATIN7', 'latin7', 'latin7'],
    'LATIN8': ['LATIN8', 'latin8', 'latin8'],
    'LATIN9': ['LATIN9', 'latin9', 'latin9'],
    'LATIN10': ['LATIN10', 'latin10', 'latin10'],
    'WIN866': ['WIN866', 'cp866', 'cp866'],
    'WIN874': ['WIN874', 'cp874', 'cp874'],
    'WIN1250': ['WIN1250', 'cp1250', 'cp1250'],
    'WIN1251': ['WIN1251', 'cp1251', 'cp1251'],
    'WIN1252': ['WIN1252', 'cp1252', 'cp1252'],
    'WIN1253': ['WIN1253', 'cp1253', 'cp1253'],
    'WIN1254': ['WIN1254', 'cp1254', 'cp1254'],
    'WIN1255': ['WIN1255', 'cp1255', 'cp1255'],
    'WIN1256': ['WIN1256', 'cp1256', 'cp1256'],
    'WIN1257': ['WIN1257', 'cp1257', 'cp1257'],
    'WIN1258': ['WIN1258', 'cp1258', 'cp1258'],
    'EUC_JIS_2004': ['EUC_JIS_2004', 'eucjis2004', 'eucjis2004'],
    'EUCJIS2004': ['EUCJIS2004', 'eucjis2004', 'eucjis2004'],
    'EUC_CN': ['EUC_CN', 'euc-cn', 'euc-cn'],
    'EUCCN': ['EUCCN', 'euc-cn', 'euc-cn'],
    'EUC_JP': ['EUC_JP', 'euc_jp', 'euc_jp'],
    'EUCJP': ['EUCJP', 'euc_jp', 'euc_jp'],
    'EUC_KR': ['EUC_KR', 'euc_kr', 'euc_kr'],
    'EUCKR': ['EUCKR', 'euc_kr', 'euc_kr'],
    'EUC_TW': ['BIG5', 'big5', 'big5'],
    'EUCTW': ['BIG5', 'big5', 'big5'],
    'ISO_8859_5': ['ISO_8859_5', 'iso8859_5', 'iso8859_5'],
    'ISO88595': ['ISO88595', 'iso8859_5', 'iso8859_5'],
    'ISO_8859_6': ['ISO_8859_6', 'iso8859_6', 'iso8859_6'],
    'ISO88596': ['ISO88596', 'iso8859_6', 'iso8859_6'],
    'ISO_8859_7': ['ISO_8859_7', 'iso8859_7', 'iso8859_7'],
    'ISO88597': ['ISO88597', 'iso8859_7', 'iso8859_7'],
    'ISO_8859_8': ['ISO_8859_8', 'iso8859_8', 'iso8859_8'],
    'ISO88598': ['ISO88598', 'iso8859_8', 'iso8859_8'],
    'KOI8R': ['KOI8R', 'koi8_r', 'koi8_r'],
    'KOI8U': ['KOI8U', 'koi8_u', 'koi8_u'],

}


def get_encoding(key):
    """
    :param key: Database Encoding
    :return:
    [Postgres_encoding, Python_encoding, typecast_encoding] -
    Postgres encoding, Python encoding, type cast encoding
    """
    #
    # Reference: https://www.postgresql.org/docs/11/multibyte.html

    return encode_dict.get(key, ['UNICODE', 'utf-8', 'utf-8'])


def configure_driver_encodings(encodings):
    # Replace the python encoding for original name and renamed encodings
    # psycopg2 removes the underscore in conn.encoding
    # Setting the encodings dict value will only help for select statements
    # because for parameterized DML, param values are converted based on
    # python encoding of pyscopg2s internal encodings dict.
    for key, val in encode_dict.items():
        postgres_encoding, python_encoding, typecast_encoding = val
        encodings[key] = python_encoding
