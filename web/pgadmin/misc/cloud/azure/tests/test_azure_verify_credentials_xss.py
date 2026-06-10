##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Wiring test for the XSS scrub in the Azure verify_credentials flow.

A failing Azure credential validation returns an exception string that
can include attacker-influenced fields (tenant id, principal name) under
non-default authentication setups. The /azure/verify_credentials/
endpoint propagates the string into the JSON `errormsg` field. The fix
routes it through sanitize_external_text; this test confirms that
contract holds by patching Azure.validate_azure_credentials to return
an HTML-bearing error.
"""

import json
import unittest
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator


XSS_PAYLOAD = '<iframe/src=http://attacker.example/>'
AZURE_LIKE_ERROR = (
    'Authentication failed for tenant ' + XSS_PAYLOAD +
    ': MSAL returned no token.'
)


class _SkipServerSetUpMixin:
    """Pure-Python wiring test — skip the Postgres server setup."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class TestAzureVerifyCredentialsXssEscaped(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Azure SDK error text containing HTML must be HTML-escaped in the
    JSON `errormsg`."""

    scenarios = [
        ('iframe payload in azure error is HTML-escaped in errormsg',
         dict()),
    ]

    def runTest(self):
        from flask import Flask, session
        from pgadmin.misc.cloud import azure as azure_mod

        app = Flask(__name__)
        app.secret_key = 'test'

        request_payload = {
            'cloud': 'azure',
            'secret': {
                'auth_type': 'azure_interactive_authentication',
                'azure_tenant_id': XSS_PAYLOAD,
            },
        }

        # Azure.__init__ touches current_user.username (Flask-Login state)
        # which a bare test_request_context cannot provide. Patch the
        # Azure class to a stand-in whose validate_azure_credentials
        # returns the HTML-bearing error.
        class FakeAzure:
            def __init__(self, *args, **kwargs):
                pass

            def validate_azure_credentials(self):
                return (False, AZURE_LIKE_ERROR)

        with app.test_request_context(
                '/azure/verify_credentials/',
                method='POST',
                data=json.dumps(request_payload),
                content_type='application/json'):
            session['azure'] = {}
            with patch.object(azure_mod, 'Azure', FakeAzure):
                response = azure_mod.verify_credentials.__wrapped__()

        self.assertEqual(response.status_code, 200)
        body = json.loads(response.data)
        errormsg = body.get('errormsg') or ''

        self.assertEqual(body.get('success'), False)
        # The Azure-shaped error must be present in some form.
        self.assertIn('Authentication failed for tenant', errormsg)
        # Raw markup must NOT survive.
        self.assertNotIn('<iframe', errormsg)
        # Entity-encoded form must be present.
        self.assertIn('&lt;iframe', errormsg)
