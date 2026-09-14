##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that an OAUTH2_USERINFO_ENDPOINT of None (the shipped config
template default) is treated the same as an absent key, rather than being
passed to the HTTP client and crashing (issue #10349).
"""

import sys
from unittest.mock import MagicMock, patch

from pgadmin.utils.route import BaseTestGenerator


class OAuth2UserinfoEndpointNoneTestCase(BaseTestGenerator):
    """Exercises get_user_profile() directly - no server connection needed."""

    def setUp(self):
        pass

    def runTest(self):
        # Resolved at call time, rather than imported at module load time:
        # test_auth_gating (run earlier in this same package) deliberately
        # forces pgadmin.authenticate.oauth2 to be re-imported, which would
        # leave a module-level import here bound to a stale module object
        # whose globals patch('...session', ...) below wouldn't reach.
        oauth2_module = sys.modules['pgadmin.authenticate.oauth2']
        OAuth2Authentication = oauth2_module.OAuth2Authentication

        auth = OAuth2Authentication.__new__(OAuth2Authentication)
        auth.oauth2_current_client = 'test_provider'
        auth.oauth2_config = {
            'test_provider': {
                'OAUTH2_NAME': 'test_provider',
                # Shipped config.py template default - key present, not set.
                'OAUTH2_USERINFO_ENDPOINT': None,
            }
        }
        mock_client = MagicMock()
        auth.oauth2_clients = {'test_provider': mock_client}

        with self.app.app_context(), \
                patch.object(auth, '_authorize_access_token',
                             return_value={'access_token': 'tok'}), \
                patch.object(auth, '_is_oidc_provider',
                             return_value=False), \
                patch('pgadmin.authenticate.oauth2.session', {}):
            profile = auth.get_user_profile()

        self.assertEqual(profile, {})
        # The bug: client.get(None) raised requests.exceptions.MissingSchema
        # instead of skipping the call.
        mock_client.get.assert_not_called()
