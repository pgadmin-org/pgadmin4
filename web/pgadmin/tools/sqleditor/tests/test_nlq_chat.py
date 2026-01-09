##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for the NLQ (Natural Language Query) chat endpoint."""

import json
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator


class NLQChatTestCase(BaseTestGenerator):
    """Test cases for NLQ chat streaming endpoint"""

    scenarios = [
        ('NLQ Chat - LLM Disabled', dict(
            llm_enabled=False,
            expected_error=True,
            error_contains='AI features are not configured'
        )),
        ('NLQ Chat - Invalid Transaction', dict(
            llm_enabled=True,
            valid_transaction=False,
            expected_error=True,
            error_contains='Transaction ID'
        )),
        ('NLQ Chat - Empty Message', dict(
            llm_enabled=True,
            valid_transaction=True,
            message='',
            expected_error=True,
            error_contains='provide a message'
        )),
        ('NLQ Chat - Success', dict(
            llm_enabled=True,
            valid_transaction=True,
            message='Find all users',
            expected_error=False,
            mock_response='{"sql": "SELECT * FROM users;", "explanation": "Gets all users"}'
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Test NLQ chat endpoint"""
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

        # Mock chat_with_database
        if hasattr(self, 'mock_response'):
            mock_chat = patch(
                'pgadmin.llm.chat.chat_with_database',
                return_value=(self.mock_response, [])
            )
            patches.append(mock_chat)

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
            # Make request
            message = getattr(self, 'message', 'test query')
            response = self.tester.post(
                f'/sqleditor/nlq/chat/{trans_id}/stream',
                data=json.dumps({'message': message}),
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


class NLQSystemPromptTestCase(BaseTestGenerator):
    """Test cases for NLQ system prompt"""

    scenarios = [
        ('NLQ Prompt - Import', dict()),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Test NLQ system prompt can be imported"""
        from pgadmin.llm.prompts.nlq import NLQ_SYSTEM_PROMPT

        # Verify prompt is a non-empty string
        self.assertIsInstance(NLQ_SYSTEM_PROMPT, str)
        self.assertGreater(len(NLQ_SYSTEM_PROMPT), 100)

        # Verify key content is present
        self.assertIn('PostgreSQL', NLQ_SYSTEM_PROMPT)
        self.assertIn('SQL', NLQ_SYSTEM_PROMPT)
        self.assertIn('get_database_schema', NLQ_SYSTEM_PROMPT)

    def tearDown(self):
        pass
