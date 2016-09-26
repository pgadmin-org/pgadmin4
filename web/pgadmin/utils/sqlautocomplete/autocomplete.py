##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the sql auto complete feature."""

import itertools
import operator
import re
import sys
from collections import namedtuple

import sqlparse
from flask import render_template
from pgadmin.utils.driver import get_driver
from sqlparse.sql import Comparison, Identifier, Where

from config import PG_DEFAULT_DRIVER
from .completion import Completion
from .function_metadata import FunctionMetadata
from .parseutils import (
    last_word, extract_tables, find_prev_keyword, parse_partial_identifier)
from .prioritization import PrevalenceCounter

PY2 = sys.version_info[0] == 2
PY3 = sys.version_info[0] == 3

if PY3:
    string_types = str
else:
    string_types = basestring

Database = namedtuple('Database', [])
Schema = namedtuple('Schema', [])
Table = namedtuple('Table', ['schema'])

Function = namedtuple('Function', ['schema', 'filter'])
# For convenience, don't require the `filter` argument in Function constructor
Function.__new__.__defaults__ = (None, None)

Column = namedtuple('Column', ['tables', 'drop_unique'])
Column.__new__.__defaults__ = (None, None)

View = namedtuple('View', ['schema'])
Keyword = namedtuple('Keyword', [])
Datatype = namedtuple('Datatype', ['schema'])
Alias = namedtuple('Alias', ['aliases'])
Match = namedtuple('Match', ['completion', 'priority'])

try:
    from collections import Counter
except ImportError:
    # python 2.6
    from .counter import Counter

# Regex for finding "words" in documents.
_FIND_WORD_RE = re.compile(r'([a-zA-Z0-9_]+|[^a-zA-Z0-9_\s]+)')
_FIND_BIG_WORD_RE = re.compile(r'([^\s]+)')


