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

import importlib
from unittest.mock import MagicMock, patch

from pgadmin.utils.route import BaseTestGenerator


class OAuth2UserinfoEndpointNoneTestCase(BaseTestGenerator):
    """Exercises get_user_profile() directly - no server connection needed."""

    def setUp(self):
        pass

    def runTest(self):
        # Resolved at call time, rather than imported at module load time:
        # pgadmin.authenticate.oauth2 can be re-imported after this module
        # is loaded, which would leave a module-level import here bound to a
        # stale module object whose globals patch('...session', ...) below
        # wouldn't reach. import_module returns the module that is already
        # in sys.modules when there is one, and imports it otherwise, so
        # this also works when nothing else has loaded it (in desktop mode
        # the auth source registry doesn't).
        oauth2_module = importlib.import_module('pgadmin.authenticate.oauth2')
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

        # Left over from an earlier login with a provider that had one.
        fake_session = {'oauth2_logout_url': 'https://idp.example.com/out'}

        with self.app.app_context(), \
                patch.object(auth, '_authorize_access_token',
                             return_value={'access_token': 'tok'}), \
                patch.object(auth, '_is_oidc_provider',
                             return_value=False), \
                patch('pgadmin.authenticate.oauth2.session', fake_session):
            profile = auth.get_user_profile()

        # Pre-fix, the None endpoint was handed straight to client.get(), so
        # nothing raised: the MagicMock just returned a mock profile. It is
        # these two assertions, rather than an exception, that prove the
        # guard skips the call.
        self.assertEqual(profile, {})
        mock_client.get.assert_not_called()
        # OAUTH2_LOGOUT_URL is absent here, so the stale URL must not
        # survive to be used by the next logout.
        self.assertNotIn('oauth2_logout_url', fake_session)
