##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for the pgEdge Starfleet cloud blueprint."""

import json
import unittest
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator

XSS = '<iframe/src=http://attacker.example/>'


class _SkipServerSetUpMixin:
    def setUp(self):
        unittest.TestCase.setUp(self)


def _fake_client_class(routes, mint_error=None):
    """Build a StarfleetClient stand-in answering GETs from `routes`."""
    from pgacloud.utils.starfleet_api import StarfleetError

    class FakeClient:
        instances = []

        def __init__(self, api_url=None, client_id=None,
                     client_secret=None, token=None, expires_at=None,
                     http=None, ca_certs=None, tenant_id=None, refresh=None):
            self.api_url = api_url
            self.ca_certs = ca_certs
            self.token = token
            self.expires_at = expires_at
            self.tenant_id = tenant_id
            FakeClient.instances.append(self)

        def get_token(self):
            if mint_error:
                raise StarfleetError(mint_error, 400)
            self.token = 'tok-1'
            self.expires_at = 5000.0
            return self.token

        def get(self, path, params=None):
            value = routes[path]
            if isinstance(value, Exception):
                raise value
            return value

    return FakeClient


class TestStarfleetBlueprint(_SkipServerSetUpMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask
        from flask_babel import Babel
        self.app = Flask(__name__)
        self.app.secret_key = 'test'
        Babel(self.app)  # gettext needs it in a bare app
        self._test_verify()
        self._test_verify_old_libpq()
        self._test_verify_api_error()
        self._test_verify_bad_credentials_escaped()
        self._test_choices()
        self._test_requires_session()
        self._test_malformed_response()
        self._test_verify_null_secret()
        self._test_verify_malformed()
        self._test_deploy()
        self._test_signin_options()
        self._test_signin_unavailable()
        self._test_signin_start()
        self._test_signin_poll_states()
        self._test_signin_poll_complete()
        self._test_signin_poll_no_tenants()
        self._test_signin_poll_without_start()
        self._test_select_tenant()
        self._test_user_session_client()
        self._test_clear_revokes()
        self._test_deploy_user()
        self._test_deploy_user_start_fails()
        self._test_deploy_user_not_signed_in()

    def _verify(self, routes, mint_error=None):
        from flask import session
        from pgadmin.misc.cloud import starfleet as sf
        fake = _fake_client_class(routes, mint_error)
        body = {'secret': {'client_id': 'test-client-id',
                           'client_secret': 'test-secret'}}
        with self.app.test_request_context(
                '/starfleet/verify_credentials/', method='POST',
                data=json.dumps(body), content_type='application/json'):
            session.force_write = False
            with patch.object(sf, 'StarfleetClient', fake):
                resp = sf.verify_credentials.__wrapped__()
            self.forced = session.force_write
            return resp, dict(session.get('starfleet') or {}), fake

    def _test_verify(self):
        from pgadmin.misc.cloud import starfleet as sf
        # Pin a libpq new enough that no warning is added to the payload.
        with patch.object(sf.pq, 'version', return_value=140000):
            resp, sess, fake = self._verify({
                sf.TENANTS: [{'name': 'acme', 'plan': 'managed'}]})
        body = json.loads(resp.data)
        self.assertEqual(body['data'], {'tenant_name': 'acme'})
        self.assertEqual(sess, {'access_token': 'tok-1',
                                'expires_at': 5000.0})
        self.assertNotIn('test-secret', json.dumps(sess))
        self.assertTrue(self.forced)
        # The API's certificate is verified against pgAdmin's CA bundle.
        from pgadmin.utils.tls import get_ca_file
        self.assertEqual(fake.instances[-1].ca_certs, get_ca_file())

    def _test_verify_old_libpq(self):
        from pgadmin.misc.cloud import starfleet as sf
        for version, warned in ((130020, True), (140000, False)):
            with patch.object(sf.pq, 'version', return_value=version):
                resp, _, _ = self._verify({sf.TENANTS: []})
            data = json.loads(resp.data)['data']
            self.assertEqual('libpq_warning' in data, warned)
            if warned:
                self.assertIn('libpq 13.20', data['libpq_warning'])

    def _test_verify_api_error(self):
        from pgacloud.utils.starfleet_api import StarfleetError
        from pgadmin.misc.cloud.starfleet import TENANTS
        resp, sess, _ = self._verify({
            TENANTS: StarfleetError('internal error', 500)})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(sess, {})

    def _test_verify_bad_credentials_escaped(self):
        resp, sess, _ = self._verify({}, mint_error='bad ' + XSS)
        self.assertEqual(resp.status_code, 400)
        errormsg = json.loads(resp.data)['errormsg']
        self.assertNotIn('<iframe', errormsg)
        self.assertIn('&lt;iframe', errormsg)
        self.assertEqual(sess, {})

    def _get(self, view, routes, **kwargs):
        from flask import session
        from pgadmin.misc.cloud import starfleet as sf
        fake = _fake_client_class(routes)
        with self.app.test_request_context('/'):
            session['starfleet'] = {'access_token': 'tok-1',
                                    'expires_at': 5000.0}
            with patch.object(sf, 'StarfleetClient', fake):
                resp = getattr(sf, view).__wrapped__(**kwargs)
        return resp, json.loads(resp.data), fake

    def _test_choices(self):
        _, body, fake = self._get('get_regions', {
            '/managed/v1/regions': [{'region': 'us-east-2'}]})
        self.assertEqual(body['data'], [{'label': 'us-east-2',
                                         'value': 'us-east-2'}])
        self.assertEqual(fake.instances[0].token, 'tok-1')

        _, body, _ = self._get('get_pg_versions', {
            '/managed/v1/pg-versions': [
                {'version': '18', 'default': True},
                {'version': '17', 'default': False}]})
        self.assertEqual(body['data'][0], {'label': 'PostgreSQL 18',
                                           'value': '18', 'default': True})

        _, body, _ = self._get('get_sizes', {'/managed/v1/sizes': [
            {'name': 'small', 'display_name': 'Small', 'cpu_limit': '1000m',
             'memory_limit': '2Gi', 'storage_size': '25Gi',
             'connections': 20, 'status': 'active'},
            {'name': 'old', 'display_name': 'Old', 'cpu_limit': '500m',
             'memory_limit': '1Gi', 'storage_size': '10Gi',
             'connections': 10, 'status': 'retired'}]})
        self.assertEqual(body['data'], [{
            'label': 'Small (1 vCPU, 2Gi RAM, 25Gi storage, '
                     '20 connections)',
            'value': 'small'}])

    def _test_malformed_response(self):
        # A 2xx without the expected shape is an error, not a 500.
        resp, body, _ = self._get('get_client_ip', {
            '/managed/v1/client-ip': {}})
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Unexpected response', body['errormsg'])
        resp, body, _ = self._get('get_sizes', {
            '/managed/v1/sizes': [{'status': 'active'}]})
        self.assertEqual(resp.status_code, 400)

    def _test_verify_null_secret(self):
        from pgadmin.misc.cloud import starfleet as sf
        fake = _fake_client_class({}, mint_error='bad credentials')
        with self.app.test_request_context(
                '/starfleet/verify_credentials/', method='POST',
                data=json.dumps({'secret': None}),
                content_type='application/json'):
            with patch.object(sf, 'StarfleetClient', fake):
                resp = sf.verify_credentials.__wrapped__()
        self.assertEqual(resp.status_code, 400)

    def _test_verify_malformed(self):
        from pgadmin.misc.cloud import starfleet as sf
        from pgadmin.misc.cloud.starfleet import TENANTS
        # A tenant list of the wrong shape is a 400, not a 500.
        resp, sess, _ = self._verify({TENANTS: ['acme']})
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Unexpected response',
                      json.loads(resp.data)['errormsg'])
        self.assertEqual(sess, {})
        # Neither does a request body or secret of the wrong type.
        fake = _fake_client_class({}, mint_error='bad credentials')
        for body in (['x'], {'secret': 'x'}):
            with self.app.test_request_context(
                    '/starfleet/verify_credentials/', method='POST',
                    data=json.dumps(body),
                    content_type='application/json'):
                with patch.object(sf, 'StarfleetClient', fake):
                    resp = sf.verify_credentials.__wrapped__()
            self.assertEqual(resp.status_code, 400)

    def _test_requires_session(self):
        from pgadmin.misc.cloud import starfleet as sf
        with self.app.test_request_context('/'):
            resp = sf.get_regions.__wrapped__()
        self.assertEqual(resp.status_code, 401)

    def _test_deploy(self):
        from flask import session
        from pgadmin.misc.cloud import starfleet as sf
        data = {
            'cloud': 'starfleet',
            'secret': {'client_id': 'test-client-id',
                       'client_secret': 'test-secret'},
            'instance_details': {
                'name': 'mydb', 'display_name': 'My DB',
                'pg_version': '18', 'region': 'us-east-2', 'size': 'small',
                'ip_allowlist': '198.51.100.7', 'role': 'admin'},
            'db_details': {'gid': 1}}
        process = MagicMock()
        process.id = 'job-1'
        with self.app.test_request_context('/'), \
                patch.object(sf, '_create_server', return_value=42) as cs, \
                patch.object(sf, 'BatchProcess',
                             return_value=process) as bp:
            status, p, resp = sf.deploy_on_starfleet(data)
        self.assertTrue(status)
        self.assertEqual(resp, {'label': 'mydb', 'sid': 42})
        server = cs.call_args[0][0]
        self.assertEqual(server['connection_params'], {
            'sslmode': 'require', 'gssencmode': 'disable',
            'connect_timeout': 30})
        args = bp.call_args.kwargs['args']
        self.assertEqual(args[1:5], ['starfleet', 'create-instance',
                                     '--name', 'mydb'])
        self.assertIn('--allowlist', args)
        self.assertNotIn('test-secret', ' '.join(args))
        env = process.set_env_variables.call_args.kwargs['env']
        self.assertEqual(env['STARFLEET_CLIENT_ID'], 'test-client-id')
        self.assertEqual(env['STARFLEET_CLIENT_SECRET'], 'test-secret')
        self.assertIn('STARFLEET_API_URL', env)
        # The background job verifies against the same CA bundle.
        from pgadmin.utils.tls import ca_file_env
        for key, value in ca_file_env().items():
            self.assertEqual(env[key], value)
        process.start.assert_called_once()

    # User sign-in with the device authorization grant.

    def _test_signin_options(self):
        from pgadmin.misc.cloud import starfleet as sf
        for apps, expected in ((AUTH0_APPS, True), ({}, False),
                               ({API_URL: {'domain': 'auth.example.com'}},
                                False)):
            with self.app.test_request_context('/'), \
                    patch.object(sf.config, 'STARFLEET_API_URL',
                                 API_URL + '/', create=True), \
                    patch.object(sf.config, 'STARFLEET_AUTH0_APPS', apps,
                                 create=True):
                body = json.loads(sf.signin_options.__wrapped__().data)
            self.assertEqual(body['data'], {'user_signin': expected})

    def _test_signin_unavailable(self):
        from pgadmin.misc.cloud import starfleet as sf
        with self.app.test_request_context('/', method='POST'), \
                patch.object(sf, '_auth0_app', return_value=None):
            resp = sf.signin_start.__wrapped__()
        self.assertEqual(resp.status_code, 400)

    def _signin(self, auth0, now=1000.0):
        """Patch in a fake Auth0 client and clock for sign-in calls."""
        from pgadmin.misc.cloud import starfleet as sf
        from contextlib import ExitStack
        stack = ExitStack()
        stack.enter_context(patch.object(sf, '_auth0_app',
                                         return_value=AUTH0_APP))
        stack.enter_context(patch.object(sf, '_auth0_client',
                                         return_value=auth0))
        self.clock = stack.enter_context(
            patch.object(sf.time, 'time', return_value=now))
        return stack

    def _test_signin_start(self):
        from flask import session
        from pgadmin.misc.cloud import starfleet as sf
        auth0 = MagicMock()
        auth0.request_device_code.return_value = dict(DEVICE_CODE)
        with self.app.test_request_context('/', method='POST'), \
                self._signin(auth0):
            # A previous sign-in is dropped, and its refresh token revoked.
            session[sf.SESSION_KEY] = {'auth': 'user', 'access_token': 'a0',
                                       'refresh_token': 'r0'}
            body = json.loads(sf.signin_start.__wrapped__().data)
            pending = dict(session[sf.SIGNIN_KEY])
            self.assertNotIn(sf.SESSION_KEY, session)
        auth0.revoke.assert_called_once_with('r0')
        self.assertEqual(body['data'], {
            'user_code': 'ABCD-EFGH',
            'verification_uri': 'https://auth.example.com/activate',
            'verification_uri_complete': None,
            'expires_in': 900, 'interval': 5})
        # The device code stays on the server.
        self.assertNotIn('dev-1', json.dumps(body))
        self.assertEqual(pending, {'device_code': 'dev-1', 'interval': 5,
                                   'expires_at': 1900.0,
                                   'next_poll_at': 1005.0})

    def _poll(self, auth0, pending, now):
        from flask import session
        from pgadmin.misc.cloud import starfleet as sf
        with self.app.test_request_context('/', method='POST'), \
                self._signin(auth0, now):
            session[sf.SIGNIN_KEY] = dict(pending)
            resp = sf.signin_poll.__wrapped__()
            return (resp, json.loads(resp.data),
                    session.get(sf.SIGNIN_KEY),
                    dict(session.get(sf.SESSION_KEY) or {}))

    def _test_signin_poll_states(self):
        from pgacloud.utils.starfleet_api import Auth0Error, StarfleetError
        pending = {'device_code': 'dev-1', 'interval': 5,
                   'expires_at': 1900.0, 'next_poll_at': 1005.0}

        # Polled too soon: answered without asking Auth0.
        auth0 = MagicMock()
        _, body, left, _ = self._poll(auth0, pending, 1002.0)
        self.assertEqual(body['data'], {'status': 'pending', 'interval': 5})
        auth0.poll_device_code.assert_not_called()
        self.assertEqual(left, pending)

        # Past its expiry: ended without asking Auth0.
        _, body, left, _ = self._poll(auth0, pending, 1900.0)
        self.assertEqual(body['data']['status'], 'expired')
        auth0.poll_device_code.assert_not_called()
        self.assertIsNone(left)

        for error, status, interval in (
                (Auth0Error('authorization_pending', 'wait', 403),
                 'pending', 5),
                (Auth0Error('slow_down', 'slow', 429), 'pending', 10),
                (Auth0Error('expired_token', 'gone', 403), 'expired', None),
                (Auth0Error('access_denied', XSS, 403), 'denied', None)):
            auth0 = MagicMock()
            auth0.poll_device_code.side_effect = error
            _, body, left, sess = self._poll(auth0, pending, 1010.0)
            auth0.poll_device_code.assert_called_once_with('dev-1')
            self.assertEqual(body['data']['status'], status)
            self.assertEqual(sess, {})
            if interval:
                self.assertEqual(body['data']['interval'], interval)
                self.assertEqual(left['interval'], interval)
                self.assertEqual(left['next_poll_at'], 1010.0 + interval)
            else:
                self.assertIsNone(left)
        self.assertNotIn('<iframe', body['data']['message'])

        # Any other OAuth error ends the sign-in.
        auth0 = MagicMock()
        auth0.poll_device_code.side_effect = Auth0Error(
            'invalid_grant', 'bad', 400)
        resp, _, left, _ = self._poll(auth0, pending, 1010.0)
        self.assertEqual(resp.status_code, 400)
        self.assertIsNone(left)

        # A network error keeps it, and the wizard keeps polling.
        auth0.poll_device_code.side_effect = StarfleetError('timed out')
        with patch.object(self.app.logger, 'warning'):
            resp, body, left, _ = self._poll(auth0, pending, 1010.0)
        self.assertEqual(body['data'], {'status': 'pending', 'interval': 5})
        self.assertEqual(left['next_poll_at'], 1015.0)

    def _test_signin_poll_complete(self):
        from pgadmin.misc.cloud import starfleet as sf
        auth0 = MagicMock()
        access = jwt({'pgedge_tenant_ids': ['T-1', 'T-2'],
                      'pgedge_tenant_id': 'T-2'})
        auth0.poll_device_code.return_value = {
            'access_token': access, 'refresh_token': 'r1',
            'expires_in': 600}
        fake = _fake_client_class({sf.TENANTS: [
            {'id': 't-1', 'name': XSS}, {'id': 'other', 'name': 'x'}]})
        pending = {'device_code': 'dev-1', 'interval': 5,
                   'expires_at': 1900.0, 'next_poll_at': 1005.0}
        with patch.object(sf, 'StarfleetClient', fake):
            _, body, left, sess = self._poll(auth0, pending, 1010.0)
        self.assertIsNone(left)
        self.assertEqual(body['data'], {
            'status': 'complete', 'tenant_id': 'T-2',
            'tenants': [{'value': 'T-1', 'label': XSS + ' (T-1)'},
                        {'value': 'T-2', 'label': 'T-2'}]})
        # The tokens stay in the server-side session.
        self.assertNotIn(access, json.dumps(body))
        self.assertNotIn('r1', json.dumps(body))
        self.assertEqual(sess, {
            'auth': 'user', 'access_token': access, 'refresh_token': 'r1',
            'expires_at': 1610.0, 'tenant_ids': ['T-1', 'T-2'],
            'tenant_id': 'T-2'})

        # The names are optional: a failure to list them leaves the IDs.
        from pgacloud.utils.starfleet_api import StarfleetError
        fake = _fake_client_class({sf.TENANTS: StarfleetError('no')})
        with patch.object(sf, 'StarfleetClient', fake):
            _, body, _, _ = self._poll(auth0, pending, 1010.0)
        self.assertEqual([t['label'] for t in body['data']['tenants']],
                         ['T-1', 'T-2'])

    def _test_signin_poll_no_tenants(self):
        auth0 = MagicMock()
        auth0.poll_device_code.return_value = {
            'access_token': jwt({}), 'refresh_token': 'r1',
            'expires_in': 600}
        pending = {'device_code': 'dev-1', 'interval': 5,
                   'expires_at': 1900.0, 'next_poll_at': 1005.0}
        _, body, left, sess = self._poll(auth0, pending, 1010.0)
        self.assertEqual(body['data']['status'], 'failed')
        self.assertEqual((left, sess), (None, {}))
        auth0.revoke.assert_called_once_with('r1')

    def _test_signin_poll_without_start(self):
        from pgadmin.misc.cloud import starfleet as sf
        with self.app.test_request_context('/', method='POST'):
            resp = sf.signin_poll.__wrapped__()
        self.assertEqual(resp.status_code, 400)

    def _select_tenant(self, state, tenant_id):
        from flask import session
        from pgadmin.misc.cloud import starfleet as sf
        with self.app.test_request_context(
                '/', method='POST', data=json.dumps({'tenant_id': tenant_id}),
                content_type='application/json'), \
                patch.object(sf.pq, 'version', return_value=140000):
            if state is not None:
                session[sf.SESSION_KEY] = state
            resp = sf.select_tenant.__wrapped__()
            return resp, dict(session.get(sf.SESSION_KEY) or {})

    def _test_select_tenant(self):
        state = {'auth': 'user', 'access_token': 'a1',
                 'tenant_ids': ['T-1', 'T-2'], 'tenant_id': 'T-2'}
        resp, sess = self._select_tenant(state, 't-1')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(sess['tenant_id'], 'T-1')
        for tenant_id in ('T-3', None, ['T-1']):
            resp, sess = self._select_tenant(state, tenant_id)
            self.assertEqual(resp.status_code, 400)
            self.assertEqual(sess['tenant_id'], 'T-2')
        # Only a user sign-in has tenants to choose from.
        for state in (None, {'access_token': 'a1'}):
            resp, _ = self._select_tenant(state, 'T-1')
            self.assertEqual(resp.status_code, 401)

    def _test_user_session_client(self):
        from flask import session
        from pgadmin.misc.cloud import starfleet as sf
        fake = _fake_client_class({})
        with self.app.test_request_context('/'), \
                patch.object(sf, 'StarfleetClient', fake):
            session[sf.SESSION_KEY] = {'auth': 'user', 'access_token': 'a1',
                                       'expires_at': 5000.0,
                                       'tenant_id': 'T-1'}
            client = sf.get_session_client()
        self.assertEqual((client.token, client.tenant_id), ('a1', 'T-1'))

    def _test_clear_revokes(self):
        from flask import session
        from pgacloud.utils.starfleet_api import StarfleetError
        from pgadmin.misc.cloud import starfleet as sf
        auth0 = MagicMock()
        auth0.revoke.side_effect = StarfleetError('r1 refused')
        with self.app.test_request_context('/'), self._signin(auth0), \
                patch.object(self.app.logger, 'warning') as warn:
            session[sf.SESSION_KEY] = {'auth': 'user', 'access_token': 'a1',
                                       'refresh_token': 'r1'}
            session[sf.SIGNIN_KEY] = {'device_code': 'dev-1'}
            sf.clear_starfleet_session()
            self.assertNotIn(sf.SESSION_KEY, session)
            self.assertNotIn(sf.SIGNIN_KEY, session)
        auth0.revoke.assert_called_once_with('r1')
        warn.assert_called_once()

    def _deploy_user(self, state, start_error=None):
        from flask import session
        from pgadmin.misc.cloud import starfleet as sf
        data = {
            'cloud': 'starfleet', 'secret': {'auth_method': 'user'},
            'instance_details': {
                'name': 'mydb', 'region': 'us-east-2', 'size': 'small',
                'ip_allowlist': '', 'role': 'admin'},
            'db_details': {'gid': 1}}
        process = MagicMock()
        process.id = 'job-1'
        process.start.side_effect = start_error
        with self.app.test_request_context('/'), \
                patch.object(sf, '_auth0_app', return_value=AUTH0_APP), \
                patch.object(sf, '_create_server', return_value=42) as cs, \
                patch.object(sf, 'BatchProcess', return_value=process) as bp:
            if state is not None:
                session[sf.SESSION_KEY] = state
            status, _, _ = sf.deploy_on_starfleet(data)
            return (status, cs, bp, process,
                    dict(session.get(sf.SESSION_KEY) or {}),
                    dict(session.get(sf.JOBS_KEY) or {}))

    def _test_deploy_user(self):
        status, _, bp, process, sess, jobs = self._deploy_user({
            'auth': 'user', 'access_token': 'a1', 'refresh_token': 'r1',
            'expires_at': 5000.0, 'tenant_ids': ['T-1'],
            'tenant_id': 'T-1'})
        self.assertTrue(status)
        env = process.set_env_variables.call_args.kwargs['env']
        self.assertEqual(env['STARFLEET_ACCESS_TOKEN'], 'a1')
        self.assertEqual(env['STARFLEET_TOKEN_EXPIRES_AT'], '5000.0')
        self.assertEqual(env['STARFLEET_TENANT_ID'], 'T-1')
        self.assertEqual(env['STARFLEET_REFRESH_TOKEN'], 'r1')
        self.assertEqual(env['STARFLEET_AUTH0_DOMAIN'], 'auth.example.com')
        self.assertEqual(env['STARFLEET_AUTH0_CLIENT_ID'], 'app-id')
        self.assertNotIn('STARFLEET_CLIENT_SECRET', env)
        args = ' '.join(bp.call_args.kwargs['args'])
        self.assertNotIn('a1', args.split())
        self.assertNotIn('r1', args.split())
        # The refresh token now belongs to the job alone.
        self.assertNotIn('refresh_token', sess)
        self.assertNotIn('refresh_token', jobs['job-1'])
        self.assertEqual(jobs['job-1']['access_token'], 'a1')

    def _test_deploy_user_start_fails(self):
        # The session keeps the refresh token, so clearing it revokes it.
        status, _, _, _, sess, jobs = self._deploy_user({
            'auth': 'user', 'access_token': 'a1', 'refresh_token': 'r1',
            'expires_at': 5000.0, 'tenant_ids': ['T-1'],
            'tenant_id': 'T-1'}, start_error=RuntimeError('no'))
        self.assertFalse(status)
        self.assertEqual(sess['refresh_token'], 'r1')
        self.assertEqual(jobs, {})

    def _test_deploy_user_not_signed_in(self):
        status, cs, bp, _, _, _ = self._deploy_user(
            {'access_token': 'from-api-client'})
        self.assertFalse(status)
        cs.assert_not_called()
        bp.assert_not_called()


API_URL = 'https://api.example.com'
AUTH0_APP = {'domain': 'auth.example.com', 'audience': API_URL,
             'client_id': 'app-id'}
AUTH0_APPS = {API_URL: AUTH0_APP}
DEVICE_CODE = {
    'device_code': 'dev-1', 'user_code': 'ABCD-EFGH',
    'verification_uri': 'https://auth.example.com/activate',
    'verification_uri_complete': None, 'expires_in': 900, 'interval': 5}


def jwt(claims):
    """An unsigned JWT carrying claims, for code that only reads them."""
    import base64

    def part(obj):
        return base64.urlsafe_b64encode(
            json.dumps(obj).encode()).decode().rstrip('=')
    return '{}.{}.sig'.format(part({'alg': 'none'}), part(claims))
