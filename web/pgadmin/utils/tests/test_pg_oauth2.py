##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for pgAdmin PostgreSQL OAuth bearer-token support."""

import base64
import ctypes
import unittest
from urllib.parse import parse_qs
from unittest.mock import MagicMock, Mock, patch, create_autospec
from pgadmin.utils.route import BaseTestGenerator

from contextlib import ExitStack

from flask import Flask, session
from pgadmin.utils import pg_oauth2

from authlib.integrations.flask_client.apps import FlaskOAuth2App

ISSUER = 'https://keycloak.example.test/realms/postgres'


class _OAuthUnitTestMixin:
    """Run each OAuth unit test as a separate regression scenario."""

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

        cls.scenarios = [
            (name[5:], {'case_method': name})
            for name in sorted(dir(cls))
            if name.startswith('case_') and callable(getattr(cls, name))
        ]

    def setUp(self):
        # These tests mock database connections.
        unittest.TestCase.setUp(self)

    def runTest(self):
        getattr(self, self.case_method)()


class TestOAuthTokenContext(
        _OAuthUnitTestMixin, BaseTestGenerator):
    """Test propagation of tokens through ContextVar."""

    def setUp(self):
        self.token_handle = pg_oauth2._oauth_token.set(None)

    def tearDown(self):
        pg_oauth2._oauth_token.reset(self.token_handle)

    def case_context_sets_and_restores_token(self):
        self.assertIsNone(pg_oauth2._oauth_token.get())

        with pg_oauth2.oauth_token_context('access-token'):
            self.assertEqual(
                pg_oauth2._oauth_token.get(),
                'access-token'
            )

        self.assertIsNone(pg_oauth2._oauth_token.get())

    def case_context_restores_existing_token(self):
        existing_handle = pg_oauth2._oauth_token.set(
            'existing-token'
        )

        try:
            with pg_oauth2.oauth_token_context('temporary-token'):
                self.assertEqual(
                    pg_oauth2._oauth_token.get(),
                    'temporary-token'
                )

            self.assertEqual(
                pg_oauth2._oauth_token.get(),
                'existing-token'
            )
        finally:
            pg_oauth2._oauth_token.reset(existing_handle)

    def case_nested_contexts_restore_previous_token(self):
        with pg_oauth2.oauth_token_context('outer-token'):
            self.assertEqual(
                pg_oauth2._oauth_token.get(),
                'outer-token'
            )

            with pg_oauth2.oauth_token_context('inner-token'):
                self.assertEqual(
                    pg_oauth2._oauth_token.get(),
                    'inner-token'
                )

            self.assertEqual(
                pg_oauth2._oauth_token.get(),
                'outer-token'
            )

        self.assertIsNone(pg_oauth2._oauth_token.get())

    def case_context_restores_token_when_exception_is_raised(self):
        with self.assertRaisesRegex(RuntimeError, 'test error'):
            with pg_oauth2.oauth_token_context('access-token'):
                raise RuntimeError('test error')

        self.assertIsNone(pg_oauth2._oauth_token.get())


class TestOAuthHook(
        _OAuthUnitTestMixin, BaseTestGenerator):
    """Test the ctypes libpq OAuth callback."""

    def setUp(self):
        self.token_handle = pg_oauth2._oauth_token.set(None)

        self.previous_hook = pg_oauth2._previous_hook
        pg_oauth2._previous_hook = None

        self.previous_token_buffers = dict(
            pg_oauth2._token_buffers
        )
        pg_oauth2._token_buffers.clear()

    def tearDown(self):
        pg_oauth2._token_buffers.clear()
        pg_oauth2._token_buffers.update(
            self.previous_token_buffers
        )

        pg_oauth2._previous_hook = self.previous_hook
        pg_oauth2._oauth_token.reset(self.token_handle)

    @staticmethod
    def _make_request():
        request = pg_oauth2.PGoauthBearerRequest()
        request_pointer = ctypes.pointer(request)
        data = ctypes.cast(
            request_pointer,
            ctypes.c_void_p
        )

        return request, request_pointer, data

    def case_non_bearer_request_delegates_to_previous_hook(self):
        previous_hook = Mock(return_value=73)
        pg_oauth2._previous_hook = previous_hook

        result = pg_oauth2._oauth_hook(
            0,
            None,
            None
        )

        self.assertEqual(result, 73)
        previous_hook.assert_called_once_with(
            0,
            None,
            None
        )

    def case_non_bearer_request_returns_zero_without_previous_hook(self):
        result = pg_oauth2._oauth_hook(
            0,
            None,
            None
        )

        self.assertEqual(result, 0)

    def case_missing_token_delegates_to_previous_hook(self):
        previous_hook = Mock(return_value=41)
        pg_oauth2._previous_hook = previous_hook

        result = pg_oauth2._oauth_hook(
            pg_oauth2.PQAUTHDATA_OAUTH_BEARER_TOKEN,
            None,
            None
        )

        self.assertEqual(result, 41)
        previous_hook.assert_called_once_with(
            pg_oauth2.PQAUTHDATA_OAUTH_BEARER_TOKEN,
            None,
            None
        )

    def case_missing_token_returns_zero_without_previous_hook(self):
        result = pg_oauth2._oauth_hook(
            pg_oauth2.PQAUTHDATA_OAUTH_BEARER_TOKEN,
            None,
            None
        )

        self.assertEqual(result, 0)

    def case_bearer_request_receives_token(self):
        previous_hook = Mock(return_value=51)
        pg_oauth2._previous_hook = previous_hook

        request, request_pointer, data = self._make_request()

        with pg_oauth2.oauth_token_context('test-access-token'):
            result = pg_oauth2._oauth_hook(
                pg_oauth2.PQAUTHDATA_OAUTH_BEARER_TOKEN,
                None,
                data
            )

        self.assertEqual(result, 1)
        self.assertEqual(request.token, b'test-access-token')
        self.assertIsNone(request.async_)
        self.assertIsNotNone(request.cleanup)

        request_address = ctypes.addressof(request)
        self.assertIn(request_address, pg_oauth2._token_buffers)

        previous_hook.assert_not_called()

        # Keep the ctypes pointer alive for the whole test.
        self.assertIsNotNone(request_pointer)

    def case_cleanup_removes_retained_token_buffer(self):
        request, request_pointer, data = self._make_request()

        with pg_oauth2.oauth_token_context(
                'test-access-token'):
            result = pg_oauth2._oauth_hook(
                pg_oauth2.PQAUTHDATA_OAUTH_BEARER_TOKEN,
                None,
                data
            )

        self.assertEqual(result, 1)

        request_address = ctypes.addressof(request)

        self.assertIn(
            request_address,
            pg_oauth2._token_buffers
        )

        pg_oauth2._oauth_cleanup(None, data)

        self.assertNotIn(
            request_address,
            pg_oauth2._token_buffers
        )

        # Keep request_pointer alive until cleanup has completed.
        self.assertIsNotNone(request_pointer)

    def case_previous_hook_exception_returns_minus_one(self):
        """
        Never allow an exception from the previous libpq hook to cross
        the native callback boundary.
        """
        previous_hook = Mock(
            side_effect=RuntimeError('previous hook failed')
        )
        pg_oauth2._previous_hook = previous_hook

        result = pg_oauth2._oauth_hook(
            0,
            None,
            None
        )

        self.assertEqual(result, -1)
        previous_hook.assert_called_once_with(
            0,
            None,
            None
        )

    def case_bearer_hook_internal_failure_returns_minus_one(self):
        """
        Never allow an exception raised while populating the bearer
        request to cross the native callback boundary.
        """
        previous_hook = Mock(return_value=51)
        pg_oauth2._previous_hook = previous_hook

        request, request_pointer, data = self._make_request()

        # An access token must be a string. This deliberately supplies a
        # malformed value so token.encode() raises inside the callback.
        with pg_oauth2.oauth_token_context(123):
            result = pg_oauth2._oauth_hook(
                pg_oauth2.PQAUTHDATA_OAUTH_BEARER_TOKEN,
                None,
                data
            )

        self.assertEqual(result, -1)
        self.assertIsNone(request.token)
        self.assertNotIn(
            ctypes.addressof(request),
            pg_oauth2._token_buffers
        )

        # Once pgAdmin chooses to handle a bearer request, an internal
        # failure must not invoke the previous hook afterward.
        previous_hook.assert_not_called()

        # Keep the ctypes allocation alive for the complete callback.
        self.assertIsNotNone(request_pointer)

    def case_none_context_clears_and_restores_existing_token(self):
        with pg_oauth2.oauth_token_context('existing-token'):
            with pg_oauth2.oauth_token_context(None):
                self.assertIsNone(pg_oauth2._oauth_token.get())

            self.assertEqual(
                pg_oauth2._oauth_token.get(),
                'existing-token',
            )

        self.assertIsNone(pg_oauth2._oauth_token.get())


