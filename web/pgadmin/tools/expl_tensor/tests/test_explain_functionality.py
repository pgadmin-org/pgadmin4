##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Test the explain plan functionality in Explain Tensor module."""
import json
import unittest
from unittest.mock import patch, MagicMock
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools.expl_tensor import MODULE_NAME


class TestExplainFunctionality(BaseTestGenerator):
    """Test the explain plan functionality."""

    scenarios = [
        ('Test explain plan endpoint', dict(
            url='/expl_tensor/explain',
            method='POST',
            data={'plan': '{"Plan": {}}', 'query': 'SELECT * FROM test;'},
            expected_success=True
        )),
        ('Test explain plan with invalid data', dict(
            url='/expl_tensor/explain',
            method='POST',
            data='invalid_json',
            expected_success=False
        ))
    ]

    def runTest(self):
        """Run test case."""
        if self.method == 'POST':
            with patch('pgadmin.tools.expl_tensor.get_preference_value') as mock_pref:
                mock_pref.return_value = 'https://explain.tensor.ru'

                with patch('pgadmin.tools.expl_tensor.is_valid_url') as mock_valid:
                    mock_valid.return_value = True

                    with patch('pgadmin.tools.expl_tensor.send_post_request') as mock_send:
                        mock_send.return_value = (False, '/explain/12345')

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
