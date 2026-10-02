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
                     http=None):
            self.api_url = api_url
            self.token = token
            self.expires_at = expires_at
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
        self._test_verify_byoc_capable()
        self._test_verify_managed_only()
        self._test_verify_other_byoc_error_is_error()
        self._test_verify_bad_credentials_escaped()
        self._test_choices()
        self._test_requires_session()
        self._test_malformed_response()
        self._test_verify_null_secret()
        self._test_deploy()

    def _verify(self, routes, mint_error=None):
        from flask import session
        from pgadmin.misc.cloud import starfleet as sf
        fake = _fake_client_class(routes, mint_error)
        body = {'secret': {'client_id': 'test-client-id',
                           'client_secret': 'test-secret'}}
        with self.app.test_request_context(
                '/starfleet/verify_credentials/', method='POST',
                data=json.dumps(body), content_type='application/json'):
            with patch.object(sf, 'StarfleetClient', fake):
                resp = sf.verify_credentials.__wrapped__()
            return resp, dict(session.get('starfleet') or {}), fake

    def _test_verify_byoc_capable(self):
        from pgadmin.misc.cloud.starfleet import BYOC_PROBE, TENANTS
        resp, sess, fake = self._verify({
            TENANTS: [{'name': 'acme', 'plan': 'enterprise'}],
            BYOC_PROBE: []})
        body = json.loads(resp.data)
        self.assertEqual(body['data'], {'tenant_name': 'acme',
                                        'byoc': True})
        self.assertEqual(sess, {'access_token': 'tok-1',
                                'expires_at': 5000.0})
        self.assertNotIn('test-secret', json.dumps(sess))

    def _test_verify_managed_only(self):
        from pgacloud.utils.starfleet_api import StarfleetError
        from pgadmin.misc.cloud.starfleet import BYOC_PROBE, TENANTS
        resp, _, _ = self._verify({
            TENANTS: [{'name': 'acme', 'plan': 'managed'}],
            BYOC_PROBE: StarfleetError(
                'plan does not allow creating cloud account read', 400)})
        self.assertFalse(json.loads(resp.data)['data']['byoc'])

    def _test_verify_other_byoc_error_is_error(self):
        from pgacloud.utils.starfleet_api import StarfleetError
        from pgadmin.misc.cloud.starfleet import BYOC_PROBE, TENANTS
        resp, sess, _ = self._verify({
            TENANTS: [{'name': 'acme'}],
            BYOC_PROBE: StarfleetError('internal error', 500)})
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

        _, body, _ = self._get('get_clusters', {'/byoc/v1/clusters': [
            {'id': 'c1', 'name': 'east', 'status': 'available',
             'node_location': 'public'}]})
        self.assertEqual(body['data'], [{
            'label': 'east', 'value': 'c1', 'status': 'available',
            'node_location': 'public'}])

        _, body, _ = self._get('get_byoc_pg_versions', {
            '/byoc/v1/config-versions': [
                {'name': '15.7.0', 'supported_pg_versions': ['16', '17',
                                                             '18']},
                {'name': '14.1.8', 'supported_pg_versions': ['16']}]})
        self.assertEqual([v['value'] for v in body['data']],
                         ['18', '17', '16'])

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
                'kind': 'managed', 'name': 'mydb', 'display_name': 'My DB',
                'pg_version': '18', 'region': 'us-east-2', 'size': 'small',
                'ip_allowlist': '198.51.100.7', 'role': 'admin',
                'cluster_id': None},
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
        self.assertEqual(args[1:4], ['starfleet', 'create-instance',
                                     '--kind'])
        self.assertIn('--allowlist', args)
        self.assertNotIn('test-secret', ' '.join(args))
        env = process.set_env_variables.call_args.kwargs['env']
        self.assertEqual(env['STARFLEET_CLIENT_ID'], 'test-client-id')
        self.assertEqual(env['STARFLEET_CLIENT_SECRET'], 'test-secret')
        self.assertIn('STARFLEET_API_URL', env)
        process.start.assert_called_once()