class TestGetCurrentOAuthClient(
        _OAuthUnitTestMixin, BaseTestGenerator):
    """Test lookup of the Authlib client for the current OAuth provider."""

    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            SECRET_KEY='pg-oauth2-unit-test-secret',
            TESTING=True,
        )

    @patch('pgadmin.authenticate.get_auth_sources')
    def case_unknown_provider_raises_error(self, get_auth_sources):
        oauth_source = MagicMock()
        oauth_source.oauth2_clients = {}
        get_auth_sources.return_value = oauth_source

        with self.app.test_request_context('/'):
            session['oauth2_provider'] = 'unknown-provider'

            with self.assertRaises(pg_oauth2.OAuthTokenError):
                pg_oauth2._get_current_oauth_client()

    @patch('pgadmin.authenticate.get_auth_sources')
    def case_returns_registered_oauth_client(self, get_auth_sources):
        oauth_client = MagicMock()
        oauth_source = MagicMock()
        oauth_source.oauth2_clients = {
            'keycloak': oauth_client,
        }
        get_auth_sources.return_value = oauth_source

        with self.app.test_request_context('/'):
            session['oauth2_provider'] = 'keycloak'

            result = pg_oauth2._get_current_oauth_client()

        self.assertIs(result, oauth_client)


class TestGetPgAdminOAuthToken(
        _OAuthUnitTestMixin, BaseTestGenerator):
    """Test pgAdmin access-token retrieval and refresh."""

    PROVIDER_NAME = 'keycloak'

    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            SECRET_KEY='pg-oauth2-unit-test-secret',
            TESTING=True,
        )

        self.oauth_source = Mock()
        self.oauth_source.oauth2_config = {
            self.PROVIDER_NAME: {
                "OAUTH2_CLIENT_AUTH_METHOD": "client_secret",
            },
        }

        source_patch = patch(
            "pgadmin.authenticate.get_auth_sources",
            return_value=self.oauth_source,
        )
        source_patch.start()
        self.addCleanup(source_patch.stop)

    def _make_oauth_client(self):
        return create_autospec(
            FlaskOAuth2App,
            instance=True,
            spec_set=True
        )

    def case_returns_none_without_request_context(self):
        self.assertIsNone(
            pg_oauth2._get_pgadmin_oauth_token()
        )

    def case_returns_none_without_oauth_token(self):
        with self.app.test_request_context('/'):
            self.assertIsNone(
                pg_oauth2._get_pgadmin_oauth_token()
            )

    def case_returns_none_when_token_data_is_not_dictionary(self):
        with self.app.test_request_context('/'):
            session['oauth2_token'] = 'not-a-dictionary'

            self.assertIsNone(
                pg_oauth2._get_pgadmin_oauth_token()
            )

    def case_returns_none_when_access_token_is_missing(self):
        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'refresh_token': 'refresh-token',
            }

            self.assertIsNone(
                pg_oauth2._get_pgadmin_oauth_token()
            )

    def case_returns_current_unexpired_access_token(self):
        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'access_token': 'current-access-token',
                'refresh_token': 'refresh-token',
                'expires_at': 2000,
            }

            with patch(
                'pgadmin.utils.pg_oauth2.time.time',
                return_value=1000
            ):
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertEqual(
                result,
                'current-access-token'
            )

    @patch(
        'pgadmin.utils.pg_oauth2._get_current_oauth_client'
    )
    def case_refreshes_expired_access_token(self, get_oauth_client):
        oauth_client = self._make_oauth_client()
        oauth_client.fetch_access_token.return_value = {
            'access_token': 'refreshed-access-token',
            'refresh_token': 'new-refresh-token',
        }

        get_oauth_client.return_value = oauth_client

        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'access_token': 'expired-access-token',
                'refresh_token': 'original-refresh-token',
                'expires_at': 999,
                'token_type': 'Bearer',
            }
            session['oauth2_provider'] = self.PROVIDER_NAME

            with patch(
                'pgadmin.utils.pg_oauth2.time.time',
                return_value=1000
            ):
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertEqual(result, 'refreshed-access-token')

            oauth_client.fetch_access_token.assert_called_once_with(
                grant_type='refresh_token',
                refresh_token='original-refresh-token'
            )

    @patch(
        'pgadmin.utils.pg_oauth2._get_current_oauth_client'
    )
    def case_refresh_failure_returns_none(self, get_oauth_client):
        oauth_client = self._make_oauth_client()
        oauth_client.fetch_access_token.side_effect = RuntimeError(
            'token endpoint unavailable'
        )
        get_oauth_client.return_value = oauth_client

        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'access_token': 'expired-access-token',
                'refresh_token': 'refresh-token',
                'expires_at': 999,
                'token_type': 'Bearer',
            }
            session['oauth2_provider'] = self.PROVIDER_NAME

            with patch(
                'pgadmin.utils.pg_oauth2.time.time',
                return_value=1000
            ):
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertIsNone(result)
            oauth_client.fetch_access_token.assert_called_once_with(
                grant_type='refresh_token',
                refresh_token='refresh-token'
            )

    @patch(
        'pgadmin.utils.pg_oauth2._get_current_oauth_client'
    )
    def case_expired_token_without_refresh_token_returns_none(
            self, get_oauth_client):
        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'access_token': 'expired-access-token',
                'expires_at': 999,
                'token_type': 'Bearer',
            }
            session['oauth2_provider'] = self.PROVIDER_NAME

            with patch(
                'pgadmin.utils.pg_oauth2.time.time',
                return_value=1000
            ):
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertIsNone(result)
            get_oauth_client.assert_not_called()

    @patch(
        'pgadmin.utils.pg_oauth2._get_current_oauth_client'
    )
    def case_refreshes_access_token_within_expiry_safety_window(
            self, get_oauth_client):
        """
        Refresh a token that has not expired yet but will expire within
        the 30-second safety window.
        """
        oauth_client = self._make_oauth_client()
        oauth_client.fetch_access_token.return_value = {
            'access_token': 'refreshed-access-token',
            'refresh_token': 'refreshed-refresh-token',
            'expires_at': 3000,
            'token_type': 'Bearer',
        }
        get_oauth_client.return_value = oauth_client

        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'access_token': 'nearly-expired-access-token',
                'refresh_token': 'original-refresh-token',
                'expires_at': 1020,
                'token_type': 'Bearer',
            }
            session['oauth2_provider'] = self.PROVIDER_NAME

            with patch(
                'pgadmin.utils.pg_oauth2.time.time',
                return_value=1000
            ):
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertEqual(result, 'refreshed-access-token')
            self.assertEqual(
                session['oauth2_token']['access_token'],
                'refreshed-access-token'
            )

            oauth_client.fetch_access_token.assert_called_once_with(
                grant_type='refresh_token',
                refresh_token='original-refresh-token'
            )

    def case_returns_access_token_without_expiration(self):
        """
        Return an access token when the provider did not supply expires_at.
        """
        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'access_token': 'access-token-without-expiration',
                'refresh_token': 'refresh-token',
                'token_type': 'Bearer',
            }

            with patch(
                    'pgadmin.utils.pg_oauth2.'
                    '_refresh_pgadmin_oauth_token'
            ) as refresh_mock:
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertEqual(
                result,
                'access-token-without-expiration'
            )
            refresh_mock.assert_not_called()

    @patch(
        'pgadmin.utils.pg_oauth2._get_current_oauth_client'
    )
    def case_refresh_preserves_existing_refresh_token(
            self, get_oauth_client):
        """
        Preserve the old refresh token when the provider returns only a
        new access token.
        """
        oauth_client = self._make_oauth_client()
        oauth_client.fetch_access_token.return_value = {
            'access_token': 'refreshed-access-token',
            'expires_at': 3000,
            'token_type': 'Bearer',
        }
        get_oauth_client.return_value = oauth_client

        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'access_token': 'expired-access-token',
                'refresh_token': 'original-refresh-token',
                'expires_at': 900,
                'token_type': 'Bearer',
            }
            session['oauth2_provider'] = self.PROVIDER_NAME

            with patch(
                'pgadmin.utils.pg_oauth2.time.time',
                return_value=1000
            ):
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertEqual(result, 'refreshed-access-token')
            self.assertEqual(
                session['oauth2_token']['refresh_token'],
                'original-refresh-token'
            )

            oauth_client.fetch_access_token.assert_called_once_with(
                grant_type='refresh_token',
                refresh_token='original-refresh-token'
            )

    def case_expired_token_without_provider_returns_none(self):
        """
        An expired token cannot be refreshed when the OAuth provider
        identity is missing from the session.
        """
        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'access_token': 'expired-access-token',
                'refresh_token': 'refresh-token',
                'expires_at': 900,
                'token_type': 'Bearer',
            }

            with patch(
                'pgadmin.utils.pg_oauth2.time.time',
                return_value=1000
            ):
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertIsNone(result)

    @patch(
        'pgadmin.utils.pg_oauth2._get_current_oauth_client',
        side_effect=pg_oauth2.OAuthTokenError(
            'Unknown OAuth provider.'
        )
    )
    def case_expired_token_returns_none_when_client_lookup_fails(
            self, get_oauth_client):
        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'access_token': 'expired-access-token',
                'refresh_token': 'refresh-token',
                'expires_at': 900,
                'token_type': 'Bearer',
            }
            session['oauth2_provider'] = 'unknown-provider'

            with patch(
                'pgadmin.utils.pg_oauth2.time.time',
                return_value=1000
            ):
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertIsNone(result)
            get_oauth_client.assert_called_once_with()

    @patch(
        'pgadmin.utils.pg_oauth2._get_current_oauth_client'
    )
    def case_refresh_returns_none_for_non_dictionary_response(
            self, get_oauth_client):
        """
        Reject a malformed refresh response instead of attempting to use
        or store it as an OAuth token.
        """
        oauth_client = self._make_oauth_client()
        oauth_client.fetch_access_token.return_value = (
            'invalid-token-response'
        )
        get_oauth_client.return_value = oauth_client

        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'access_token': 'expired-access-token',
                'refresh_token': 'original-refresh-token',
                'expires_at': 900,
                'token_type': 'Bearer',
            }
            session['oauth2_provider'] = self.PROVIDER_NAME

            with patch(
                'pgadmin.utils.pg_oauth2.time.time',
                return_value=1000
            ):
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertIsNone(result)
            self.assertEqual(
                session['oauth2_token']['access_token'],
                'expired-access-token'
            )

            oauth_client.fetch_access_token.assert_called_once_with(
                grant_type='refresh_token',
                refresh_token='original-refresh-token'
            )

    @patch(
        'pgadmin.utils.pg_oauth2._get_current_oauth_client'
    )
    def case_refresh_returns_none_when_access_token_is_missing(
            self, get_oauth_client):
        """
        Reject a syntactically valid refresh response that does not contain
        a new access token.
        """
        oauth_client = self._make_oauth_client()
        oauth_client.fetch_access_token.return_value = {
            'refresh_token': 'new-refresh-token',
            'expires_at': 3000,
            'token_type': 'Bearer',
        }
        get_oauth_client.return_value = oauth_client

        with self.app.test_request_context('/'):
            session['oauth2_token'] = {
                'access_token': 'expired-access-token',
                'refresh_token': 'original-refresh-token',
                'expires_at': 900,
                'token_type': 'Bearer',
            }
            session['oauth2_provider'] = self.PROVIDER_NAME

            with patch(
                'pgadmin.utils.pg_oauth2.time.time',
                return_value=1000
            ):
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertIsNone(result)
            self.assertEqual(
                session['oauth2_token']['access_token'],
                'expired-access-token'
            )

            oauth_client.fetch_access_token.assert_called_once_with(
                grant_type='refresh_token',
                refresh_token='original-refresh-token'
            )

    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    def case_refresh_does_not_reuse_previous_token_expiry(
            self, get_oauth_client):
        # The payload is {"exp": 3000}. Signature validation is not
        # involved: the implementation only reads an expiration hint.
        refreshed_access_token = (
            'header.eyJleHAiOiAzMDAwfQ.signature'
        )

        oauth_client = self._make_oauth_client()
        oauth_client.fetch_access_token.return_value = {
            'access_token': refreshed_access_token,
            'token_type': 'Bearer',
        }
        get_oauth_client.return_value = oauth_client

        with self.app.test_request_context('/'):
            session['oauth2_provider'] = self.PROVIDER_NAME
            session['oauth2_token'] = {
                'access_token': 'expired-access-token',
                'refresh_token': 'original-refresh-token',
                'expires_at': 999,
                'expires_in': 60,
                'token_type': 'Bearer',
            }

            with patch(
                    'pgadmin.utils.pg_oauth2.time.time',
                    return_value=1000):
                first_token = pg_oauth2._get_pgadmin_oauth_token()
                second_token = pg_oauth2._get_pgadmin_oauth_token()

            self.assertEqual(first_token, refreshed_access_token)
            self.assertEqual(second_token, refreshed_access_token)
            self.assertEqual(
                pg_oauth2._get_token_expiry(session['oauth2_token']),
                3000,
            )
            self.assertEqual(
                session['oauth2_token']['refresh_token'],
                'original-refresh-token',
            )
            self.assertNotIn('expires_in', session['oauth2_token'])

        oauth_client.fetch_access_token.assert_called_once_with(
            grant_type='refresh_token',
            refresh_token='original-refresh-token',
        )

    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    def case_workload_identity_refresh_is_explicitly_rejected(
            self, get_oauth_client):
        self.oauth_source.oauth2_config[self.PROVIDER_NAME][
            'OAUTH2_CLIENT_AUTH_METHOD'
        ] = 'workload_identity'

        oauth_client = self._make_oauth_client()
        get_oauth_client.return_value = oauth_client

        # Cover both expiration and the early-refresh window.
        for expires_at in (999, 1020):
            with self.subTest(expires_at=expires_at):
                original_token = {
                    'access_token': 'existing-access-token',
                    'refresh_token': 'existing-refresh-token',
                    'expires_at': expires_at,
                    'token_type': 'Bearer',
                }

                with self.app.test_request_context('/'):
                    session['oauth2_provider'] = self.PROVIDER_NAME
                    session['oauth2_token'] = dict(original_token)
                    session.modified = False

                    with patch(
                            'pgadmin.utils.pg_oauth2.time.time',
                            return_value=1000):
                        with self.assertRaisesRegex(
                                pg_oauth2.OAuthRefreshUnsupportedError,
                                'Automatic OAuth token refresh for '
                                'workload-identity login is not supported'):
                            pg_oauth2._get_pgadmin_oauth_token()

                    self.assertEqual(
                        session['oauth2_token'],
                        original_token,
                    )
                    self.assertFalse(session.modified)

        oauth_client.fetch_access_token.assert_not_called()

    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    def case_workload_identity_can_use_token_before_refresh_window(
            self, get_oauth_client):
        self.oauth_source.oauth2_config[self.PROVIDER_NAME][
            'OAUTH2_CLIENT_AUTH_METHOD'
        ] = 'workload_identity'

        original_token = {
            'access_token': 'current-access-token',
            'refresh_token': 'existing-refresh-token',
            'expires_at': 2000,
            'token_type': 'Bearer',
        }

        with self.app.test_request_context('/'):
            session['oauth2_provider'] = self.PROVIDER_NAME
            session['oauth2_token'] = dict(original_token)
            session.modified = False

            with patch(
                    'pgadmin.utils.pg_oauth2.time.time',
                    return_value=1000):
                result = pg_oauth2._get_pgadmin_oauth_token()

            self.assertEqual(result, 'current-access-token')
            self.assertEqual(session['oauth2_token'], original_token)
            self.assertFalse(session.modified)

        get_oauth_client.assert_not_called()


