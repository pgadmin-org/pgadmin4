##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Wiring test for the XSS scrub in the Google verify_credentials flow.

The Google credential-verification view echoes back the user-supplied
client_secret_file path inside error responses when path resolution
fails (PermissionError, generic Exception). A crafted path containing
HTML must be HTML-escaped in the JSON `errormsg` rather than rendered as
raw markup downstream.
"""

import json
import unittest
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator


XSS_PAYLOAD = '<iframe/src=http://attacker.example/>'


class _SkipServerSetUpMixin:
    """Pure-Python wiring test — skip the Postgres server setup."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class TestGoogleVerifyCredentialsXssEscaped(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """The client_secret_file path resolution failure path must
    HTML-escape attacker-influenced text in the JSON `errormsg`."""

    scenarios = [
        ('PermissionError path is HTML-escaped',
         dict(exception=PermissionError(
             'denied for path ' + XSS_PAYLOAD),
             expected_status=401)),
        ('generic Exception path is HTML-escaped',
         dict(exception=Exception(
             'bad path ' + XSS_PAYLOAD),
             expected_status=400)),
    ]

    def runTest(self):
        from flask import Flask
        from pgadmin.misc.cloud import google as google_mod

        app = Flask(__name__)
        app.secret_key = 'test'

        request_payload = {
            'cloud': 'google',
            'secret': {
                'client_secret_file': '/tmp/' + XSS_PAYLOAD,
            },
        }

        with app.test_request_context(
                '/google/verify_credentials/',
                method='POST',
                data=json.dumps(request_payload),
                content_type='application/json'):
            with patch.object(
                    google_mod, 'filename_with_file_manager_path',
                    side_effect=self.exception):
                response = google_mod.verify_credentials.__wrapped__()

        self.assertEqual(response.status_code, self.expected_status)
        body = json.loads(response.data)
        errormsg = body.get('errormsg') or ''

        self.assertNotIn('<iframe', errormsg)
        self.assertIn('&lt;iframe', errormsg)
