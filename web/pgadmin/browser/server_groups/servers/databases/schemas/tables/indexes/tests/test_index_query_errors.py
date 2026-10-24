##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Index metadata query failures must survive the HTTP response boundary.

Inject driver failures separately for properties, key columns and INCLUDE
columns. Exercise their callers too: a helper returning an HTTP response where
a dictionary or SQL tuple is expected can otherwise mask the original error.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from flask import Flask

from pgadmin.browser.server_groups.servers.databases.schemas.tables import \
    indexes
from pgadmin.utils.route import BaseTestGenerator


class IndexQueryErrorsTestCase(BaseTestGenerator):
    scenarios = [
        (endpoint + ': ' + query, dict(endpoint=endpoint, query=query))
        for endpoint in ('properties', 'sql', 'msql', 'update')
        for query in ('properties', 'columns', 'include')
        if query != 'include' or endpoint in ('properties', 'sql')
    ] + [('healthy properties', dict(endpoint='properties', query=None))]

    def setUp(self):
        self.app_under_test = Flask(__name__)
        self.conn = MagicMock()
        self.conn.manager.version = 170000
        self.error = ('permission denied for index metadata\n'
                      'DETAIL: original query detail\n'
                      'HINT: original query hint')
        self.data = dict(name='test_index', amname='btree')
        self.column = dict(attdef='"id"', collnspname=None, opcname=None,
                           attnum=1, is_exp=False, statistics=-1,
                           options=['ASC', 'NULLS LAST'])
        self.conn.execute_dict.return_value = (True, {'rows': [self.data]})
        self.conn.execute_2darray.side_effect = [
            (True, {'rows': [self.column, self.column]}),
            (True, {'rows': [{'colname': 'payload'}]}),
        ]
        if self.query == 'properties':
            self.conn.execute_dict.return_value = (False, self.error)
        elif self.query == 'columns':
            self.conn.execute_2darray.side_effect = [(False, self.error)]
        elif self.query == 'include':
            self.conn.execute_2darray.side_effect = [
                (True, {'rows': [self.column]}), (False, self.error),
            ]

        view = indexes.IndexesView.__new__(indexes.IndexesView)
        view.conn = self.conn
        view.manager = self.conn.manager
        view.template_path = 'indexes/sql/default'
        view._DATABASE_LAST_SYSTEM_OID = 0
        view.schema = 'public'
        view.table = 'test_table'
        view.blueprint = SimpleNamespace(show_system_objects=False)

        # Connection preconditions are supplied above. Keep the real handlers,
        # utility calls, Flask exception handling and JSON serialization.
        handler = getattr(indexes.IndexesView, self.endpoint).__wrapped__
        self.app_under_test.add_url_rule(
            '/index', view_func=lambda: handler(view, 1, 1, 1, 1, 1, 1),
            methods=['GET', 'PUT'])

    def runTest(self):
        with patch.object(indexes, 'render_template',
                          return_value='SELECT 1'), \
                patch.object(indexes.index_utils, 'render_template',
                             return_value='SELECT 1'):
            client = self.app_under_test.test_client()
            response = (client.put('/index', json={})
                        if self.endpoint == 'update' else client.get('/index'))
        if self.query is not None:
            self.assertEqual(response.status_code, 500)
            self.assertIsNotNone(response.get_json())
            self.assertEqual(response.get_json()['errormsg'], self.error)
            self.assertEqual(response.get_json()['success'], 0)
            self.conn.execute_scalar.assert_not_called()
        else:
            self.assertEqual(response.status_code, 200)
            data = response.get_json()
            self.assertEqual(len(data['columns']), 1)
            self.assertEqual(data['columns'][0]['colname'], 'id')
            self.assertEqual(data['include'], ['payload'])

    def tearDown(self):
        pass
