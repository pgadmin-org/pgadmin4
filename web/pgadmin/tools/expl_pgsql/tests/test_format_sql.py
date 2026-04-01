##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Test the SQL formatting functionality in Explain PostgreSQL module."""
import json
import unittest
from unittest.mock import patch
from pgadmin.utils.route import BaseTestGenerator


class TestFormatSQLFunctionality(BaseTestGenerator):
    """Test the SQL formatting functionality."""

    scenarios = [
        ('Test format SQL endpoint', dict(
            url='/expl_pgsql/formatSQL',
            method='POST',
            data={'query_src': 'SELECT * FROM test_table WHERE id = 1;'},
            expected_success=True
        )),
        ('Test format SQL with invalid data', dict(
            url='/expl_pgsql/formatSQL',
            method='POST',
            data='invalid_json',
            expected_success=False
        ))
    ]

    def runTest(self):
        """Run test case."""
        with patch('pgadmin.tools.expl_pgsql.get_preference_value') as mock_pref, \
              patch('pgadmin.tools.expl_pgsql.is_valid_url') as mock_valid, \
              patch('pgadmin.tools.expl_pgsql.send_post_request') as mock_send:

            mock_pref.return_value = 'https://explain.tensor.ru'
            mock_valid.return_value = True
            mock_send.return_value = (False, json.dumps({
                'btf_query': '<span class=\'sql_keyword\'>SELECT</span>',
                'btf_query_text': 'SELECT\\n\\t*\\nFROM\\n\\ttest_table\\nWHERE\\n\\tid = 1;'
            }))

        if self.expected_success:
            response = self.tester.post(
                self.url,
                data=json.dumps(self.data),
                content_type='application/json'
            )
            self.assertEqual(response.status_code, 200)
            response_data = json.loads(response.data.decode('utf-8'))
            self.assertTrue(response_data['success'])
        else:
            response = self.tester.post(
                self.url,
                data=self.data,
                content_type='application/json'
            )
            self.assertEqual(response.status_code, 200)
            response_data = json.loads(response.data.decode('utf-8'))
            self.assertFalse(response_data['success'])
