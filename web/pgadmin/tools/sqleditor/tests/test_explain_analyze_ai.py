##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for the AI-powered EXPLAIN plan analysis endpoint."""

import json
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator


class ExplainAnalyzeAITestCase(BaseTestGenerator):
    """Test cases for EXPLAIN plan AI analysis streaming endpoint"""

    scenarios = [
        ('Explain AI - LLM Disabled', dict(
            llm_enabled=False,
            expected_error=True,
            error_contains='AI features are not configured'
        )),
        ('Explain AI - Invalid Transaction', dict(
            llm_enabled=True,
            valid_transaction=False,
            expected_error=True,
            error_contains='Transaction ID'
        )),
        ('Explain AI - Empty Plan', dict(
            llm_enabled=True,
            valid_transaction=True,
            plan=None,
            expected_error=True,
            error_contains='provide an EXPLAIN plan'
        )),
        ('Explain AI - Success', dict(
            llm_enabled=True,
            valid_transaction=True,
            plan=[{
                'Plan': {
                    'Node Type': 'Seq Scan',
                    'Relation Name': 'users',
                    'Total Cost': 100.0,
                    'Plan Rows': 1000
                }
            }],
            sql='SELECT * FROM users',
            expected_error=False,
            mock_response=json.dumps({
                'bottlenecks': [{
                    'severity': 'high',
                    'node': 'Seq Scan on users',
                    'issue': 'Sequential scan on large table',
                    'details': 'Consider adding an index'
                }],
                'recommendations': [{
                    'priority': 1,
                    'title': 'Add index',
                    'explanation': 'Will improve query performance',
                    'sql': 'CREATE INDEX idx_users ON users (id);'
                }],
                'summary': 'Query could benefit from indexing.'
            })
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Test EXPLAIN analysis endpoint"""
        trans_id = 12345

        # Build the mock chain
        patches = []

        # Mock LLM availability (patch where it's imported from)
        mock_llm_enabled = patch(
            'pgadmin.llm.utils.is_llm_enabled',
            return_value=self.llm_enabled
        )
        patches.append(mock_llm_enabled)

        # Mock check_transaction_status
        if hasattr(self, 'valid_transaction') and self.valid_transaction:
            mock_trans_obj = MagicMock()
            mock_trans_obj.sid = 1
            mock_trans_obj.did = 1

            mock_conn = MagicMock()
            mock_conn.connected.return_value = True

            mock_session = {'sid': 1, 'did': 1}

            mock_check_trans = patch(
                'pgadmin.tools.sqleditor.check_transaction_status',
                return_value=(True, None, mock_conn, mock_trans_obj, mock_session)
            )
        else:
            mock_check_trans = patch(
                'pgadmin.tools.sqleditor.check_transaction_status',
                return_value=(False, 'Transaction ID not found', None, None, None)
            )
        patches.append(mock_check_trans)

        # Mock get_llm_client (the endpoint uses client.chat())
        if hasattr(self, 'mock_response'):
            mock_response_obj = MagicMock()
            mock_response_obj.content = self.mock_response
            mock_client = MagicMock()
            mock_client.chat.return_value = mock_response_obj
            mock_get_client = patch(
                'pgadmin.llm.client.get_llm_client',
                return_value=mock_client
            )
            patches.append(mock_get_client)

        # Mock CSRF protection
        mock_csrf = patch(
            'pgadmin.authenticate.mfa.utils.mfa_required',
            lambda f: f
        )
        patches.append(mock_csrf)

        # Start all patches
        for p in patches:
            p.start()

        try:
            # Build request data
            request_data = {}
            if hasattr(self, 'plan'):
                request_data['plan'] = self.plan
            if hasattr(self, 'sql'):
                request_data['sql'] = self.sql

            # Make request
            response = self.tester.post(
                f'/sqleditor/explain/analyze/{trans_id}/stream',
                data=json.dumps(request_data),
                content_type='application/json',
                follow_redirects=True
            )

            if self.expected_error:
                # For error cases, we expect JSON response
                if response.status_code == 200 and \
                   response.content_type == 'application/json':
                    data = json.loads(response.data)
                    self.assertFalse(data.get('success', True))
                    if hasattr(self, 'error_contains'):
                        self.assertIn(
                            self.error_contains,
                            data.get('errormsg', '')
                        )
            else:
                # For success, we expect SSE stream
                self.assertEqual(response.status_code, 200)
                self.assertIn('text/event-stream', response.content_type)

        finally:
            # Stop all patches
            for p in patches:
                p.stop()

    def tearDown(self):
        pass


class ExplainPromptTestCase(BaseTestGenerator):
    """Test cases for EXPLAIN analysis system prompt"""

    scenarios = [
        ('Explain Prompt - Import', dict()),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Test EXPLAIN analysis system prompt can be imported"""
        from pgadmin.llm.prompts.explain import EXPLAIN_ANALYSIS_PROMPT

        # Verify prompt is a non-empty string
        self.assertIsInstance(EXPLAIN_ANALYSIS_PROMPT, str)
        self.assertGreater(len(EXPLAIN_ANALYSIS_PROMPT), 100)

        # Verify key content is present
        self.assertIn('PostgreSQL', EXPLAIN_ANALYSIS_PROMPT)
        self.assertIn('EXPLAIN', EXPLAIN_ANALYSIS_PROMPT)
        self.assertIn('bottlenecks', EXPLAIN_ANALYSIS_PROMPT)
        self.assertIn('recommendations', EXPLAIN_ANALYSIS_PROMPT)

    def tearDown(self):
        pass