class TestExchangeOAuthAccessToken(
        _OAuthUnitTestMixin, BaseTestGenerator):
    """Test OAuth access-token exchange for PostgreSQL."""

    TOKEN_ENDPOINT = (
        'https://keycloak.example.test/realms/postgres/'
        'protocol/openid-connect/token'
    )

    DISCOVERED_TOKEN_ENDPOINT = (
        'https://keycloak.example.test/discovered/token'
    )

    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            SECRET_KEY='pg-oauth2-unit-test-secret',
            TESTING=True,
        )

    @staticmethod
    def _make_oauth_client(
            access_token_url=None,
            verify=True):
        oauth_client = MagicMock()
        oauth_client.client_id = 'pgadmin-client'
        oauth_client.client_secret = 'pgadmin-client-secret'
        oauth_client.access_token_url = access_token_url
        oauth_client.client_kwargs = {
            'verify': verify,
        }
        oauth_client.load_server_metadata.return_value = {
            'issuer': ISSUER,
            'token_endpoint': (
                TestExchangeOAuthAccessToken.DISCOVERED_TOKEN_ENDPOINT
            ),
        }

        return oauth_client

    @staticmethod
    def _make_response(status_code=200, token_data=None):
        response = MagicMock()
        response.status_code = status_code
        response.json.return_value = token_data
        response.__enter__.return_value = response
        response.__exit__.return_value = False

        return response

    def case_exchange_requires_request_context(self):
        with self.assertRaisesRegex(
                pg_oauth2.OAuthTokenExchangeError,
                'pgAdmin login session'):
            pg_oauth2._exchange_oauth_access_token(
                'postgres-cluster',
                'openid',
                ISSUER,
            )

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_exchange_returns_access_token(
            self, get_token, get_oauth_client, post):
        get_token.return_value = 'subject-access-token'

        oauth_client = self._make_oauth_client(
            access_token_url=self.TOKEN_ENDPOINT
        )
        get_oauth_client.return_value = oauth_client

        post.return_value = self._make_response(
            token_data={
                'access_token': 'exchanged-access-token',
                'token_type': 'Bearer',
            }
        )

        with self.app.test_request_context('/'):
            result = pg_oauth2._exchange_oauth_access_token(
                'postgres-cluster',
                'openid',
                ISSUER,
            )

        self.assertEqual(result, 'exchanged-access-token')

        get_token.assert_called_once_with()
        get_oauth_client.assert_called_once_with()
        post.assert_called_once()

        args, kwargs = post.call_args

        self.assertEqual(args[0], self.TOKEN_ENDPOINT)

        self.assertEqual(
            kwargs['data'],
            {
                'audience': 'postgres-cluster',
                'grant_type': (
                    'urn:ietf:params:oauth:grant-type:token-exchange'
                ),
                'subject_token': 'subject-access-token',
                'subject_token_type': (
                    'urn:ietf:params:oauth:token-type:access_token'
                ),
                'scope': 'openid',
            }
        )

        self.assertEqual(
            kwargs['headers'],
            {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        )

        prepared = pg_oauth2.requests.Request(
            'POST',
            args[0],
            data=kwargs['data'],
            headers=kwargs['headers'],
            auth=kwargs['auth'],
        ).prepare()

        expected_credentials = base64.b64encode(
            b'pgadmin-client:pgadmin-client-secret'
        ).decode('ascii')

        self.assertEqual(
            prepared.headers['Authorization'],
            'Basic ' + expected_credentials,
        )
        self.assertTrue(kwargs['verify'])
        self.assertEqual(kwargs['timeout'], (5, 30))
        self.assertFalse(kwargs['allow_redirects'])

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_client_secret_post_authenticates_pgadmin_for_database_audience(
            self, get_token, get_oauth_client, post):
        oauth_client = self._make_oauth_client(self.TOKEN_ENDPOINT)
        oauth_client.client_kwargs['token_endpoint_auth_method'] = (
            'client_secret_post'
        )
        oauth_client.client_secret = 'secret+with&reserved=characters'
        get_oauth_client.return_value = oauth_client
        get_token.return_value = 'subject-access-token'
        post.return_value = self._make_response(token_data={
            'access_token': 'exchanged-access-token',
            'token_type': 'Bearer',
        })

        with self.app.test_request_context('/'):
            result = pg_oauth2.get_postgres_oauth_token(
                'exchange', 'postgres-cluster', 'openid', ISSUER,
            )

        self.assertEqual(result, 'exchanged-access-token')
        get_token.assert_called_once_with()
        post.assert_called_once()
        args, kwargs = post.call_args

        # Exercise the real Authlib authentication object. Inspecting
        # request_data alone would miss the credentials it adds later.
        prepared = pg_oauth2.requests.Request(
            'POST', args[0], data=kwargs['data'],
            headers=kwargs['headers'], auth=kwargs['auth'],
        ).prepare()
        body = prepared.body
        if isinstance(body, bytes):
            body = body.decode('utf-8')
        fields = parse_qs(body)

        self.assertEqual(prepared.url, self.TOKEN_ENDPOINT)
        self.assertNotIn('Authorization', prepared.headers)
        self.assertEqual(fields['client_id'], ['pgadmin-client'])
        self.assertEqual(
            fields['client_secret'], [oauth_client.client_secret],
        )
        self.assertEqual(fields['audience'], ['postgres-cluster'])
        self.assertEqual(fields['subject_token'], ['subject-access-token'])
        self.assertEqual(fields['scope'], ['openid'])

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._refresh_pgadmin_oauth_token')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    def _assert_exchange_auth_rejected(
            self, oauth_client, message, get_client, get_token,
            refresh_token, post):
        get_client.return_value = oauth_client
        get_token.return_value = 'subject-access-token'

        with self.app.test_request_context('/'):
            with self.assertRaisesRegex(
                    pg_oauth2.OAuthTokenExchangeError, message):
                pg_oauth2.get_postgres_oauth_token(
                    'exchange', 'postgres-cluster', 'openid', ISSUER,
                )

        get_token.assert_not_called()
        refresh_token.assert_not_called()
        post.assert_not_called()

    def case_exchange_rejects_missing_pgadmin_client_credentials(self):
        for field in ('client_id', 'client_secret'):
            for value in (None, '', '   '):
                with self.subTest(field=field, value=value):
                    oauth_client = self._make_oauth_client(self.TOKEN_ENDPOINT)
                    setattr(oauth_client, field, value)
                    self._assert_exchange_auth_rejected(
                        oauth_client, 'client ID and client secret',
                    )

    def case_exchange_rejects_unauthenticated_client(self):
        oauth_client = self._make_oauth_client(self.TOKEN_ENDPOINT)
        oauth_client.client_kwargs['token_endpoint_auth_method'] = 'none'
        self._assert_exchange_auth_rejected(
            oauth_client,
            'supports client_secret_basic or client_secret_post',
        )

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_exchange_uses_discovered_token_endpoint(
            self, get_token, get_oauth_client, post):
        get_token.return_value = 'subject-access-token'

        oauth_client = self._make_oauth_client(
            access_token_url=None
        )
        get_oauth_client.return_value = oauth_client

        post.return_value = self._make_response(
            token_data={
                'access_token': 'exchanged-access-token',
                'token_type': 'Bearer',
            }
        )

        with self.app.test_request_context('/'):
            result = pg_oauth2._exchange_oauth_access_token(
                'postgres-cluster',
                'openid',
                ISSUER,
            )

        self.assertEqual(result, 'exchanged-access-token')

        oauth_client.load_server_metadata.assert_called_once_with()
        post.assert_called_once()

        args, _ = post.call_args
        self.assertEqual(
            args[0],
            self.DISCOVERED_TOKEN_ENDPOINT
        )

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_exchange_fails_when_provider_metadata_cannot_be_loaded(
            self, get_token, get_oauth_client, post):
        get_token.return_value = 'subject-access-token'

        oauth_client = self._make_oauth_client(
            access_token_url=None
        )
        oauth_client.load_server_metadata.side_effect = RuntimeError(
            'metadata unavailable'
        )
        get_oauth_client.return_value = oauth_client

        with self.app.test_request_context('/'):
            with self.assertRaises(
                    pg_oauth2.OAuthTokenExchangeError):
                pg_oauth2._exchange_oauth_access_token(
                    'postgres-cluster',
                    'openid',
                    ISSUER,
                )

        oauth_client.load_server_metadata.assert_called_once_with()
        post.assert_not_called()

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_exchange_rejects_disabled_tls_verification(
            self, get_token, get_oauth_client, post):
        oauth_client = self._make_oauth_client(
            access_token_url=self.TOKEN_ENDPOINT,
            verify=False,
        )
        get_oauth_client.return_value = oauth_client

        with self.app.test_request_context('/'):
            with self.assertRaises(
                    pg_oauth2.OAuthTokenExchangeError):
                pg_oauth2._exchange_oauth_access_token(
                    'postgres-cluster',
                    'openid',
                    ISSUER,
                )

        get_oauth_client.assert_called_once_with()
        get_token.assert_not_called()
        oauth_client.load_server_metadata.assert_not_called()
        post.assert_not_called()

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_exchange_translates_request_timeout(
            self, get_token, get_oauth_client, post):
        get_token.return_value = 'subject-access-token'

        get_oauth_client.return_value = self._make_oauth_client(
            access_token_url=self.TOKEN_ENDPOINT
        )

        post.side_effect = pg_oauth2.requests.exceptions.Timeout(
            'request timed out'
        )

        with self.app.test_request_context('/'):
            with self.assertRaisesRegex(
                    pg_oauth2.OAuthTokenExchangeError,
                    'timed out'):
                pg_oauth2._exchange_oauth_access_token(
                    'postgres-cluster',
                    'openid',
                    ISSUER,
                )

        post.assert_called_once()

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_exchange_rejects_oauth_error_response(
            self, get_token, get_oauth_client, post):
        get_token.return_value = 'subject-access-token'

        get_oauth_client.return_value = self._make_oauth_client(
            access_token_url=self.TOKEN_ENDPOINT
        )

        post.return_value = self._make_response(
            status_code=400,
            token_data={
                'error': 'invalid_grant',
            }
        )

        with self.app.test_request_context('/'):
            with self.assertRaisesRegex(
                    pg_oauth2.OAuthTokenExchangeError,
                    'invalid_grant'):
                pg_oauth2._exchange_oauth_access_token(
                    'postgres-cluster',
                    'openid',
                    ISSUER,
                )

        post.assert_called_once()

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_exchange_rejects_non_dictionary_response(
            self, get_token, get_oauth_client, post):
        get_token.return_value = 'subject-access-token'

        get_oauth_client.return_value = self._make_oauth_client(
            access_token_url=self.TOKEN_ENDPOINT
        )

        post.return_value = self._make_response(
            token_data='invalid-response'
        )

        with self.app.test_request_context('/'):
            with self.assertRaises(
                    pg_oauth2.OAuthTokenExchangeError):
                pg_oauth2._exchange_oauth_access_token(
                    'postgres-cluster',
                    'openid',
                    ISSUER,
                )

        post.assert_called_once()

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_exchange_rejects_invalid_access_token(
            self, get_token, get_oauth_client, post):
        get_token.return_value = 'subject-access-token'

        get_oauth_client.return_value = self._make_oauth_client(
            access_token_url=self.TOKEN_ENDPOINT
        )

        invalid_tokens = (
            None,
            '',
            '   ',
            'invalid\0token',
        )

        with self.app.test_request_context('/'):
            for access_token in invalid_tokens:
                with self.subTest(access_token=access_token):
                    post.return_value = self._make_response(
                        token_data={
                            'access_token': access_token,
                            'token_type': 'Bearer',
                        }
                    )

                    with self.assertRaises(
                            pg_oauth2.OAuthTokenExchangeError):
                        pg_oauth2._exchange_oauth_access_token(
                            'postgres-cluster',
                            'openid',
                            ISSUER,
                        )

        self.assertEqual(
            post.call_count,
            len(invalid_tokens)
        )

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_exchange_rejects_non_bearer_token(
            self, get_token, get_oauth_client, post):
        get_token.return_value = 'subject-access-token'

        get_oauth_client.return_value = self._make_oauth_client(
            access_token_url=self.TOKEN_ENDPOINT
        )

        post.return_value = self._make_response(
            token_data={
                'access_token': 'exchanged-access-token',
                'token_type': 'DPoP',
            }
        )

        with self.app.test_request_context('/'):
            with self.assertRaises(
                    pg_oauth2.OAuthTokenExchangeError):
                pg_oauth2._exchange_oauth_access_token(
                    'postgres-cluster',
                    'openid',
                    ISSUER,
                )

        post.assert_called_once()

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_exchange_omits_scope_when_not_configured(
            self, get_token, get_oauth_client, post):
        get_token.return_value = 'subject-access-token'
        get_oauth_client.return_value = self._make_oauth_client(
            access_token_url=self.TOKEN_ENDPOINT,
        )
        post.return_value = self._make_response(
            token_data={
                'access_token': 'exchanged-access-token',
                'token_type': 'Bearer',
            },
        )

        for scope in (None, '', '   '):
            with self.subTest(scope=scope):
                post.reset_mock()

                with self.app.test_request_context('/'):
                    result = pg_oauth2._exchange_oauth_access_token(
                        'postgres-cluster',
                        scope,
                        ISSUER,
                    )

                self.assertEqual(result, 'exchanged-access-token')
                post.assert_called_once()
                self.assertNotIn(
                    'scope',
                    post.call_args.kwargs['data'],
                )

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._get_current_oauth_client')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def case_exchange_uses_configured_scopes(
            self, get_token, get_oauth_client, post):
        get_token.return_value = 'subject-access-token'
        get_oauth_client.return_value = self._make_oauth_client(
            access_token_url=self.TOKEN_ENDPOINT,
        )
        post.return_value = self._make_response(
            token_data={
                'access_token': 'exchanged-access-token',
                'token_type': 'Bearer',
            },
        )

        cases = (
            ('openid', 'openid'),
            ('openid database.read', 'openid database.read'),
            ('  openid  ', 'openid'),
        )

        for configured_scope, expected_scope in cases:
            with self.subTest(scope=configured_scope):
                post.reset_mock()

                with self.app.test_request_context('/'):
                    result = pg_oauth2._exchange_oauth_access_token(
                        'postgres-cluster',
                        configured_scope,
                        ISSUER,
                    )

                self.assertEqual(result, 'exchanged-access-token')
                post.assert_called_once()
                self.assertEqual(
                    post.call_args.kwargs['data']['scope'],
                    expected_scope,
                )


