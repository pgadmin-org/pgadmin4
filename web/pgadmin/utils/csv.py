"""
PYTHON SOFTWARE FOUNDATION LICENSE VERSION 2
--------------------------------------------

1. This LICENSE AGREEMENT is between the Python Software Foundation
("PSF"), and the Individual or Organization ("Licensee") accessing and
otherwise using this software ("Python") in source or binary form and
its associated documentation.

2. Subject to the terms and conditions of this License Agreement, PSF hereby
grants Licensee a nonexclusive, royalty-free, world-wide license to reproduce,
analyze, test, perform and/or display publicly, prepare derivative works,
distribute, and otherwise use Python alone or in any derivative version,
provided, however, that PSF's License Agreement and PSF's notice of copyright,
i.e., "Copyright (c) 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,2010
2011, 2012, 2013, 2014, 2015, 2016, 2017 Python Software Foundation; All Rights
Reserved" are retained in Python alone or in any derivative version prepared by
Licensee.

3. In the event Licensee prepares a derivative work that is based on
or incorporates Python or any part thereof, and wants to make
the derivative work available to others as provided herein, then
Licensee hereby agrees to include in any such work a brief summary of
the changes made to Python.

4. PSF is making Python available to Licensee on an "AS IS"
basis.  PSF MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR
IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, PSF MAKES NO AND
DISCLAIMS ANY REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS
FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF PYTHON WILL NOT
INFRINGE ANY THIRD PARTY RIGHTS.

5. PSF SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF PYTHON
FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR LOSS AS
A RESULT OF MODIFYING, DISTRIBUTING, OR OTHERWISE USING PYTHON,
OR ANY DERIVATIVE THEREOF, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.

6. This License Agreement will automatically terminate upon a material
breach of its terms and conditions.

7. Nothing in this License Agreement shall be deemed to create any
relationship of agency, partnership, or joint venture between PSF and
Licensee.  This License Agreement does not grant permission to use PSF
trademarks or trade name in a trademark sense to endorse or promote
products or services of Licensee, or any third party.

8. By copying, installing or otherwise using Python, Licensee
agrees to be bound by the terms and conditions of this License
Agreement.
"""

############################################################################
# Changes:
# Added new parameter in dialect 'replace_nulls_with' to compare it against
# the value to be quoted or not.
# Handle the null value if value is None or equal to
# 'replace_nulls_with' then it represents the null value, so no need to
# quote it.
############################################################################

__all__ = ["QUOTE_MINIMAL", "QUOTE_ALL", "QUOTE_NONNUMERIC", "QUOTE_NONE",
           "Error", "Dialect", "__doc__", "Excel", "ExcelTab",
           "field_size_limit", "Reader", "Writer", "register_dialect",
           "get_dialect", "list_dialects", "unregister_dialect",
           "__version__", "DictReader", "DictWriter"]

import re
import numbers
from io import StringIO
from csv import (
    QUOTE_MINIMAL, QUOTE_ALL, QUOTE_NONNUMERIC, QUOTE_NONE,
    __version__, __doc__, Error, field_size_limit,
)


class QuoteStrategy(object):
    quoting = None

    def __init__(self, dialect):
        if self.quoting is not None:
            assert dialect.quoting == self.quoting
        self.dialect = dialect
        self.setup()

        escape_pattern_quoted = r'({quotechar})'.format(
            quotechar=re.escape(self.dialect.quotechar or '"'))
        escape_pattern_unquoted = r'([{specialchars}])'.format(
            specialchars=re.escape(self.specialchars))

        self.escape_re_quoted = re.compile(escape_pattern_quoted)
        self.escape_re_unquoted = re.compile(escape_pattern_unquoted)

    def setup(self):
        """Optional method for strategy-wide optimizations."""

    def quoted(self, field=None, raw_field=None, only=None):
        """Determine whether this field should be quoted."""
        raise NotImplementedError(
            'quoted must be implemented by a subclass')

    @property
    def specialchars(self):
        """The special characters that need to be escaped."""
        raise NotImplementedError(
            'specialchars must be implemented by a subclass')

    def escape_re(self, quoted=None):
        if quoted:
            return self.escape_re_quoted
        return self.escape_re_unquoted

    def escapechar(self, quoted=None):
        if quoted and self.dialect.doublequote:
            return self.dialect.quotechar
        return self.dialect.escapechar

    def prepare(self, raw_field, only=None):
        field = str(raw_field if raw_field is not None else '')
        quoted = self.quoted(field=field, raw_field=raw_field, only=only)

        escape_re = self.escape_re(quoted=quoted)
        escapechar = self.escapechar(quoted=quoted)

        if escape_re.search(field):
            escapechar = '\\\\' if escapechar == '\\' else escapechar
            if escapechar:
                escape_replace = \
                    r'{escapechar}\1'.format(escapechar=escapechar)
                field = escape_re.sub(escape_replace, field)

        if quoted:
            field = '{quotechar}{field}{quotechar}'.format(
                quotechar=self.dialect.quotechar, field=field)

        return field


