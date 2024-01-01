##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Implementation of an extended cursor, which returns ordered dictionary when
fetching results from it, and also takes care of the duplicate column name in
result.
"""

import asyncio
from collections import OrderedDict
import psycopg
from flask import g, current_app
from psycopg import Cursor as _cursor, AsyncCursor as _async_cursor
from typing import Any, Sequence
from psycopg.rows import dict_row, tuple_row
from psycopg._encodings import py_codecs as encodings
from .encoding import configure_driver_encodings

configure_driver_encodings(encodings)


class _WrapperColumn(object):
    """
    class _WrapperColumn(object)

    A wrapper class, which wraps the individual description column object,
    to allow identify the duplicate column name, created by PostgreSQL database
    server implicitly during query execution.

    Methods:
    -------
    * __init__(_col, _name)
    - Initialize the wrapper around the description column object, which will
      present the dummy name when available instead of the duplicate name.

    * __getattribute__(name)
    - Get attributes from the original column description (which is a named
      tuple) except for few of the attributes of this object (i.e. orig_col,
      dummy_name, __class__, to_dict) are part of this object.

    * __getitem__(idx)
    - Get the item from the original object except for the 0th index item,
      which is for 'name'.

    * __setitem__(idx, value)
    * __delitem__(idx)
    - Override them to make the operations on original object.

    * to_dict()
    - Converts original objects data as OrderedDict (except the name will same
      as dummy name (if available), and one more parameter as 'display_name'.
    """

    def __init__(self, _col, _name):
        """Initializer for _WrapperColumn"""
        self.orig_col = _col
        self.dummy_name = _name

    def __getattribute__(self, name):
        """Getting the attributes from the original object. (except few)"""
        if (name == 'orig_col' or name == 'dummy_name' or
                name == '__class__' or name == 'to_dict'):
            return object.__getattribute__(self, name)
        elif name == 'name':
            res = object.__getattribute__(self, 'dummy_name')
            if res is not None:
                return res
        return self.orig_col.__getattribute__(name)

    def __getitem__(self, idx):
        """Overrides __getitem__ to fetch item from original object"""
        if idx == 0 and self.dummy_name is not None:
            return self.dummy_name
        return self.orig_col.__getitem__(idx)

    def __setitem__(self, *args, **kwargs):
        """Orverrides __setitem__ to do the operations on original object."""
        return self.orig_col.__setitem__(*args, **kwargs)

    def __delitem__(self, *args, **kwargs):
        """Orverrides __delitem__ to do the operations on original object."""
        return self.orig_col.__delitem__(*args, **kwargs)

    def to_dict(self):
        """
        Generates an OrderedDict from the fields of the original objects
        with avoiding the duplicate name.
        """

        ores = OrderedDict()
        ores['name'] = self.orig_col.name
        ores['type_code'] = self.orig_col.type_code
        ores['display_size'] = self.orig_col.display_size
        ores['internal_size'] = self.orig_col.internal_size
        ores['precision'] = self.orig_col.precision
        ores['scale'] = self.orig_col.scale
        ores['null_ok'] = self.orig_col.null_ok
        ores['table_oid'] = self.orig_col.table_oid
        ores['table_column'] = self.orig_col.table_column

        name = ores['name']
        if self.dummy_name:
            ores['name'] = self.dummy_name
        ores['display_name'] = name
        return ores


class DictCursor(_cursor):
    """
    DictCursor

    A class to generate the dictionary from the tuple, and also takes care of
    the duplicate column name in result description.

    Methods:
    -------
    * __init__()
    - Initialize the cursor object

    * _dict_tuple(tuple)
    - Generate a dictionary object from a tuple, based on the column
      description.

    * _ordered_description()
    - Generates the _WrapperColumn object from the description column, and
      identifies duplicate column name
    """

    def __init__(self, *args, **kwargs):
        self._odt_desc = None
        _cursor.__init__(self, *args, row_factory=dict_row)

    def _dict_tuple(self, tup):
        """
        Transform the tuple into a dictionary object.
        """
        if self._odt_desc is None:
            self._ordered_description()
        return dict((k[0], v) for k, v in zip(self._odt_desc, tup))

    def _ordered_description(self):
        """
        Transform the regular description to wrapper object, which handles
        duplicate column name.
        """
        self._odt_desc = _cursor.__getattribute__(self, 'description')
        pgresult = _cursor.__getattribute__(self, 'pgresult')
        desc = self._odt_desc

        if desc is None or len(desc) == 0:
            return

        res = list()
        od = dict((d[0], 0) for d in desc)
        col_count = 0
        for d in desc:
            dummy = None
            idx = od[d.name]
            if idx == 0:
                od[d.name] = 1
            else:
                name = d.name
                while name in od:
                    idx += 1
                    name = ("%s-%s" % (d.name, idx))
                    od[d.name] = idx
                dummy = name
            if pgresult:
                d.table_oid = pgresult.ftable(col_count)
                d.table_column = pgresult.ftablecol(col_count)
            res.append(_WrapperColumn(d, dummy))
        self._odt_desc = tuple(res)

    def ordered_description(self):
        """
        Use this to fetch the description
        """
        if self._odt_desc is None:
            self._ordered_description()
        return self._odt_desc

    def execute(self, query, params=None):
        """
        Execute function
        """
        self._odt_desc = None
        if params is not None and len(params) == 0:
            params = None

        return _cursor.execute(self, query, params)

    def fetchone(self):
        """
        Execute function
        """
        self.row_factory = tuple_row
        res = _cursor.fetchone(self)
        self.row_factory = dict_row
        return res

    def get_rowcount(self):
        return self.pgresult.ntuples

    def close_cursor(self):
        """
        Close the cursor.
        """
        _cursor.close(self)


class AsyncDictCursor(_async_cursor):

    def __init__(self, *args, **kwargs):
        self._odt_desc = None
        _async_cursor.__init__(self, *args, row_factory=dict_row)

    def _dict_tuple(self, tup):
        """
        Transform the tuple into a dictionary object.
        """
        if self._odt_desc is None:
            self._ordered_description()
        return dict((k[0], v) for k, v in zip(self._odt_desc, tup))

    def _ordered_description(self):
        """
        Transform the regular description to wrapper object, which handles
        duplicate column name.
        """
        self._odt_desc = _async_cursor.__getattribute__(self, 'description')
        pgresult = _async_cursor.__getattribute__(self, 'pgresult')
        desc = self._odt_desc

        if desc is None or len(desc) == 0:
            return

        res = list()
        od = dict((d[0], 0) for d in desc)
        col_count = 0
        for d in desc:
            dummy = None
            idx = od[d.name]
            if idx == 0:
                od[d.name] = 1
            else:
                name = d.name
                while name in od:
                    idx += 1
                    name = ("%s-%s" % (d.name, idx))
                    od[d.name] = idx
                dummy = name
            if pgresult:
                d.table_oid = pgresult.ftable(col_count)
                d.table_column = pgresult.ftablecol(col_count)
                col_count += 1

            res.append(_WrapperColumn(d, dummy))
        self._odt_desc = tuple(res)

    def ordered_description(self):
        """
        Use this to fetch the description
        """

        # if self._odt_desc is None:
        self._ordered_description()
        return self._odt_desc

    def execute(self, query, params=None):
        """
        Execute function
        """
        try:
            return asyncio.run(self._execute(query, params))
        except RuntimeError as e:
            current_app.logger.exception(e)

    async def _execute(self, query, params=None):
        """
        Execute function
        """
        if params is not None and len(params) == 0:
            params = None

        return await _async_cursor.execute(self, query, params)

    def executemany(self, query, params=None):
        """
        Execute many function of regular cursor.
        """
        self._odt_desc = None
        return _async_cursor.executemany(self, query, params)

    async def _close_cursor(self):
        """
         Close the cursor.
        """

        await _async_cursor.close(self)

    def close_cursor(self):
        """
        Close the cursor.
        """
        asyncio.run(self._close_cursor())

    def fetchmany(self, size=None, _tupples=False):
        """
        Fetch many tuples as ordered dictionary list.
        """
        self._odt_desc = None
        self.row_factory = tuple_row
        res = asyncio.run(self._fetchmany(size))
        if not _tupples and res is not None:
            res = [self._dict_tuple(t) for t in res]

        self.row_factory = dict_row
        return res

    async def _fetchmany(self, size=None):
        """
        Fetch many tuples as ordered dictionary list.
        """
        return await _async_cursor.fetchmany(self, size)

    async def _fetchall(self):
        """
        Fetch all tuples as ordered dictionary list.
        """
        return await _async_cursor.fetchall(self)

    def fetchall(self, _tupples=False):
        """
        Fetch all tuples as ordered dictionary list.
        """
        self._odt_desc = None
        self.row_factory = tuple_row
        res = asyncio.run(self._fetchall())
        if not _tupples and res is not None:
            res = [self._dict_tuple(t) for t in res]

        self.row_factory = dict_row
        return res

    async def _fetchone(self):
        """
        Fetch all tuples as ordered dictionary list.
        """
        return await _async_cursor.fetchone(self)

    def fetchone(self):
        """
        Execute function
        """
        self.row_factory = tuple_row
        res = asyncio.run(self._fetchone())
        self.row_factory = dict_row
        return res

    async def _scrollcur(self, position, mode):
        """
        Fetch all tuples as ordered dictionary list.
        """
        return await _async_cursor.scroll(self, position, mode=mode)

    def scroll(self, position, mode="absolute"):
        """
        Fetch all tuples as ordered dictionary list.
        """
        return asyncio.run(self._scrollcur(position, mode))

    def get_rowcount(self):
        if self.pgresult:
            return self.pgresult.ntuples
        else:
            return -1
