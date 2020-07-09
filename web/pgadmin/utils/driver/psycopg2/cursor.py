##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Implementation of an extended cursor, which returns ordered dictionary when
fetching results from it, and also takes care of the duplicate column name in
result.
"""


from collections import OrderedDict
import psycopg2
from psycopg2.extensions import cursor as _cursor, encodings
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

        # In psycopg2 2.8, the description of one result column,
        # exposed as items of the cursor.description sequence.
        # Before psycopg2 2.8 the description attribute was a sequence
        # of simple tuples or namedtuples.
        if psycopg2.__version__.find('2.8') != -1:
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
        else:
            ores = OrderedDict(self.orig_col._asdict())

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
        """
        Initialize the cursor object.
        """
        self._odt_desc = None
        _cursor.__init__(self, *args, **kwargs)

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
        desc = self._odt_desc

        if desc is None or len(desc) == 0:
            return

        res = list()
        od = dict((d[0], 0) for d in desc)
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

    def executemany(self, query, params=None):
        """
        Execute many function of regular cursor.
        """
        self._odt_desc = None
        return _cursor.executemany(self, query, params)

    def callproc(self, proname, params=None):
        """
        Call a procedure by a name.
        """
        self._odt_desc = None
        return _cursor.callproc(self, proname, params)

    def fetchmany(self, size=None):
        """
        Fetch many tuples as ordered dictionary list.
        """
        tuples = _cursor.fetchmany(self, size)
        if tuples is not None:
            return [self._dict_tuple(t) for t in tuples]
        return None

    def fetchall(self):
        """
        Fetch all tuples as ordered dictionary list.
        """
        tuples = _cursor.fetchall(self)
        if tuples is not None:
            return [self._dict_tuple(t) for t in tuples]

    def __iter__(self):
        it = _cursor.__iter__(self)
        try:
            yield self._dict_tuple(next(it))
            while 1:
                yield self._dict_tuple(next(it))
        except StopIteration:
            pass
