##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Typecast various data types so that they can be compatible with Javascript
data types.
"""

import sys

from psycopg2 import STRING as _STRING
import psycopg2
from psycopg2.extensions import encodings


# OIDs of data types which need to typecast as string to avoid JavaScript
# compatibility issues.
# e.g JavaScript does not support 64 bit integers. It has 64-bit double
# giving only 53 bits of integer range (IEEE 754)
# So to avoid loss of remaining 11 bits (64-53) we need to typecast bigint to
# string.

TO_STRING_DATATYPES = (
        # To cast bytea, interval type
        17, 1186,

        # date, timestamp, timestamptz, bigint, double precision
        1700, 1082, 1114, 1184, 20, 701,

        # real, time without time zone
        700, 1083
)

# OIDs of array data types which need to typecast to array of string.
# This list may contain:
# OIDs of data types from PSYCOPG_SUPPORTED_ARRAY_DATATYPES as they need to be
# typecast to array of string.
# Also OIDs of data types which psycopg2 does not typecast array of that
# data type. e.g: uuid, bit, varbit, etc.

TO_ARRAY_OF_STRING_DATATYPES = (
        # To cast bytea[] type
        1001,

        # bigint[]
        1016,

        # double precision[], real[]
        1022, 1021,

        # bit[], varbit[]
        1561, 1563,
)

# OID of record array data type
RECORD_ARRAY = (2287,)


# OIDs of builtin array datatypes supported by psycopg2
# OID reference psycopg2/psycopg/typecast_builtins.c
#
# For these array data types psycopg2 returns result in list.
# For all other array data types psycopg2 returns result as string (string
# representing array literal)
# e.g:
#
# For below two sql psycopg2 returns result in different formats.
#   SELECT '{foo,bar}'::text[];
#   print('type of {} ==> {}'.format(res[0], type(res[0])))
#   SELECT '{<a>foo</a>,<b>bar</b>}'::xml[];
#   print('type of {} ==> {}'.format(res[0], type(res[0])))
#
# Output:
#   type of ['foo', 'bar'] ==> <type 'list'>
#   type of {<a>foo</a>,<b>bar</b>} ==> <type 'str'>

PSYCOPG_SUPPORTED_BUILTIN_ARRAY_DATATYPES = (
    1016, 1005, 1006, 1007, 1021, 1022, 1231,
    1002, 1003, 1009, 1014, 1015, 1009, 1014,
    1015, 1000, 1115, 1185, 1183, 1270, 1182,
    1187, 1001, 1028, 1013, 1041, 651, 1040
)

# json, jsonb
# OID reference psycopg2/lib/_json.py
PSYCOPG_SUPPORTED_JSON_TYPES = (114, 3802)

# json[], jsonb[]
PSYCOPG_SUPPORTED_JSON_ARRAY_TYPES = (199, 3807)

ALL_JSON_TYPES = PSYCOPG_SUPPORTED_JSON_TYPES +\
                 PSYCOPG_SUPPORTED_JSON_ARRAY_TYPES


# INET[], CIDR[]
# OID reference psycopg2/lib/_ipaddress.py
PSYCOPG_SUPPORTED_IPADDRESS_ARRAY_TYPES = (1041, 651)


# uuid[]
# OID reference psycopg2/lib/extras.py
PSYCOPG_SUPPORTED_IPADDRESS_ARRAY_TYPES = (2951,)


# int4range, int8range, numrange, daterange tsrange, tstzrange[]
# OID reference psycopg2/lib/_range.py
PSYCOPG_SUPPORTED_RANGE_TYPES = (3904, 3926, 3906, 3912, 3908, 3910)


# int4range[], int8range[], numrange[], daterange[] tsrange[], tstzrange[]
# OID reference psycopg2/lib/_range.py
PSYCOPG_SUPPORTED_RANGE_ARRAY_TYPES = (3905, 3927, 3907, 3913, 3909, 3911)


def register_global_typecasters():
    if sys.version_info < (3,):
        psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)
        psycopg2.extensions.register_type(psycopg2.extensions.UNICODEARRAY)

    unicode_type_for_record = psycopg2.extensions.new_type(
        (2249,),
        "RECORD",
        psycopg2.extensions.UNICODE
    )

    unicode_array_type_for_record_array = psycopg2.extensions.new_array_type(
        RECORD_ARRAY,
        "ARRAY_RECORD",
        unicode_type_for_record
    )

    # This registers a unicode type caster for datatype 'RECORD'.
    psycopg2.extensions.register_type(unicode_type_for_record)

    # This registers a array unicode type caster for datatype 'ARRAY_RECORD'.
    psycopg2.extensions.register_type(unicode_array_type_for_record_array)

    # define type caster to convert various pg types into string type
    pg_types_to_string_type = psycopg2.extensions.new_type(
        TO_STRING_DATATYPES + PSYCOPG_SUPPORTED_RANGE_TYPES,
        'TYPECAST_TO_STRING', _STRING
    )

    # define type caster to convert pg array types of above types into
    # array of string type
    pg_array_types_to_array_of_string_type = psycopg2.extensions.new_array_type(
        TO_ARRAY_OF_STRING_DATATYPES,
        'TYPECAST_TO_ARRAY_OF_STRING', pg_types_to_string_type
    )

    # This registers a type caster to convert various pg types into string type
    psycopg2.extensions.register_type(pg_types_to_string_type)

    # This registers a type caster to convert various pg array types into
    # array of string type
    psycopg2.extensions.register_type(pg_array_types_to_array_of_string_type)


def register_string_typecasters(connection):
    if connection.encoding != 'UTF8':
        # In python3 when database encoding is other than utf-8 and client
        # encoding is set to UNICODE then we need to map data from database
        # encoding to utf-8.
        # This is required because when client encoding is set to UNICODE then
        # psycopg assumes database encoding utf-8 and not the actual encoding.
        # Not sure whether it's bug or feature in psycopg for python3.
        if sys.version_info >= (3,):
            def return_as_unicode(value, cursor):
                if value is None:
                    return None
                # Treat value as byte sequence of database encoding and then
                # decode it as utf-8 to get correct unicode value.
                return bytes(
                    value, encodings[cursor.connection.encoding]
                ).decode('utf-8')

            unicode_type = psycopg2.extensions.new_type(
                # "char", name, text, character, character varying
                (19, 18, 25, 1042, 1043, 0),
                'UNICODE', return_as_unicode)
        else:
            def return_as_unicode(value, cursor):
                if value is None:
                    return None
                # Decode it as utf-8 to get correct unicode value.
                return value.decode('utf-8')

            unicode_type = psycopg2.extensions.new_type(
                # "char", name, text, character, character varying
                (19, 18, 25, 1042, 1043, 0),
                'UNICODE', return_as_unicode)

        unicode_array_type = psycopg2.extensions.new_array_type(
            # "char"[], name[], text[], character[], character varying[]
            (1002, 1003, 1009, 1014, 1015, 0
             ), 'UNICODEARRAY', unicode_type)

        psycopg2.extensions.register_type(unicode_type)
        psycopg2.extensions.register_type(unicode_array_type)


def register_binary_typecasters(connection):
    psycopg2.extensions.register_type(
        psycopg2.extensions.new_type(
            (
                # To cast bytea type
                17,
             ),
            'BYTEA_PLACEHOLDER',
            # Only show placeholder if data actually exists.
            lambda value, cursor: 'binary data' if value is not None else None),
        connection
    )

    psycopg2.extensions.register_type(
        psycopg2.extensions.new_type(
            (
                # To cast bytea[] type
                1001,
             ),
            'BYTEA_ARRAY_PLACEHOLDER',
            # Only show placeholder if data actually exists.
            lambda value, cursor: 'binary data[]' if value is not None else None),
        connection
    )


def register_array_to_string_typecasters(connection):
    psycopg2.extensions.register_type(
        psycopg2.extensions.new_type(
            PSYCOPG_SUPPORTED_BUILTIN_ARRAY_DATATYPES +
            PSYCOPG_SUPPORTED_JSON_ARRAY_TYPES +
            PSYCOPG_SUPPORTED_IPADDRESS_ARRAY_TYPES +
            PSYCOPG_SUPPORTED_RANGE_ARRAY_TYPES +
            TO_ARRAY_OF_STRING_DATATYPES,
            'ARRAY_TO_STRING',
            _STRING),
        connection
    )