class TestGetPostgresOAuthToken(
        _OAuthUnitTestMixin, BaseTestGenerator):
    """Test selection of the PostgreSQL OAuth token source."""

    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            SECRET_KEY='pg-oauth2-unit-test-secret',
            TESTING=True,
        )

        request_context = self.app.test_request_context('/')
        request_context.push()
        self.addCleanup(request_context.pop)

        self.oauth_client = TestExchangeOAuthAccessToken._make_oauth_client(
            TestExchangeOAuthAccessToken.TOKEN_ENDPOINT,
        )

        client_patch = patch(
            'pgadmin.utils.pg_oauth2._get_current_oauth_client',
            return_value=self.oauth_client,
        )
        client_patch.start()
        self.addCleanup(client_patch.stop)

    @patch('pgadmin.utils.pg_oauth2.requests.post')
    @patch('pgadmin.utils.pg_oauth2._refresh_pgadmin_oauth_token')
    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    def _assert_issuer_rejected(
            self, issuer, message, get_token, refresh_token, post):
        get_token.return_value = 'subject-access-token'
        post.return_value = TestExchangeOAuthAccessToken._make_response(
            token_data={
                'access_token': 'exchanged-access-token',
                'token_type': 'Bearer',
            },
        )

        # Leave issuer validation and the exchange implementation real.
        for mode in ('direct', 'exchange'):
            with self.subTest(mode=mode):
                with self.assertRaisesRegex(
                        pg_oauth2.OAuthTokenError, message):
                    pg_oauth2.get_postgres_oauth_token(
                        mode, 'postgres-cluster', 'openid', issuer,
                    )

        get_token.assert_not_called()
        refresh_token.assert_not_called()
        post.assert_not_called()

    def case_missing_configured_issuer_is_rejected_before_token_access(self):
        for issuer in (None, '', '   '):
            with self.subTest(issuer=issuer):
                self._assert_issuer_rejected(issuer, 'Set oauth_issuer')

    def case_missing_metadata_issuer_is_rejected_before_token_access(self):
        metadata = self.oauth_client.load_server_metadata.return_value
        metadata.pop('issuer')
        self._assert_issuer_rejected(ISSUER, 'metadata contains no issuer')

        for issuer in (None, '', '   '):
            with self.subTest(metadata_issuer=issuer):
                metadata['issuer'] = issuer
                self._assert_issuer_rejected(
                    ISSUER, 'metadata contains no issuer',
                )

    def case_mismatched_issuer_is_rejected_before_token_access(self):
        # A trailing slash is also a mismatch; issuer IDs are exact.
        for issuer in ('https://other.example.test', ISSUER + '/'):
            with self.subTest(issuer=issuer):
                self._assert_issuer_rejected(issuer, 'does not match')

    def case_unavailable_metadata_is_rejected_before_token_access(self):
        self.oauth_client.load_server_metadata.side_effect = RuntimeError(
            'OIDC metadata unavailable',
        )
        self._assert_issuer_rejected(ISSUER, 'Could not load')

    @patch(
        'pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token',
        return_value='pgadmin-access-token'
    )
    def case_direct_mode_returns_pgadmin_access_token(self, get_token):
        result = pg_oauth2.get_postgres_oauth_token(
            'direct',
            'postgres-cluster',
            None,
            ISSUER,
        )

        self.assertEqual(result, 'pgadmin-access-token')
        get_token.assert_called_once_with()

    @patch(
        'pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token',
        return_value=None
    )
    def case_direct_mode_raises_when_pgadmin_token_is_missing(
            self, get_token):
        with self.assertRaisesRegex(
                pg_oauth2.OAuthTokenError,
                'No current pgAdmin OAuth access token is available'):
            pg_oauth2.get_postgres_oauth_token(
                'direct',
                'postgres-cluster',
                None,
                ISSUER,
            )

        get_token.assert_called_once_with()

    @patch(
        'pgadmin.utils.pg_oauth2._exchange_oauth_access_token',
        return_value='exchanged-access-token'
    )
    def case_exchange_mode_returns_exchanged_access_token(self, exchange):
        result = pg_oauth2.get_postgres_oauth_token(
            'exchange',
            'postgres-cluster',
            'openid',
            ISSUER,
        )

        self.assertEqual(result, 'exchanged-access-token')
        exchange.assert_called_once_with('postgres-cluster', 'openid', ISSUER)

    @patch('pgadmin.utils.pg_oauth2._exchange_oauth_access_token')
    def case_exchange_mode_requires_client_id(self, exchange):
        invalid_client_ids = (
            None,
            '',
            '   ',
            'cluster\0name',
        )

        for client_id in invalid_client_ids:
            with self.subTest(client_id=client_id):
                with self.assertRaisesRegex(
                        pg_oauth2.OAuthTokenError,
                        'oauth_client_id'):
                    pg_oauth2.get_postgres_oauth_token(
                        'exchange',
                        client_id,
                        'openid',
                        ISSUER,
                    )

        exchange.assert_not_called()

    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    @patch('pgadmin.utils.pg_oauth2._exchange_oauth_access_token')
    def case_invalid_mode_raises_error(self, exchange, get_token):
        with self.assertRaisesRegex(
                pg_oauth2.OAuthTokenError,
                'Invalid pgAdmin OAuth token mode'):
            pg_oauth2.get_postgres_oauth_token(
                'invalid-mode',
                'postgres-cluster',
                'openid',
                ISSUER,
            )

        get_token.assert_not_called()
        exchange.assert_not_called()

    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    @patch('pgadmin.utils.pg_oauth2._exchange_oauth_access_token')
    def case_exchange_failure_does_not_fall_back_to_direct(
            self, exchange, get_token):
        failure = pg_oauth2.OAuthTokenExchangeError(
            'Token exchange failed.'
        )
        exchange.side_effect = failure

        # A usable login token must not become a fallback.
        get_token.return_value = 'pgadmin-access-token'

        with self.app.test_request_context('/'):
            with self.assertRaises(
                    pg_oauth2.OAuthTokenExchangeError) as raised:
                pg_oauth2.get_postgres_oauth_token(
                    'exchange',
                    'postgres-cluster',
                    'openid',
                    ISSUER,
                )

        self.assertIs(raised.exception, failure)
        exchange.assert_called_once_with(
            'postgres-cluster',
            'openid',
            ISSUER,
        )
        get_token.assert_not_called()