class SQLAutoComplete(object):
    """
    class SQLAutoComplete

        This class is used to provide the postgresql's autocomplete feature.
        This class used sqlparse to parse the given sql and psycopg2 to make
        the connection and get the tables, schemas, functions etc. based on
        the query.
    """

    def __init__(self, **kwargs):
        """
        This method is used to initialize the class.

        Args:
            **kwargs : N number of parameters
        """

        self.sid = kwargs['sid'] if 'sid' in kwargs else None
        self.did = kwargs['did'] if 'did' in kwargs else None
        self.conn = kwargs['conn'] if 'conn' in kwargs else None
        self.keywords = []

        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(self.sid)

        ver = manager.version
        # we will set template path for sql scripts
        if ver >= 90100:
            self.sql_path = 'sqlautocomplete/sql/9.1_plus'

        self.search_path = []
        # Fetch the search path
        if self.conn.connected():
            query = render_template("/".join([self.sql_path, 'schema.sql']), search_path=True)
            status, res = self.conn.execute_dict(query)
            if status:
                for record in res['rows']:
                    self.search_path.append(record['schema'])

            # Fetch the keywords
            query = render_template("/".join([self.sql_path, 'keywords.sql']))
            status, res = self.conn.execute_dict(query)
            if status:
                for record in res['rows']:
                    self.keywords.append(record['word'])

        self.text_before_cursor = None
        self.prioritizer = PrevalenceCounter(self.keywords)

        self.reserved_words = set()
        for x in self.keywords:
            self.reserved_words.update(x.split())
        self.name_pattern = re.compile("^[_a-z][_a-z0-9\$]*$")

    def escape_name(self, name):
        if name and ((not self.name_pattern.match(name)) or
                         (name.upper() in self.reserved_words)):
            name = '"%s"' % name

        return name

    def unescape_name(self, name):
        if name and name[0] == '"' and name[-1] == '"':
            name = name[1:-1]

        return name

    def escaped_names(self, names):
        return [self.escape_name(name) for name in names]

    def find_matches(self, text, collection, mode='fuzzy',
                     meta=None, meta_collection=None):
        """
        Find completion matches for the given text.

        Given the user's input text and a collection of available
        completions, find completions matching the last word of the
        text.

        `mode` can be either 'fuzzy', or 'strict'
            'fuzzy': fuzzy matching, ties broken by name prevalance
            `keyword`: start only matching, ties broken by keyword prevalance

        yields prompt_toolkit Completion instances for any matches found
        in the collection of available completions.

        Args:
            text:
            collection:
            mode:
            meta:
            meta_collection:
        """

        text = last_word(text, include='most_punctuations').lower()
        text_len = len(text)

        if text and text[0] == '"':
            # text starts with double quote; user is manually escaping a name
            # Match on everything that follows the double-quote. Note that
            # text_len is calculated before removing the quote, so the
            # Completion.position value is correct
            text = text[1:]

        if mode == 'fuzzy':
            fuzzy = True
            priority_func = self.prioritizer.name_count
        else:
            fuzzy = False
            priority_func = self.prioritizer.keyword_count

        # Construct a `_match` function for either fuzzy or non-fuzzy matching
        # The match function returns a 2-tuple used for sorting the matches,
        # or None if the item doesn't match
        # Note: higher priority values mean more important, so use negative
        # signs to flip the direction of the tuple
        if fuzzy:
            regex = '.*?'.join(map(re.escape, text))
            pat = re.compile('(%s)' % regex)

            def _match(item):
                r = pat.search(self.unescape_name(item.lower()))
                if r:
                    return -len(r.group()), -r.start()
        else:
            match_end_limit = len(text)

            def _match(item):
                match_point = item.lower().find(text, 0, match_end_limit)
                if match_point >= 0:
                    # Use negative infinity to force keywords to sort after all
                    # fuzzy matches
                    return -float('Infinity'), -match_point

        if meta_collection:
            # Each possible completion in the collection has a corresponding
            # meta-display string
            collection = zip(collection, meta_collection)
        else:
            # All completions have an identical meta
            collection = zip(collection, itertools.repeat(meta))

        matches = []

        for item, meta in collection:
            sort_key = _match(item)
            if sort_key:
                if meta and len(meta) > 50:
                    # Truncate meta-text to 50 characters, if necessary
                    meta = meta[:47] + u'...'

                # Lexical order of items in the collection, used for
                # tiebreaking items with the same match group length and start
                # position. Since we use *higher* priority to mean "more
                # important," we use -ord(c) to prioritize "aa" > "ab" and end
                # with 1 to prioritize shorter strings (ie "user" > "users").
                # We also use the unescape_name to make sure quoted names have
                # the same priority as unquoted names.
                lexical_priority = tuple(-ord(c) for c in self.unescape_name(item)) + (1,)

                priority = sort_key, priority_func(item), lexical_priority

                matches.append(Match(
                    completion=Completion(item, -text_len, display_meta=meta),
                    priority=priority))

        return matches

    def get_completions(self, text, text_before_cursor):
        self.text_before_cursor = text_before_cursor

        word_before_cursor = self.get_word_before_cursor(word=True)
        matches = []
        suggestions = self.suggest_type(text, text_before_cursor)

        for suggestion in suggestions:
            suggestion_type = type(suggestion)

            # Map suggestion type to method
            # e.g. 'table' -> self.get_table_matches
            matcher = self.suggestion_matchers[suggestion_type]
            matches.extend(matcher(self, suggestion, word_before_cursor))

        # Sort matches so highest priorities are first
        matches = sorted(matches, key=operator.attrgetter('priority'),
                         reverse=True)

        result = dict()
        for m in matches:
            result[m.completion.display] = {'object_type': m.completion.display_meta}

        return result

    def get_column_matches(self, suggestion, word_before_cursor):
        tables = suggestion.tables
        scoped_cols = self.populate_scoped_cols(tables)

        if suggestion.drop_unique:
            # drop_unique is used for 'tb11 JOIN tbl2 USING (...' which should
            # suggest only columns that appear in more than one table
            scoped_cols = [col for (col, count)
                           in Counter(scoped_cols).items()
                           if count > 1 and col != '*']

        return self.find_matches(word_before_cursor, scoped_cols, mode='strict', meta='column')

    def get_function_matches(self, suggestion, word_before_cursor):
        if suggestion.filter == 'is_set_returning':
            # Only suggest set-returning functions
            funcs = self.populate_functions(suggestion.schema)
        else:
            funcs = self.populate_schema_objects(suggestion.schema, 'functions')

        # Function overloading means we way have multiple functions of the same
        # name at this point, so keep unique names only
        funcs = set(funcs)

        funcs = self.find_matches(word_before_cursor, funcs, mode='strict', meta='function')

        return funcs

    def get_schema_matches(self, _, word_before_cursor):
        schema_names = []

        query = render_template("/".join([self.sql_path, 'schema.sql']))
        status, res = self.conn.execute_dict(query)
        if status:
            for record in res['rows']:
                schema_names.append(record['schema'])

        # Unless we're sure the user really wants them, hide schema names
        # starting with pg_, which are mostly temporary schemas
        if not word_before_cursor.startswith('pg_'):
            schema_names = [s for s in schema_names if not s.startswith('pg_')]

        return self.find_matches(word_before_cursor, schema_names, mode='strict', meta='schema')

    def get_table_matches(self, suggestion, word_before_cursor):
        tables = self.populate_schema_objects(suggestion.schema, 'tables')

        # Unless we're sure the user really wants them, don't suggest the
        # pg_catalog tables that are implicitly on the search path
        if not suggestion.schema and (
                not word_before_cursor.startswith('pg_')):
            tables = [t for t in tables if not t.startswith('pg_')]

        return self.find_matches(word_before_cursor, tables, mode='strict', meta='table')

    def get_view_matches(self, suggestion, word_before_cursor):
        views = self.populate_schema_objects(suggestion.schema, 'views')

        if not suggestion.schema and (
                not word_before_cursor.startswith('pg_')):
            views = [v for v in views if not v.startswith('pg_')]

        return self.find_matches(word_before_cursor, views, mode='strict', meta='view')

    def get_alias_matches(self, suggestion, word_before_cursor):
        aliases = suggestion.aliases
        return self.find_matches(word_before_cursor, aliases, mode='strict',
                                 meta='table alias')

    def get_database_matches(self, _, word_before_cursor):
        databases = []

        query = render_template("/".join([self.sql_path, 'databases.sql']))
        if self.conn.connected():
            status, res = self.conn.execute_dict(query)
            if status:
                for record in res['rows']:
                    databases.append(record['datname'])

        return self.find_matches(word_before_cursor, databases, mode='strict',
                                 meta='database')

    def get_keyword_matches(self, _, word_before_cursor):
        return self.find_matches(word_before_cursor, self.keywords,
                                 mode='strict', meta='keyword')

    def get_datatype_matches(self, suggestion, word_before_cursor):
        # suggest custom datatypes
        types = self.populate_schema_objects(suggestion.schema, 'datatypes')
        matches = self.find_matches(word_before_cursor, types, mode='strict', meta='datatype')

        return matches

    def get_word_before_cursor(self, word=False):
        """
        Give the word before the cursor.
        If we have whitespace before the cursor this returns an empty string.

        Args:
            word:
        """

        if self.text_before_cursor[-1:].isspace():
            return ''
        else:
            return self.text_before_cursor[self.find_start_of_previous_word(word=word):]

    def find_start_of_previous_word(self, count=1, word=False):
        """
        Return an index relative to the cursor position pointing to the start
        of the previous word. Return `None` if nothing was found.

        Args:
            count:
            word:
        """

        # Reverse the text before the cursor, in order to do an efficient
        # backwards search.
        text_before_cursor = self.text_before_cursor[::-1]

        regex = _FIND_BIG_WORD_RE if word else _FIND_WORD_RE
        iterator = regex.finditer(text_before_cursor)

        try:
            for i, match in enumerate(iterator):
                if i + 1 == count:
                    return - match.end(1)
        except StopIteration:
            pass

    suggestion_matchers = {
        Column: get_column_matches,
        Function: get_function_matches,
        Schema: get_schema_matches,
        Table: get_table_matches,
        View: get_view_matches,
        Alias: get_alias_matches,
        Database: get_database_matches,
        Keyword: get_keyword_matches,
        Datatype: get_datatype_matches,
    }

    def populate_scoped_cols(self, scoped_tbls):
        """ Find all columns in a set of scoped_tables
        :param scoped_tbls: list of TableReference namedtuples
        :return: list of column names
        """

        columns = []
        for tbl in scoped_tbls:
            if tbl.schema:
                # A fully qualified schema.relname reference
                schema = self.escape_name(tbl.schema)
                relname = self.escape_name(tbl.name)

                if tbl.is_function:
                    query = render_template("/".join([self.sql_path, 'functions.sql']),
                                            schema_name=schema,
                                            func_name=relname)

                    if self.conn.connected():
                        status, res = self.conn.execute_dict(query)
                        func = None
                        if status:
                            for row in res['rows']:
                                func = FunctionMetadata(row['schema_name'], row['func_name'],
                                                        row['arg_list'], row['return_type'],
                                                        row['is_aggregate'], row['is_window'],
                                                        row['is_set_returning'])
                        if func:
                            columns.extend(func.fieldnames())
                else:
                    # We don't know if schema.relname is a table or view. Since
                    # tables and views cannot share the same name, we can check
                    # one at a time

                    query = render_template("/".join([self.sql_path, 'columns.sql']),
                                            object_name='table',
                                            schema_name=schema,
                                            rel_name=relname)

                    if self.conn.connected():
                        status, res = self.conn.execute_dict(query)
                        if status:
                            if len(res['rows']) > 0:
                                # Table exists, so don't bother checking for a view
                                for record in res['rows']:
                                    columns.append(record['column_name'])
                            else:
                                query = render_template("/".join([self.sql_path, 'columns.sql']),
                                                        object_name='view',
                                                        schema_name=schema,
                                                        rel_name=relname)

                                if self.conn.connected():
                                    status, res = self.conn.execute_dict(query)
                                    if status:
                                        for record in res['rows']:
                                            columns.append(record['column_name'])
            else:
                # Schema not specified, so traverse the search path looking for
                # a table or view that matches. Note that in order to get proper
                # shadowing behavior, we need to check both views and tables for
                # each schema before checking the next schema
                for schema in self.search_path:
                    relname = self.escape_name(tbl.name)

                    if tbl.is_function:
                        query = render_template("/".join([self.sql_path, 'functions.sql']),
                                                schema_name=schema,
                                                func_name=relname)

                        if self.conn.connected():
                            status, res = self.conn.execute_dict(query)
                            func = None
                            if status:
                                for row in res['rows']:
                                    func = FunctionMetadata(row['schema_name'], row['func_name'],
                                                            row['arg_list'], row['return_type'],
                                                            row['is_aggregate'], row['is_window'],
                                                            row['is_set_returning'])
                            if func:
                                columns.extend(func.fieldnames())
                    else:
                        query = render_template("/".join([self.sql_path, 'columns.sql']),
                                                object_name='table',
                                                schema_name=schema,
                                                rel_name=relname)

                        if self.conn.connected():
                            status, res = self.conn.execute_dict(query)
                            if status:
                                if len(res['rows']) > 0:
                                    # Table exists, so don't bother checking for a view
                                    for record in res['rows']:
                                        columns.append(record['column_name'])
                                else:
                                    query = render_template("/".join([self.sql_path, 'columns.sql']),
                                                            object_name='view',
                                                            schema_name=schema,
                                                            rel_name=relname)

                                    if self.conn.connected():
                                        status, res = self.conn.execute_dict(query)
                                        if status:
                                            for record in res['rows']:
                                                columns.append(record['column_name'])

        return columns

    def populate_schema_objects(self, schema, obj_type):
        """
        Returns list of tables or functions for a (optional) schema

        Args:
            schema:
            obj_type:
        """

        in_clause = ''
        query = ''
        objects = []

        if schema:
            in_clause = '\'' + schema + '\''
        else:
            for r in self.search_path:
                in_clause += '\'' + r + '\','

            # Remove extra comma
            if len(in_clause) > 0:
                in_clause = in_clause[:-1]

        if obj_type == 'tables':
            query = render_template("/".join([self.sql_path, 'tableview.sql']),
                                    schema_names=in_clause,
                                    object_name='tables')
        elif obj_type == 'views':
            query = render_template("/".join([self.sql_path, 'tableview.sql']),
                                    schema_names=in_clause,
                                    object_name='views')
        elif obj_type == 'functions':
            query = render_template("/".join([self.sql_path, 'functions.sql']),
                                    schema_names=in_clause)
        elif obj_type == 'datatypes':
            query = render_template("/".join([self.sql_path, 'datatypes.sql']),
                                    schema_names=in_clause)

        if self.conn.connected():
            status, res = self.conn.execute_dict(query)
            if status:
                for record in res['rows']:
                    objects.append(record['object_name'])

        return objects

    def populate_functions(self, schema):
        """
        Returns a list of function names

        filter_func is a function that accepts a FunctionMetadata namedtuple
        and returns a boolean indicating whether that function should be
        kept or discarded

        Args:
            schema:
        """

        in_clause = ''
        funcs = []

        if schema:
            in_clause = '\'' + schema + '\''
        else:
            for r in self.search_path:
                in_clause += '\'' + r + '\','

            # Remove extra comma
            if len(in_clause) > 0:
                in_clause = in_clause[:-1]

        query = render_template("/".join([self.sql_path, 'functions.sql']),
                                schema_names=in_clause,
                                is_set_returning=True)

        if self.conn.connected():
            status, res = self.conn.execute_dict(query)
            if status:
                for record in res['rows']:
                    funcs.append(record['object_name'])

        return funcs

    def suggest_type(self, full_text, text_before_cursor):
        """
        Takes the full_text that is typed so far and also the text before the
        cursor to suggest completion type and scope.

        Returns a tuple with a type of entity ('table', 'column' etc) and a scope.
        A scope for a column category will be a list of tables.

        Args:
            full_text: Contains complete query
            text_before_cursor: Contains text before the cursor
        """

        word_before_cursor = last_word(text_before_cursor, include='many_punctuations')

        identifier = None

        def strip_named_query(txt):
            """
            This will strip "save named query" command in the beginning of the line:
            '\ns zzz SELECT * FROM abc'   -> 'SELECT * FROM abc'
            '  \ns zzz SELECT * FROM abc' -> 'SELECT * FROM abc'

            Args:
                txt:
            """

            pattern = re.compile(r'^\s*\\ns\s+[A-z0-9\-_]+\s+')
            if pattern.match(txt):
                txt = pattern.sub('', txt)
            return txt

        full_text = strip_named_query(full_text)
        text_before_cursor = strip_named_query(text_before_cursor)

        # If we've partially typed a word then word_before_cursor won't be an empty
        # string. In that case we want to remove the partially typed string before
        # sending it to the sqlparser. Otherwise the last token will always be the
        # partially typed string which renders the smart completion useless because
        # it will always return the list of keywords as completion.
        if word_before_cursor:
            if word_before_cursor[-1] == '(' or word_before_cursor[0] == '\\':
                parsed = sqlparse.parse(text_before_cursor)
            else:
                parsed = sqlparse.parse(
                    text_before_cursor[:-len(word_before_cursor)])

                identifier = parse_partial_identifier(word_before_cursor)
        else:
            parsed = sqlparse.parse(text_before_cursor)

        statement = None
        if len(parsed) > 1:
            # Multiple statements being edited -- isolate the current one by
            # cumulatively summing statement lengths to find the one that bounds the
            # current position
            current_pos = len(text_before_cursor)
            stmt_start, stmt_end = 0, 0

            for statement in parsed:
                stmt_len = len(statement.to_unicode())
                stmt_start, stmt_end = stmt_end, stmt_end + stmt_len

                if stmt_end >= current_pos:
                    break

            text_before_cursor = full_text[stmt_start:current_pos]
            full_text = full_text[stmt_start:]
        elif parsed:
            # A single statement
            statement = parsed[0]
        else:
            # The empty string
            statement = None

        last_token = statement and statement.token_prev(len(statement.tokens)) or ''

        return self.suggest_based_on_last_token(last_token, text_before_cursor,
                                                full_text, identifier)

    def suggest_based_on_last_token(self, token, text_before_cursor, full_text, identifier):
        # New version of sqlparse sends tuple, we need to make it
        # compatible with our logic
        if isinstance(token, tuple) and len(token) > 1:
            token = token[1]

        if isinstance(token, string_types):
            token_v = token.lower()
        elif isinstance(token, Comparison):
            # If 'token' is a Comparison type such as
            # 'select * FROM abc a JOIN def d ON a.id = d.'. Then calling
            # token.value on the comparison type will only return the lhs of the
            # comparison. In this case a.id. So we need to do token.tokens to get
            # both sides of the comparison and pick the last token out of that
            # list.
            token_v = token.tokens[-1].value.lower()
        elif isinstance(token, Where):
            # sqlparse groups all tokens from the where clause into a single token
            # list. This means that token.value may be something like
            # 'where foo > 5 and '. We need to look "inside" token.tokens to handle
            # suggestions in complicated where clauses correctly
            prev_keyword, text_before_cursor = find_prev_keyword(text_before_cursor)
            return self.suggest_based_on_last_token(
                prev_keyword, text_before_cursor, full_text, identifier)
        elif isinstance(token, Identifier):
            # If the previous token is an identifier, we can suggest datatypes if
            # we're in a parenthesized column/field list, e.g.:
            #       CREATE TABLE foo (Identifier <CURSOR>
            #       CREATE FUNCTION foo (Identifier <CURSOR>
            # If we're not in a parenthesized list, the most likely scenario is the
            # user is about to specify an alias, e.g.:
            #       SELECT Identifier <CURSOR>
            #       SELECT foo FROM Identifier <CURSOR>
            prev_keyword, _ = find_prev_keyword(text_before_cursor)
            if prev_keyword and prev_keyword.value == '(':
                # Suggest datatypes
                return self.suggest_based_on_last_token(
                    'type', text_before_cursor, full_text, identifier)
            else:
                return Keyword(),
        else:
            token_v = token.value.lower()

        if not token:
            return Keyword(),
        elif token_v.endswith('('):
            p = sqlparse.parse(text_before_cursor)[0]

            if p.tokens and isinstance(p.tokens[-1], Where):
                # Four possibilities:
                #  1 - Parenthesized clause like "WHERE foo AND ("
                #        Suggest columns/functions
                #  2 - Function call like "WHERE foo("
                #        Suggest columns/functions
                #  3 - Subquery expression like "WHERE EXISTS ("
                #        Suggest keywords, in order to do a subquery
                #  4 - Subquery OR array comparison like "WHERE foo = ANY("
                #        Suggest columns/functions AND keywords. (If we wanted to be
                #        really fancy, we could suggest only array-typed columns)

                column_suggestions = self.suggest_based_on_last_token(
                    'where', text_before_cursor, full_text, identifier)

                # Check for a subquery expression (cases 3 & 4)
                where = p.tokens[-1]
                prev_tok = where.token_prev(len(where.tokens) - 1)

                if isinstance(prev_tok, Comparison):
                    # e.g. "SELECT foo FROM bar WHERE foo = ANY("
                    prev_tok = prev_tok.tokens[-1]

                prev_tok = prev_tok.value.lower()
                if prev_tok == 'exists':
                    return Keyword(),
                else:
                    return column_suggestions

            # Get the token before the parens
            prev_tok = p.token_prev(len(p.tokens) - 1)
            if prev_tok and prev_tok.value and prev_tok.value.lower() == 'using':
                # tbl1 INNER JOIN tbl2 USING (col1, col2)
                tables = extract_tables(full_text)

                # suggest columns that are present in more than one table
                return Column(tables=tables, drop_unique=True),

            elif p.token_first().value.lower() == 'select':
                # If the lparen is preceeded by a space chances are we're about to
                # do a sub-select.
                if last_word(text_before_cursor,
                             'all_punctuations').startswith('('):
                    return Keyword(),
            # We're probably in a function argument list
            return Column(tables=extract_tables(full_text)),
        elif token_v in ('set', 'by', 'distinct'):
            return Column(tables=extract_tables(full_text)),
        elif token_v in ('select', 'where', 'having'):
            # Check for a table alias or schema qualification
            parent = (identifier and identifier.get_parent_name()) or []

            if parent:
                tables = extract_tables(full_text)
                tables = tuple(t for t in tables if self.identifies(parent, t))
                return (Column(tables=tables),
                        Table(schema=parent),
                        View(schema=parent),
                        Function(schema=parent),)
            else:
                return (Column(tables=extract_tables(full_text)),
                        Function(schema=None),
                        Keyword(),)

        elif (token_v.endswith('join') and token.is_keyword) or \
                (token_v in ('copy', 'from', 'update', 'into', 'describe', 'truncate')):

            schema = (identifier and identifier.get_parent_name()) or None

            # Suggest tables from either the currently-selected schema or the
            # public schema if no schema has been specified
            suggest = [Table(schema=schema)]

            if not schema:
                # Suggest schemas
                suggest.insert(0, Schema())

            # Only tables can be TRUNCATED, otherwise suggest views
            if token_v != 'truncate':
                suggest.append(View(schema=schema))

            # Suggest set-returning functions in the FROM clause
            if token_v == 'from' or (token_v.endswith('join') and token.is_keyword):
                suggest.append(Function(schema=schema, filter='is_set_returning'))

            return tuple(suggest)

        elif token_v in ('table', 'view', 'function'):
            # E.g. 'DROP FUNCTION <funcname>', 'ALTER TABLE <tablname>'
            rel_type = {'table': Table, 'view': View, 'function': Function}[token_v]
            schema = (identifier and identifier.get_parent_name()) or None
            if schema:
                return rel_type(schema=schema),
            else:
                return Schema(), rel_type(schema=schema)
        elif token_v == 'on':
            tables = extract_tables(full_text)  # [(schema, table, alias), ...]
            parent = (identifier and identifier.get_parent_name()) or None
            if parent:
                # "ON parent.<suggestion>"
                # parent can be either a schema name or table alias
                tables = tuple(t for t in tables if self.identifies(parent, t))
                return (Column(tables=tables),
                        Table(schema=parent),
                        View(schema=parent),
                        Function(schema=parent))
            else:
                # ON <suggestion>
                # Use table alias if there is one, otherwise the table name
                aliases = tuple(t.alias or t.name for t in tables)
                return Alias(aliases=aliases),

        elif token_v in ('c', 'use', 'database', 'template'):
            # "\c <db", "use <db>", "DROP DATABASE <db>",
            # "CREATE DATABASE <newdb> WITH TEMPLATE <db>"
            return Database(),
        elif token_v == 'schema':
            # DROP SCHEMA schema_name
            return Schema(),
        elif token_v.endswith(',') or token_v in ('=', 'and', 'or'):
            prev_keyword, text_before_cursor = find_prev_keyword(text_before_cursor)
            if prev_keyword:
                return self.suggest_based_on_last_token(
                    prev_keyword, text_before_cursor, full_text, identifier)
            else:
                return ()
        elif token_v in ('type', '::'):
            #   ALTER TABLE foo SET DATA TYPE bar
            #   SELECT foo::bar
            # Note that tables are a form of composite type in postgresql, so
            # they're suggested here as well
            schema = (identifier and identifier.get_parent_name()) or None
            suggestions = [Datatype(schema=schema),
                           Table(schema=schema)]
            if not schema:
                suggestions.append(Schema())
            return tuple(suggestions)
        else:
            return Keyword(),

    def identifies(self, id, ref):
        """
        Returns true if string `id` matches TableReference `ref`

        Args:
            id:
            ref:
        """
        return id == ref.alias or id == ref.name or (
            ref.schema and (id == ref.schema + '.' + ref.name))
