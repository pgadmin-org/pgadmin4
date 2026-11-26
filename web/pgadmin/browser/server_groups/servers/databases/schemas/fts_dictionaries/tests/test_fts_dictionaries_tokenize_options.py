##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.browser.server_groups.servers.databases.schemas.\
    fts_dictionaries import FtsDictionaryView
from pgadmin.utils.route import BaseTestGenerator


class FtsDictionaryTokenizeOptionsTestCase(BaseTestGenerator):
    """Parsing of pg_ts_dict.dictinitoption, as serialize_deflist()
    writes it."""

    scenarios = [
        ('Quoted string value', dict(
            options="stopwords = 'english'",
            keep_type=False,
            expected=[{'option': 'stopwords', 'value': 'english'}])),
        ('Numeric value is marked only when keeping the type', dict(
            options="maxlen = 4, rejectlong = 'true'",
            keep_type=True,
            expected=[{'option': 'maxlen', 'value': '4', 'numeric': True},
                      {'option': 'rejectlong', 'value': 'true'}])),
        ('Numeric value is not marked by default', dict(
            options="maxlen = 4",
            keep_type=False,
            expected=[{'option': 'maxlen', 'value': '4'}])),
        ('Quoted name, doubled quote and comma inside a value', dict(
            options='"MyOption" = \'a\'\'b,c\', x = 1.5',
            keep_type=False,
            expected=[{'option': 'MyOption', 'value': "a'b,c"},
                      {'option': 'x', 'value': '1.5'}])),
        ('Escape string syntax with a backslash', dict(
            options="p = E'back\\\\slash''q'",
            keep_type=False,
            expected=[{'option': 'p', 'value': "back\\slash'q"}])),
        ('No options', dict(
            options=None,
            keep_type=False,
            expected=None)),
    ]

    def runTest(self):
        result = FtsDictionaryView.tokenize_options(
            None, self.options, keep_type=self.keep_type)
        self.assertEqual(result, self.expected)
