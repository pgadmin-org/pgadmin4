##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from types import SimpleNamespace
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.authenticate import oauth2


class Oauth2MisplacedConfigTestCase(BaseTestGenerator):
    """
    Verify warn_on_misplaced_oauth2_config() warns only when per-provider
    OAuth2 settings are supplied as top-level configuration variables while
    no provider is actually configured in OAUTH2_CONFIG (issue #10053).
    """

    # The unconfigured default shipped in config.py.
    _DEFAULT_OAUTH2_CONFIG = [{'OAUTH2_NAME': None}]
    _CONFIGURED_OAUTH2_CONFIG = [{'OAUTH2_NAME': 'authentik'}]

    scenarios = [
        ('Misplaced top-level keys with unconfigured OAUTH2_CONFIG warns',
         dict(
             config_attrs={
                 'OAUTH2_CONFIG': _DEFAULT_OAUTH2_CONFIG,
                 'OAUTH2_AUTO_CREATE_USER': True,
                 'OAUTH2_CLIENT_ID': 'redacted',
                 'OAUTH2_SSL_CERT_VERIFICATION': False,
             },
             expect_warning=True,
             expect_keys=['OAUTH2_CLIENT_ID', 'OAUTH2_SSL_CERT_VERIFICATION'],
         )),
        ('Misplaced top-level keys with a configured provider stays quiet',
         dict(
             config_attrs={
                 'OAUTH2_CONFIG': _CONFIGURED_OAUTH2_CONFIG,
                 'OAUTH2_AUTO_CREATE_USER': True,
                 'OAUTH2_CLIENT_ID': 'redacted',
             },
             expect_warning=False,
             expect_keys=None,
         )),
        ('Only legitimate top-level OAuth2 settings stays quiet',
         dict(
             config_attrs={
                 'OAUTH2_CONFIG': _DEFAULT_OAUTH2_CONFIG,
                 'OAUTH2_AUTO_CREATE_USER': True,
             },
             expect_warning=False,
             expect_keys=None,
         )),
        ('No OAuth2 configuration at all stays quiet',
         dict(
             config_attrs={
                 'OAUTH2_CONFIG': [],
                 'OAUTH2_AUTO_CREATE_USER': True,
             },
             expect_warning=False,
             expect_keys=None,
         )),
    ]

    def runTest(self):
        """Run a single misplaced-config scenario and assert whether a
        startup warning is emitted, and that it lists the expected keys."""
        app = MagicMock()
        app.logger = MagicMock()
        fake_config = SimpleNamespace(**self.config_attrs)

        with patch.object(oauth2, 'config', fake_config):
            oauth2.warn_on_misplaced_oauth2_config(app)

        if not self.expect_warning:
            app.logger.warning.assert_not_called()
            return

        app.logger.warning.assert_called_once()
        # The misplaced keys are interpolated into the message as the
        # single positional argument after the format string.
        args = app.logger.warning.call_args.args
        self.assertEqual(len(args), 2)
        listed = args[1]
        for key in self.expect_keys:
            self.assertIn(key, listed)
