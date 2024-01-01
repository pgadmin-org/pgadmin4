##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Typecast various data types so that they can be compatible with Javascript
data types.
"""
import psycopg
from psycopg.types.string import TextLoader
from psycopg.types.json import JsonDumper, _JsonDumper, _JsonLoader
from psycopg._encodings import py_codecs as encodings
from .encoding import get_encoding, configure_driver_encodings
from psycopg.types.net import InetLoader
from psycopg.adapt import Loader
from ipaddress import ip_address, ip_interface
from psycopg._encodings import py_codecs as encodings

configure_driver_encodings(encodings)

# OIDs of data types which need to typecast as string to avoid JavaScript
# compatibility issues.
# e.g JavaScript does not support 64 bit integers. It has 64-bit double
# giving only 53 bits of integer range (IEEE 754)
# So to avoid loss of remaining 11 bits (64-53) we need to typecast bigint to
# string.

TO_STRING_DATATYPES = (
    # To cast bytea, interval type
    17, 1186,

    # date, timestamp, timestamp with zone, time without time zone
    1082, 1114, 1184, 1083
)

TO_STRING_NUMERIC_DATATYPES = (
    # Real, double precision, numeric, bigint
    700, 701, 1700, 20
)

# OIDs of array data types which need to typecast to array of string.
# This list may contain:
# OIDs of data types from PSYCOPG_SUPPORTED_ARRAY_DATATYPES as they need to be
# typecast to array of string.
# Also OIDs of data types which psycopg does not typecast array of that
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

# OIDs of builtin array datatypes supported by psycopg
# OID reference psycopg/psycopg/typecast_builtins.c
#
# For these array data types psycopg returns result in list.
# For all other array data types psycopg returns result as string (string
# representing array literal)
# e.g:
#
# For below two sql psycopg returns result in different formats.
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
    1002, 1003, 1009, 1014, 1015, 1014, 1015,
    1000, 1115, 1185, 1183, 1270, 1182, 1187,
    1001, 1028, 1013, 1041, 651, 1040
)

# json, jsonb
# OID reference psycopg/lib/_json.py
PSYCOPG_SUPPORTED_JSON_TYPES = (114, 3802)

# json[], jsonb[]
PSYCOPG_SUPPORTED_JSON_ARRAY_TYPES = (199, 3807)

ALL_JSON_TYPES = PSYCOPG_SUPPORTED_JSON_TYPES +\
    PSYCOPG_SUPPORTED_JSON_ARRAY_TYPES

# INET[], CIDR[]
# OID reference psycopg/lib/_ipaddress.py
PSYCOPG_SUPPORTED_IPADDRESS_ARRAY_TYPES = (1041, 651)

# uuid[], uuid
# OID reference psycopg/lib/extras.py
PSYCOPG_SUPPORTED_IPADDRESS_ARRAY_TYPES = (2951, 2950)

# int4range, int8range, numrange, daterange tsrange, tstzrange
# OID reference psycopg/lib/_range.py
PSYCOPG_SUPPORTED_RANGE_TYPES = (3904, 3926, 3906, 3912, 3908, 3910)

# int4multirange, int8multirange, nummultirange, datemultirange tsmultirange,
# tstzmultirange[]
PSYCOPG_SUPPORTED_MULTIRANGE_TYPES = (4535, 4451, 4536, 4532, 4533, 4534)

# int4range[], int8range[], numrange[], daterange[] tsrange[], tstzrange[]
# OID reference psycopg/lib/_range.py
PSYCOPG_SUPPORTED_RANGE_ARRAY_TYPES = (3905, 3927, 3907, 3913, 3909, 3911)

# int4multirange[], int8multirange[], nummultirange[],
# datemultirange[] tsmultirange[], tstzmultirange[]
PSYCOPG_SUPPORTED_MULTIRANGE_ARRAY_TYPES = (6155, 6150, 6157, 6151, 6152, 6153)


def register_global_typecasters():
    # This registers a unicode type caster for datatype 'RECORD'.
    psycopg.adapters.register_loader(
        2249, TextLoaderpgAdmin)
    # This registers a unicode type caster for datatype 'RECORD_ARRAY'.
    psycopg.adapters.register_loader(
        2287, TextLoaderpgAdmin)

    for typ in TO_STRING_DATATYPES + TO_STRING_NUMERIC_DATATYPES +\
            PSYCOPG_SUPPORTED_RANGE_TYPES + PSYCOPG_SUPPORTED_MULTIRANGE_TYPES:
        psycopg.adapters.register_loader(typ,
                                         TextLoaderpgAdmin)

    # Define type caster to convert pg array types of above types into
    # array of string type
    for typ in TO_ARRAY_OF_STRING_DATATYPES:
        psycopg.adapters.register_loader(typ, TextLoaderpgAdmin)

    psycopg.adapters.register_loader("json",
                                     TextLoaderpgAdmin)
    psycopg.adapters.register_loader("jsonb",
                                     TextLoaderpgAdmin)

    # psycopg.types.json.set_json_loads(loads=lambda x: x)

    class JsonDumperpgAdmin(_JsonDumper):

        def dump(self, obj):
            return self.dumps(obj).encode()

    psycopg.adapters.register_dumper(dict, JsonDumperpgAdmin)


def register_string_typecasters(connection):
    # raw_unicode_escape used for SQL ASCII will escape the
    # characters. Here we unescape them using unicode_escape
    # and send ahead. When insert update is done, the characters
    # are escaped again and sent to the DB.
    for typ in (19, 18, 25, 1042, 1043, 0):
        if connection:
            connection.adapters.register_loader(typ, TextLoaderpgAdmin)


def register_binary_typecasters(connection):
    # The new classes can be registered globally, on a connection, on a cursor

    connection.adapters.register_loader(17,
                                        pgAdminByteaLoader)

    connection.adapters.register_loader(1001,
                                        pgAdminByteaLoader)


def register_array_to_string_typecasters(connection=None):
    type_array = PSYCOPG_SUPPORTED_BUILTIN_ARRAY_DATATYPES +\
        PSYCOPG_SUPPORTED_JSON_ARRAY_TYPES +\
        PSYCOPG_SUPPORTED_IPADDRESS_ARRAY_TYPES +\
        PSYCOPG_SUPPORTED_RANGE_ARRAY_TYPES + \
        PSYCOPG_SUPPORTED_MULTIRANGE_ARRAY_TYPES + \
        TO_ARRAY_OF_STRING_DATATYPES

    for typ in type_array:
        if connection:
            connection.adapters.register_loader(typ,
                                                TextLoaderpgAdmin)


class pgAdminInetLoader(InetLoader):
    def load(self, data):
        if isinstance(data, memoryview):
            data = bytes(data)

        if b"/" in data:
            return str(ip_interface(data.decode()))
        else:
            return str(ip_address(data.decode()))


# The new classes can be registered globally, on a connection, on a cursor
psycopg.adapters.register_loader("inet", pgAdminInetLoader)
psycopg.adapters.register_loader("cidr", pgAdminInetLoader)


class pgAdminByteaLoader(Loader):
    def load(self, data):
        return 'binary data' if data is not None else None


class TextLoaderpgAdmin(TextLoader):
    def load(self, data):
        postgres_encoding, python_encoding = get_encoding(
            self.connection.info.encoding)
        if postgres_encoding not in ['SQLASCII', 'SQL_ASCII']:
            # In case of errors while decoding data, instead of raising error
            # replace errors with empty space.
            # Error - utf-8 code'c can not decode byte 0x7f:
            # invalid continuation byte
            if isinstance(data, memoryview):
                return bytes(data).decode(self._encoding, errors='replace')
            else:
                return data.decode(self._encoding, errors='replace')
        else:
            # SQL_ASCII Database
            try:
                if isinstance(data, memoryview):
                    return bytes(data).decode(python_encoding)
                return data.decode(python_encoding)
            except Exception:
                if isinstance(data, memoryview):
                    return bytes(data).decode('UTF-8')
                return data.decode('UTF-8')
            else:
                if isinstance(data, memoryview):
                    return bytes(data).decode('ascii', errors='replace')
                return data.decode('ascii', errors='replace')