class QuoteMinimalStrategy(QuoteStrategy):
    quoting = QUOTE_MINIMAL

    def setup(self):
        self.quoted_re = re.compile(r'[{specialchars}]'.format(
            specialchars=re.escape(self.specialchars)))

    @property
    def specialchars(self):
        return (
            self.dialect.lineterminator +
            self.dialect.quotechar +
            self.dialect.delimiter +
            (self.dialect.escapechar or '')
        )

    def quoted(self, field, only, **kwargs):
        if field == self.dialect.quotechar and not self.dialect.doublequote:
            # If the only character in the field is the quotechar, and
            # doublequote is false, then just escape without outer quotes.
            return False
        return field == '' and only or bool(self.quoted_re.search(field))


class QuoteAllStrategy(QuoteStrategy):
    quoting = QUOTE_ALL

    @property
    def specialchars(self):
        return self.dialect.quotechar

    def quoted(self, raw_field, **kwargs):
        # Handle the null value if raw_field is None or equal to
        # replace_nulls_with then it represents the null value, so no need to
        # quote it.
        if raw_field is None or raw_field == self.dialect.replace_nulls_with:
            return False
        return True


class QuoteNonnumericStrategy(QuoteStrategy):
    quoting = QUOTE_NONNUMERIC

    @property
    def specialchars(self):
        return (
            self.dialect.lineterminator +
            self.dialect.quotechar +
            self.dialect.delimiter +
            (self.dialect.escapechar or '')
        )

    def quoted(self, raw_field, **kwargs):
        # Handle the null value if raw_field is None or equal to
        # replace_nulls_with then it represents the null value, so no need to
        # quote it.
        if raw_field is None or raw_field == self.dialect.replace_nulls_with:
            return False
        return not isinstance(raw_field, numbers.Number)


class QuoteNoneStrategy(QuoteStrategy):
    quoting = QUOTE_NONE

    @property
    def specialchars(self):
        return (
            self.dialect.lineterminator +
            (self.dialect.quotechar or '') +
            self.dialect.delimiter +
            (self.dialect.escapechar or '')
        )

    def quoted(self, field, only, **kwargs):
        if field == '' and only:
            raise Error('single empty field record must be quoted')
        return False


class Writer(object):
    def __init__(self, fileobj, dialect='excel', **fmtparams):
        if fileobj is None:
            raise TypeError('fileobj must be file-like, not None')

        self.fileobj = fileobj

        if isinstance(dialect, str):
            dialect = get_dialect(dialect)

        try:
            self.dialect = Dialect.combine(dialect, fmtparams)
        except Error as e:
            raise TypeError(*e.args)

        strategies = {
            QUOTE_MINIMAL: QuoteMinimalStrategy,
            QUOTE_ALL: QuoteAllStrategy,
            QUOTE_NONNUMERIC: QuoteNonnumericStrategy,
            QUOTE_NONE: QuoteNoneStrategy,
        }
        self.strategy = strategies[self.dialect.quoting](self.dialect)

    def writerow(self, row):
        if row is None:
            raise Error('row must be an iterable')

        row = list(row)
        only = len(row) == 1
        row = [self.strategy.prepare(field, only=only) for field in row]

        line = self.dialect.delimiter.join(row) + self.dialect.lineterminator
        return self.fileobj.write(line)

    def writerows(self, rows):
        for row in rows:
            self.writerow(row)


START_RECORD = 0
START_FIELD = 1
ESCAPED_CHAR = 2
IN_FIELD = 3
IN_QUOTED_FIELD = 4
ESCAPE_IN_QUOTED_FIELD = 5
QUOTE_IN_QUOTED_FIELD = 6
EAT_CRNL = 7
AFTER_ESCAPED_CRNL = 8


