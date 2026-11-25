##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for parse_seclabels_from_db() and the column formatter's use
of it. Security labels are free text, so a label may contain "=" and must
survive the "provider=label" round trip. No PostgreSQL server is needed."""

from unittest.mock import MagicMock, patch
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.utils import \
    parse_seclabels_from_db
from pgadmin.browser.server_groups.servers.databases.utils import \
    parse_sec_labels_from_db

COLUMN_UTILS = ('pgadmin.browser.server_groups.servers.databases.schemas.'
                'tables.columns.utils')


class TestParseSecLabelsFromDb(BaseTestGenerator):
    """Parsing of "provider=label" security label strings."""

    scenarios = [
        ('Plain label',
         dict(test_method='test_plain_label')),
        ('Label containing equals signs',
         dict(test_method='test_label_with_equals')),
        ('Empty label',
         dict(test_method='test_empty_label')),
        ('Label spanning several lines',
         dict(test_method='test_multiline_label')),
        ('Database, domain, function and foreign table parser',
         dict(test_method='test_sec_labels_wrapper')),
        ('Several labels keep their order',
         dict(test_method='test_several_labels')),
        ('No labels',
         dict(test_method='test_no_labels')),
        ('Column formatter accepts a label containing equals signs',
         dict(test_method='test_column_formatter')),
    ]

    def setUp(self):
        # Pure unit tests: no PostgreSQL server connection is needed.
        pass

    def runTest(self):
        getattr(self, self.test_method)()

    def test_plain_label(self):
        self.assertEqual(
            parse_seclabels_from_db(['selinux=system_u:object_r:t']),
            [{'provider': 'selinux', 'label': 'system_u:object_r:t'}])

    def test_label_with_equals(self):
        # PostgreSQL Anonymizer masking rules contain SQL expressions.
        self.assertEqual(
            parse_seclabels_from_db([
                'anon=MASKED WITH VALUE $$a=b$$',
                'anon=MASKED WITH FUNCTION f(x) WHERE id = user_id']),
            [{'provider': 'anon', 'label': 'MASKED WITH VALUE $$a=b$$'},
             {'provider': 'anon',
              'label': 'MASKED WITH FUNCTION f(x) WHERE id = user_id'}])

    def test_empty_label(self):
        self.assertEqual(parse_seclabels_from_db(['anon=']),
                         [{'provider': 'anon', 'label': ''}])

    def test_multiline_label(self):
        # A later line containing "=" must not move the split, and a
        # trailing newline must survive.
        self.assertEqual(
            parse_seclabels_from_db([
                'demo=line one\nline two',
                'demo=a\nb=c',
                'demo=trailing\n']),
            [{'provider': 'demo', 'label': 'line one\nline two'},
             {'provider': 'demo', 'label': 'a\nb=c'},
             {'provider': 'demo', 'label': 'trailing\n'}])

    def test_sec_labels_wrapper(self):
        self.assertEqual(
            parse_sec_labels_from_db(['demo=a\nb=c', 'anon=x=y']),
            {'seclabels': [{'provider': 'demo', 'label': 'a\nb=c'},
                           {'provider': 'anon', 'label': 'x=y'}]})
        self.assertEqual(parse_sec_labels_from_db(None),
                         {'seclabels': []})

    def test_several_labels(self):
        self.assertEqual(
            [r['provider'] for r in parse_seclabels_from_db(
                ['b=1', 'a=2', 'c=3=4'])],
            ['b', 'a', 'c'])

    def test_no_labels(self):
        self.assertEqual(parse_seclabels_from_db([]), [])

    @patch(COLUMN_UTILS + '.render_template', return_value='SELECT 1;')
    @patch(COLUMN_UTILS + '._fetch_inherited_tables',
           return_value=(False, None))
    def test_column_formatter(self, _mock_inherited, _mock_render):
        from pgadmin.browser.server_groups.servers.databases.schemas.\
            tables.columns.utils import column_formatter

        conn = MagicMock()
        conn.execute_dict.return_value = (True, {'rows': []})
        data = dict(
            name='name', atttypid=25, typname='text', cltype='text',
            attlen=-1, attypmod=-1,
            seclabels=['anon=MASKED WITH VALUE $$a=b$$'],
            attnotnull=False, is_pk=False, attnum=2)

        with patch(COLUMN_UTILS + '._check_primary_column'), \
                patch(COLUMN_UTILS + '.fetch_length_precision',
                      side_effect=lambda d: d):
            result = column_formatter(
                conn, 1, 2, data, edit_types_list=[],
                template_path='columns/sql/default')

        self.assertEqual(
            result['seclabels'],
            [{'provider': 'anon', 'label': 'MASKED WITH VALUE $$a=b$$'}])
