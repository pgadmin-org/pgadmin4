##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Test the status endpoint in Explain Tensor module."""
import json
import unittest
from unittest.mock import patch
from pgadmin.utils.route import BaseTestGenerator


class TestStatusEndpoint(BaseTestGenerator):
    """Test the status endpoint."""

    scenarios = [
        ('Test status endpoint enabled', dict(
            preference_value=True,
            expected_enabled=True
        )),
        ('Test status endpoint disabled', dict(
            preference_value=False,
            expected_enabled=False
        ))
    ]

    def runTest(self):
        """Run test case."""
        with patch('pgadmin.tools.expl_tensor.get_preference_value') as mock_pref:
            mock_pref.return_value = self.preference_value

            response = self.tester.get('/expl_tensor/status')
            self.assertEqual(response.status_code, 200)
            response_data = json.loads(response.data.decode('utf-8'))
            self.assertTrue(response_data['success'])
            self.assertEqual(response_data['data']['enabled'], self.expected_enabled)