class Reader(object):
    def __init__(self, fileobj, dialect='excel', **fmtparams):
        self.input_iter = iter(fileobj)

        if isinstance(dialect, str):
            dialect = get_dialect(dialect)

        try:
            self.dialect = Dialect.combine(dialect, fmtparams)
        except Error as e:
            raise TypeError(*e.args)

        self.fields = None
        self.field = None
        self.line_num = 0

    def parse_reset(self):
        self.fields = []
        self.field = []
        self.state = START_RECORD
        self.numeric_field = False

    def parse_save_field(self):
        field = ''.join(self.field)
        self.field = []
        if self.numeric_field:
            field = float(field)
            self.numeric_field = False
        self.fields.append(field)

    def parse_add_char(self, c):
        if len(self.field) >= field_size_limit():
            raise Error('field size limit exceeded')
        self.field.append(c)

    def parse_process_char(self, c):
        switch = {
            START_RECORD: self._parse_start_record,
            START_FIELD: self._parse_start_field,
            ESCAPED_CHAR: self._parse_escaped_char,
            AFTER_ESCAPED_CRNL: self._parse_after_escaped_crnl,
            IN_FIELD: self._parse_in_field,
            IN_QUOTED_FIELD: self._parse_in_quoted_field,
            ESCAPE_IN_QUOTED_FIELD: self._parse_escape_in_quoted_field,
            QUOTE_IN_QUOTED_FIELD: self._parse_quote_in_quoted_field,
            EAT_CRNL: self._parse_eat_crnl,
        }
        return switch[self.state](c)

    def _parse_start_record(self, c):
        if c == '\0':
            return
        elif c == '\n' or c == '\r':
            self.state = EAT_CRNL
            return

        self.state = START_FIELD
        return self._parse_start_field(c)

    def _parse_start_field(self, c):
        if c == '\n' or c == '\r' or c == '\0':
            self.parse_save_field()
            self.state = START_RECORD if c == '\0' else EAT_CRNL
        elif (c == self.dialect.quotechar and
              self.dialect.quoting != QUOTE_NONE):
            self.state = IN_QUOTED_FIELD
        elif c == self.dialect.escapechar:
            self.state = ESCAPED_CHAR
        elif c == ' ' and self.dialect.skipinitialspace:
            pass  # Ignore space at start of field
        elif c == self.dialect.delimiter:
            # Save empty field
            self.parse_save_field()
        else:
            # Begin new unquoted field
            if self.dialect.quoting == QUOTE_NONNUMERIC:
                self.numeric_field = True
            self.parse_add_char(c)
            self.state = IN_FIELD

    def _parse_escaped_char(self, c):
        if c == '\n' or c == '\r':
            self.parse_add_char(c)
            self.state = AFTER_ESCAPED_CRNL
            return
        if c == '\0':
            c = '\n'
        self.parse_add_char(c)
        self.state = IN_FIELD

    def _parse_after_escaped_crnl(self, c):
        if c == '\0':
            return
        return self._parse_in_field(c)

    def _parse_in_field(self, c):
        # In unquoted field
        if c == '\n' or c == '\r' or c == '\0':
            # End of line - return [fields]
            self.parse_save_field()
            self.state = START_RECORD if c == '\0' else EAT_CRNL
        elif c == self.dialect.escapechar:
            self.state = ESCAPED_CHAR
        elif c == self.dialect.delimiter:
            self.parse_save_field()
            self.state = START_FIELD
        else:
            # Normal character - save in field
            self.parse_add_char(c)

    def _parse_in_quoted_field(self, c):
        if c != '\0' and c == self.dialect.escapechar:
            self.state = ESCAPE_IN_QUOTED_FIELD
        elif c != '\0' and (c == self.dialect.quotechar and
                            self.dialect.quoting != QUOTE_NONE):
            if self.dialect.doublequote:
                self.state = QUOTE_IN_QUOTED_FIELD
            else:
                self.state = IN_FIELD
        elif c != '\0':
            self.parse_add_char(c)

    def _parse_escape_in_quoted_field(self, c):
        if c == '\0':
            c = '\n'

        self.parse_add_char(c)
        self.state = IN_QUOTED_FIELD

    def _parse_quote_in_quoted_field(self, c):
        if (self.dialect.quoting != QUOTE_NONE and
                c == self.dialect.quotechar):
            # save "" as "
            self.parse_add_char(c)
            self.state = IN_QUOTED_FIELD
        elif c == self.dialect.delimiter:
            self.parse_save_field()
            self.state = START_FIELD
        elif c == '\n' or c == '\r' or c == '\0':
            # End of line = return [fields]
            self.parse_save_field()
            self.state = START_RECORD if c == '\0' else EAT_CRNL
        elif not self.dialect.strict:
            self.parse_add_char(c)
            self.state = IN_FIELD
        else:
            # illegal
            raise Error("{delimiter}' expected after '{quotechar}".format(
                delimiter=self.dialect.delimiter,
                quotechar=self.dialect.quotechar,
            ))

    def _parse_eat_crnl(self, c):
        if c != '\n' and c != '\r' and c == '\0':
            self.state = START_RECORD
        elif c != '\n' and c != '\r':
            raise Error('new-line character seen in unquoted field - do you '
                        'need to open the file in universal-newline mode?')

    def __iter__(self):
        return self

    def __next__(self):
        self.parse_reset()

        while True:
            try:
                lineobj = next(self.input_iter)
            except StopIteration:
                if len(self.field) != 0 or self.state == IN_QUOTED_FIELD:
                    if self.dialect.strict:
                        raise Error('unexpected end of data')
                    self.parse_save_field()
                if self.fields:
                    break
                raise

            if not isinstance(lineobj, str):
                typ = type(lineobj)
                typ_name = 'bytes' if typ == bytes else typ.__name__
                err_str = ('iterator should return strings, not {0}'
                           ' (did you open the file in text mode?)')
                raise Error(err_str.format(typ_name))

            self.line_num += 1
            for c in lineobj:
                if c == '\0':
                    raise Error('line contains NULL byte')
                self.parse_process_char(c)

            self.parse_process_char('\0')

            if self.state == START_RECORD:
                break

        fields = self.fields
        self.fields = None
        return fields

    next = __next__


