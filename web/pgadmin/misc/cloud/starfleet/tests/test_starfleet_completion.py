##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for Starfleet deployment completion and password handling."""

import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator


class _SkipServerSetUpMixin:
    def setUp(self):
        unittest.TestCase.setUp(self)


class TestStarfleetCompletion(_SkipServerSetUpMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask
        self.app = Flask(__name__)
        self.app.secret_key = 'test'
        from flask_babel import Babel
        Babel(self.app)  # gettext needs it in a bare app
        self._test_fetch_password()
        self._test_update_server()
        self._test_save_password()

    def _session_client(self, payload=None, error=None):
        client = MagicMock()
        if error:
            client.get.side_effect = error
        else:
            client.get.return_value = payload
        return client

    def _test_fetch_password(self):
        from pgacloud.utils.starfleet_api import StarfleetError
        from pgadmin.misc.cloud import starfleet as sf
        with self.app.test_request_context('/'):
            client = self._session_client(
                {'connection': {'password': 'pw-1'}})
            with patch.object(sf, 'get_session_client',
                              return_value=client):
                self.assertEqual(sf.fetch_password('managed', 'db-1',
                                                   'app'), 'pw-1')
                client.get.assert_called_with(
                    '/managed/v1/databases/db-1',
                    {'user_type': 'application'})
                sf.fetch_password('byoc', 'db-1', 'admin')
                client.get.assert_called_with('/byoc/v1/databases/db-1',
                                              None)
            with patch.object(sf, 'get_session_client', return_value=None):
                self.assertIsNone(sf.fetch_password('managed', 'x',
                                                    'admin'))
            with patch.object(sf, 'get_session_client',
                              return_value=self._session_client(
                                  error=StarfleetError('gone', 404))):
                self.assertIsNone(sf.fetch_password('managed', 'x',
                                                    'admin'))

    def _test_update_server(self):
        import pgadmin.misc.cloud as cloud
        server = SimpleNamespace(id=7, servergroup_id=1, name='mydb',
                                 cloud_status=-1, host=None, port=None,
                                 maintenance_db='postgres',
                                 username='admin')
        query = MagicMock()
        query.filter_by.return_value.first.return_value = server
        instance = {'instance': {
            'Provider': 'starfleet', 'Kind': 'managed', 'Id': 'db-1',
            'Role': 'admin', 'Hostname': 'db.example.com', 'Port': 5432,
            'Database': 'appdb', 'Username': 'admin_user', 'sid': 7,
            'status': True, 'pid': 'job-1'}}
        order = []

        def fake_fetch(*args):
            # The session must still hold the token when we fetch.
            from flask import session
            order.append('fetch' if 'starfleet' in session else 'no-token')
            return 'pw-1'

        from flask import session
        with self.app.test_request_context('/'), \
                patch.object(cloud, 'Server', MagicMock(query=query)), \
                patch.object(cloud, 'db'), \
                patch.object(cloud, 'current_user', SimpleNamespace(id=1)), \
                patch.object(cloud, 'fetch_password',
                             side_effect=fake_fetch):
            session['starfleet'] = {'access_token': 'tok',
                                    'expires_at': 9999999999}
            status, result = cloud.update_server(instance)
            # The real clear_cloud_session ran after the fetch.
            self.assertNotIn('starfleet', session)
        self.assertTrue(status)
        self.assertEqual(order, ['fetch'])
        self.assertEqual((server.host, server.port, server.maintenance_db,
                          server.username),
                         ('db.example.com', 5432, 'appdb', 'admin_user'))
        self.assertEqual(result['starfleet_password'], 'pw-1')
        self.assertTrue(result['starfleet'])
        self.assertEqual(result['host'], 'db.example.com')
        self.assertEqual(result['username'], 'admin_user')
        self.assertIn('allow_save_password', result)

        # A second call with no session and the real fetch_password.
        with self.app.test_request_context('/'), \
                patch.object(cloud, 'Server', MagicMock(query=query)), \
                patch.object(cloud, 'db'), \
                patch.object(cloud, 'current_user', SimpleNamespace(id=1)):
            status, result = cloud.update_server(instance)
        self.assertTrue(status)
        self.assertIsNone(result['starfleet_password'])

    def _post_save(self, allow=True, owned=True, session_allow=True,
                   body=None):
        from flask import session
        from pgadmin.misc.cloud import starfleet as sf
        server = SimpleNamespace(id=7, password=None, save_password=0)
        query = MagicMock()
        query.filter_by.return_value.first.return_value = \
            server if owned else None
        with self.app.test_request_context(
                '/', method='POST', data=json.dumps(
                    {'password': 'pw-1'} if body is None else body),
                content_type='application/json'):
            session['allow_save_password'] = session_allow
            with patch.object(sf.config, 'ALLOW_SAVE_PASSWORD', allow), \
                    patch.object(sf, 'Server', MagicMock(query=query)), \
                    patch.object(sf, 'db'), \
                    patch.object(sf, 'current_user',
                                 SimpleNamespace(id=1)), \
                    patch.object(sf, 'get_crypt_key',
                                 return_value=(True, 'k')), \
                    patch.object(sf, 'encrypt', return_value='enc'):
                resp = sf.save_password.__wrapped__(7)
        return resp, server

    def _test_save_password(self):
        resp, server = self._post_save()
        self.assertEqual(resp.status_code, 200)
        self.assertEqual((server.password, server.save_password),
                         ('enc', 1))
        resp, server = self._post_save(allow=False)
        self.assertEqual(resp.status_code, 403)
        self.assertIsNone(server.password)
        resp, _ = self._post_save(session_allow=False)
        self.assertEqual(resp.status_code, 403)
        resp, server = self._post_save(body={'password': ''})
        self.assertEqual(resp.status_code, 400)
        self.assertIsNone(server.password)
        resp, _ = self._post_save(owned=False)
        self.assertEqual(resp.status_code, 410)