class TestInstallOAuthHook(
        _OAuthUnitTestMixin, BaseTestGenerator):
    """Test installation of the process-global libpq OAuth hook."""

    def setUp(self):
        self.original_libpq = pg_oauth2._libpq
        self.original_hook = pg_oauth2._hook
        self.original_cleanup_hook = pg_oauth2._cleanup_hook
        self.original_previous_hook = pg_oauth2._previous_hook

        pg_oauth2._libpq = None
        pg_oauth2._hook = None
        pg_oauth2._cleanup_hook = None
        pg_oauth2._previous_hook = None

    def tearDown(self):
        pg_oauth2._libpq = self.original_libpq
        pg_oauth2._hook = self.original_hook
        pg_oauth2._cleanup_hook = self.original_cleanup_hook
        pg_oauth2._previous_hook = self.original_previous_hook

    @staticmethod
    def _make_libpq(previous_hook_pointer=0):
        libpq = MagicMock(spec_set=[
            'PQlibVersion',
            'PQgetAuthDataHook',
            'PQsetAuthDataHook',
        ])

        libpq.PQlibVersion.return_value = 180000

        installed_hook_pointer = ctypes.cast(
            pg_oauth2._oauth_hook,
            ctypes.c_void_p
        ).value

        # The first call obtains the previous hook. Some versions of the
        # implementation make a second call to verify installation.
        libpq.PQgetAuthDataHook.side_effect = [
            previous_hook_pointer,
            installed_hook_pointer,
        ]

        return libpq

    def case_installs_oauth_hook(self):
        libpq = self._make_libpq()

        with patch(
                'pgadmin.utils.pg_oauth2._get_libpq',
                return_value=libpq) as get_libpq:
            pg_oauth2.install_oauth_hook()

        get_libpq.assert_called_once_with()
        libpq.PQsetAuthDataHook.assert_called_once_with(
            pg_oauth2._oauth_hook
        )

        self.assertIs(
            pg_oauth2._hook,
            pg_oauth2._oauth_hook
        )
        self.assertIs(
            pg_oauth2._cleanup_hook,
            pg_oauth2._oauth_cleanup
        )
        self.assertIsNone(pg_oauth2._previous_hook)

    def case_installation_is_idempotent(self):
        libpq = self._make_libpq()

        with patch(
                'pgadmin.utils.pg_oauth2._get_libpq',
                return_value=libpq) as get_libpq:
            pg_oauth2.install_oauth_hook()
            pg_oauth2.install_oauth_hook()

        # The second call should return before loading libpq or replacing
        # the process-global hook again.
        get_libpq.assert_called_once_with()
        libpq.PQsetAuthDataHook.assert_called_once_with(
            pg_oauth2._oauth_hook
        )

    def case_preserves_previous_auth_data_hook(self):
        @pg_oauth2._AUTH_HOOK
        def previous_hook(authdata_type, conn, data):
            return 67

        previous_hook_pointer = ctypes.cast(
            previous_hook,
            ctypes.c_void_p
        ).value

        libpq = self._make_libpq(previous_hook_pointer)

        with patch(
                'pgadmin.utils.pg_oauth2._get_libpq',
                return_value=libpq):
            pg_oauth2.install_oauth_hook()

        self.assertIsNotNone(pg_oauth2._previous_hook)
        self.assertEqual(
            pg_oauth2._previous_hook(0, None, None),
            67
        )

        libpq.PQsetAuthDataHook.assert_called_once_with(
            pg_oauth2._oauth_hook
        )

        # Keep the original ctypes callback alive until after the
        # reconstructed callback pointer has been invoked.
        self.assertIsNotNone(previous_hook)

    def case_failed_installation_can_be_retried(self):
        libpq = self._make_libpq()

        # Override the fixture's sequence: each installation attempt
        # starts with no previous hook.
        libpq.PQgetAuthDataHook.side_effect = None
        libpq.PQgetAuthDataHook.return_value = 0

        libpq.PQsetAuthDataHook.side_effect = [
            RuntimeError('Hook installation failed.'),
            None,
        ]

        with patch(
                'pgadmin.utils.pg_oauth2._get_libpq',
                return_value=libpq) as get_libpq:
            with self.assertRaisesRegex(
                    RuntimeError,
                    'Hook installation failed'):
                pg_oauth2.install_oauth_hook()

            self.assertIsNone(pg_oauth2._hook)

            pg_oauth2.install_oauth_hook()

        self.assertEqual(get_libpq.call_count, 2)
        self.assertEqual(libpq.PQsetAuthDataHook.call_count, 2)

        for hook_call in libpq.PQsetAuthDataHook.call_args_list:
            self.assertIs(
                hook_call.args[0],
                pg_oauth2._oauth_hook,
            )

        self.assertIs(pg_oauth2._hook, pg_oauth2._oauth_hook)
        self.assertIs(
            pg_oauth2._cleanup_hook,
            pg_oauth2._oauth_cleanup,
        )