_dialect_registry = {}


def register_dialect(name, dialect='excel', **fmtparams):
    if not isinstance(name, str):
        raise TypeError('"name" must be a string')

    dialect = Dialect.extend(dialect, fmtparams)

    try:
        Dialect.validate(dialect)
    except Exception:
        raise TypeError('dialect is invalid')

    assert name not in _dialect_registry
    _dialect_registry[name] = dialect


def unregister_dialect(name):
    try:
        _dialect_registry.pop(name)
    except KeyError:
        raise Error('"{name}" not a registered dialect'.format(name=name))


def get_dialect(name):
    try:
        return _dialect_registry[name]
    except KeyError:
        raise Error('Could not find dialect {0}'.format(name))


def list_dialects():
    return list(_dialect_registry)


class Dialect(object):
    """Describe a CSV dialect.
    This must be subclassed (see csv.excel).  Valid attributes are:
    delimiter, quotechar, escapechar, doublequote, skipinitialspace,
    lineterminator, quoting, strict.
    """
    _name = ""
    _valid = False
    # placeholders
    delimiter = None
    quotechar = None
    escapechar = None
    doublequote = None
    skipinitialspace = None
    lineterminator = None
    quoting = None
    strict = None

    def __init__(self):
        self.validate(self)
        if self.__class__ != Dialect:
            self._valid = True

    @classmethod
    def validate(cls, dialect):
        dialect = cls.extend(dialect)

        if not isinstance(dialect.quoting, int):
            raise Error('"quoting" must be an integer')

        if dialect.delimiter is None:
            raise Error('delimiter must be set')
        cls.validate_text(dialect, 'delimiter')

        if dialect.lineterminator is None:
            raise Error('lineterminator must be set')
        if not isinstance(dialect.lineterminator, str):
            raise Error('"lineterminator" must be a string')

        if dialect.quoting not in [
                QUOTE_NONE, QUOTE_MINIMAL, QUOTE_NONNUMERIC, QUOTE_ALL]:
            raise Error('Invalid quoting specified')

        if dialect.quoting != QUOTE_NONE:
            if dialect.quotechar is None and dialect.escapechar is None:
                raise Error('quotechar must be set if quoting enabled')
            if dialect.quotechar is not None:
                cls.validate_text(dialect, 'quotechar')

    @staticmethod
    def validate_text(dialect, attr):
        val = getattr(dialect, attr)
        if not isinstance(val, str):
            if type(val) == bytes:
                raise Error('"{0}" must be string, not bytes'.format(attr))
            raise Error('"{0}" must be string, not {1}'.format(
                attr, type(val).__name__))

        if len(val) != 1:
            raise Error('"{0}" must be a 1-character string'.format(attr))

    @staticmethod
    def defaults():
        return {
            'delimiter': ',',
            'doublequote': True,
            'escapechar': None,
            'lineterminator': '\r\n',
            'quotechar': '"',
            'quoting': QUOTE_MINIMAL,
            'skipinitialspace': False,
            'strict': False,
            'replace_nulls_with': None
        }

    @classmethod
    def extend(cls, dialect, fmtparams=None):
        if isinstance(dialect, str):
            dialect = get_dialect(dialect)

        if fmtparams is None:
            return dialect

        defaults = cls.defaults()

        if any(param not in defaults for param in fmtparams):
            raise TypeError('Invalid fmtparam')

        specified = dict(
            (attr, getattr(dialect, attr, None))
            for attr in cls.defaults()
        )

        specified.update(fmtparams)
        return type(str('ExtendedDialect'), (cls,), specified)

    @classmethod
    def combine(cls, dialect, fmtparams):
        """Create a new dialect with defaults and added parameters."""
        dialect = cls.extend(dialect, fmtparams)
        defaults = cls.defaults()
        specified = dict(
            (attr, getattr(dialect, attr, None))
            for attr in defaults
            if getattr(dialect, attr, None) is not None or
            attr in ['quotechar', 'delimiter', 'lineterminator', 'quoting']
        )

        defaults.update(specified)
        dialect = type(str('CombinedDialect'), (cls,), defaults)
        cls.validate(dialect)
        return dialect()

    def __delattr__(self, attr):
        if self._valid:
            raise AttributeError('dialect is immutable.')
        super(Dialect, self).__delattr__(attr)

    def __setattr__(self, attr, value):
        if self._valid:
            raise AttributeError('dialect is immutable.')
        super(Dialect, self).__setattr__(attr, value)