class TestOAuthRequestContext(
        _OAuthUnitTestMixin, BaseTestGenerator):
    """Test rejection of token retrieval outside a request."""

    @patch('pgadmin.utils.pg_oauth2._get_pgadmin_oauth_token')
    @patch('pgadmin.utils.pg_oauth2._exchange_oauth_access_token')
    def case_token_modes_require_request_context(
            self, exchange, get_token):
        for mode in ('direct', 'exchange'):
            with self.subTest(mode=mode):
                with self.assertRaisesRegex(
                        pg_oauth2.OAuthRequestContextRequired,
                        'authenticated pgAdmin request'):
                    pg_oauth2.get_postgres_oauth_token(
                        mode,
                        'postgres-cluster',
                        'openid',
                        ISSUER,
                    )

        get_token.assert_not_called()
        exchange.assert_not_called()


class TestLibpqSelection(
        _OAuthUnitTestMixin, BaseTestGenerator):
    """Test the restrictions used when selecting Psycopg's libpq."""

    def setUp(self):
        from psycopg import pq

        self.pq = pq
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)

        self.libpq = MagicMock()
        self.libpq.PQlibVersion.return_value = 180000
        self.library_path = '/test/libpq.so.5'

        self.stack.enter_context(
            patch.object(pg_oauth2, '_libpq', None)
        )
        self.stack.enter_context(
            patch.object(self.pq, '__impl__', 'c')
        )
        self.stack.enter_context(
            patch.object(self.pq, 'version', return_value=180000)
        )
        self.stack.enter_context(
            patch.object(pg_oauth2.sys, 'platform', 'linux')
        )

        # Provide deterministic flags even when running these mocked
        # Linux loader tests on Windows or macOS.
        self.stack.enter_context(
            patch.object(
                pg_oauth2.os, 'RTLD_NOW', 2, create=True,
            )
        )
        self.stack.enter_context(
            patch.object(
                pg_oauth2.os, 'RTLD_NOLOAD', 4, create=True,
            )
        )

        self.discover = self.stack.enter_context(
            patch.object(
                pg_oauth2,
                '_get_loaded_libpq_paths',
                return_value=[self.library_path],
            )
        )
        self.load_library = self.stack.enter_context(
            patch.object(
                pg_oauth2.ctypes,
                'CDLL',
                return_value=self.libpq,
            )
        )

    def case_python_implementation_reuses_existing_handle(self):
        ctypes_module = MagicMock()
        ctypes_module.pq = self.libpq

        with ExitStack() as stack:
            stack.enter_context(
                patch.object(self.pq, '__impl__', 'python')
            )
            stack.enter_context(
                patch.dict(
                    'sys.modules',
                    {'psycopg.pq._pq_ctypes': ctypes_module},
                )
            )
            stack.enter_context(
                patch.object(
                    self.pq,
                    '_pq_ctypes',
                    ctypes_module,
                    create=True,
                )
            )

            result = pg_oauth2._get_libpq()

        self.assertIs(result, self.libpq)
        self.discover.assert_not_called()
        self.load_library.assert_not_called()

    def case_c_implementation_uses_existing_loaded_library(self):
        result = pg_oauth2._get_libpq()

        self.assertIs(result, self.libpq)
        self.discover.assert_called_once_with()
        self.load_library.assert_called_once_with(
            self.library_path,
            mode=pg_oauth2.os.RTLD_NOW | pg_oauth2.os.RTLD_NOLOAD,
        )

    def case_c_implementation_rejects_missing_or_ambiguous_library(self):
        cases = (
            [],
            ['/test/libpq.so.5', '/other/libpq.so.5'],
        )

        for candidates in cases:
            with self.subTest(candidates=candidates):
                self.discover.return_value = candidates

                with self.assertRaises(RuntimeError):
                    pg_oauth2._get_libpq()

                self.load_library.assert_not_called()
                self.assertIsNone(pg_oauth2._libpq)

    def case_unsupported_implementations_fail_before_library_acquisition(self):
        cases = (
            ('binary', 'linux'),
            ('c', 'win32'),
            ('c', 'darwin'),
        )

        for implementation, platform in cases:
            with self.subTest(
                    implementation=implementation,
                    platform=platform):
                with ExitStack() as stack:
                    stack.enter_context(
                        patch.object(
                            self.pq, '__impl__', implementation,
                        )
                    )
                    stack.enter_context(
                        patch.object(
                            pg_oauth2.sys, 'platform', platform,
                        )
                    )

                    with self.assertRaises(RuntimeError):
                        pg_oauth2._get_libpq()

                self.discover.assert_not_called()
                self.load_library.assert_not_called()
                self.assertIsNone(pg_oauth2._libpq)

    def case_runtime_version_mismatch_is_rejected(self):
        # Both versions are supported individually, but they disagree.
        self.libpq.PQlibVersion.return_value = 180001

        with self.assertRaisesRegex(
                RuntimeError,
                'Psycopg reports version'):
            pg_oauth2._get_libpq()

        self.assertIsNone(pg_oauth2._libpq)
        self.libpq.PQsetAuthDataHook.assert_not_called()

    def case_only_libpq_18_versions_are_accepted(self):
        for version in (180000, 180001, 189999):
            with self.subTest(version=version):
                pg_oauth2._check_oauth_libpq_version(version)

        for version in (170000, 179999, 190000, 190001):
            with self.subTest(version=version):
                with self.assertRaisesRegex(RuntimeError, '18.x'):
                    pg_oauth2._check_oauth_libpq_version(version)