class Excel(Dialect):
    """Describe the usual properties of Excel-generated CSV files."""
    delimiter = ','
    quotechar = '"'
    doublequote = True
    skipinitialspace = False
    lineterminator = '\r\n'
    quoting = QUOTE_MINIMAL


register_dialect("excel", Excel)


class ExcelTab(Excel):
    """Describe the usual properties of Excel-generated TAB-delimited files."""
    delimiter = '\t'


register_dialect("excel-tab", ExcelTab)


class UnixDialect(Dialect):
    """Describe the usual properties of Unix-generated CSV files."""
    delimiter = ','
    quotechar = '"'
    doublequote = True
    skipinitialspace = False
    lineterminator = '\n'
    quoting = QUOTE_ALL


register_dialect("unix", UnixDialect)


class DictReader(object):
    def __init__(self, f, fieldnames=None, restkey=None, restval=None,
                 *args, **kwds):
        self._fieldnames = fieldnames   # list of keys for the dict
        self.restkey = restkey          # key to catch long rows
        self.restval = restval          # default value for short rows
        self.dialect = kwds.get('dialect', "excel")
        self.reader = Reader(f, self.dialect, *args, **kwds)
        self.line_num = 0

    def __iter__(self):
        return self

    @property
    def fieldnames(self):
        if self._fieldnames is None:
            try:
                self._fieldnames = next(self.reader)
            except StopIteration:
                pass
        self.line_num = self.reader.line_num
        return self._fieldnames

    @fieldnames.setter
    def fieldnames(self, value):
        self._fieldnames = value

    def __next__(self):
        if self.line_num == 0:
            # Used only for its side effect.
            self.fieldnames
        row = next(self.reader)
        self.line_num = self.reader.line_num

        # unlike the basic reader, we prefer not to return blanks,
        # because we will typically wind up with a dict full of None
        # values
        while row == []:
            row = next(self.reader)
        d = dict(zip(self.fieldnames, row))
        lf = len(self.fieldnames)
        lr = len(row)
        if lf < lr:
            d[self.restkey] = row[lf:]
        elif lf > lr:
            for key in self.fieldnames[lr:]:
                d[key] = self.restval
        return d

    next = __next__


class DictWriter(object):
    def __init__(self, f, fieldnames, *args, **kwds):
        self.fieldnames = fieldnames    # list of keys for the dict
        self.extrasaction = kwds.get('extrasaction', "raise")
        self.restval = kwds.get('restval', "")  # for writing short dicts
        if self.extrasaction.lower() not in ("raise", "ignore"):
            raise ValueError("extrasaction (%s) must be 'raise' or 'ignore'"
                             % self.extrasaction)
        dialect = kwds.get('dialect', "excel")
        self.writer = Writer(f, dialect, *args, **kwds)

    def writeheader(self):
        header = dict(zip(self.fieldnames, self.fieldnames))
        self.writerow(header)

    def _dict_to_list(self, rowdict):
        if self.extrasaction == "raise":
            wrong_fields = [k for k in rowdict if k not in self.fieldnames]
            if wrong_fields:
                raise ValueError("dict contains fields not in fieldnames: " +
                                 ", ".join([repr(x) for x in wrong_fields]))
        return (rowdict.get(key, self.restval) for key in self.fieldnames)

    def writerow(self, rowdict):
        return self.writer.writerow(self._dict_to_list(rowdict))

    def writerows(self, rowdicts):
        return self.writer.writerows(map(self._dict_to_list, rowdicts))
