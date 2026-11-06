##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""In server mode, a server may only use a libpq service listed in
SERVER_MODE_ALLOWED_SERVICES: creating or updating a server to use any
other is refused, and connecting to an existing one fails with a message
naming the setting."""

import json
from unittest.mock import patch

import config
from pgadmin.model import db, Server
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from .utils import restore_server_fixture_on_cleanup

SERVICE = 'pga_test_service'
SETTING = 'SERVER_MODE_ALLOWED_SERVICES'


class ServerServiceAllowlistTestCase(BaseTestGenerator):

    scenarios = [
        ('Create with a service that is not listed is refused',
         dict(create={'service': SERVICE}, expected_create=403)),
        ('Create with a service connection parameter that is not listed '
         'is refused',
         dict(create={'connection_params': [
             {'name': 'sslmode', 'value': 'prefer'},
             {'name': 'service', 'value': SERVICE}]},
             expected_create=403)),
        ('Create with a listed service is accepted',
         dict(create={'service': SERVICE}, allowed=[SERVICE],
              expected_create=200)),
        ('Update to a service that is not listed is refused',
         dict(create={}, expected_create=200,
              update={'service': SERVICE}, expected_update=403)),
        ('Update adding a service connection parameter is refused',
         dict(create={}, expected_create=200,
              update={'connection_params': {'added': [
                  {'name': 'service', 'value': SERVICE}]}},
              expected_update=403)),
        ('Update adding a service file connection parameter is refused',
         dict(create={}, expected_create=200, allowed=[SERVICE],
              update={'connection_params': {'added': [
                  {'name': 'servicefile', 'value': '/tmp/svc.conf'}]}},
              expected_update=403, message='servicefile')),
        ('Update to a listed service is accepted',
         dict(create={}, expected_create=200, allowed=[SERVICE],
              update={'service': SERVICE}, expected_update=200)),
        ('Connecting to a server whose service is no longer listed fails',
         dict(create={'service': SERVICE}, allowed=[SERVICE],
              expected_create=200, connect_allowed=[])),
    ]

    allowed = []
    update = None
    expected_update = None
    connect_allowed = None
    message = SETTING

    def setUp(self):
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest('The service allowlist only applies to server '
                          'mode.')
        restore_server_fixture_on_cleanup(self)

    def _allow(self, services):
        return patch.dict(self.app.config, {SETTING: services})

    def _stored_service(self):
        with self.app.app_context():
            row = Server.query.filter_by(id=self.server_id).first()
            return row.service, dict(row.connection_params or {})

    def runTest(self):
        server = dict(self.server)
        server.pop('service', None)
        server.update(self.create)

        with self._allow(self.allowed):
            response = self.tester.post(
                '/browser/server/obj/{0}/'.format(utils.SERVER_GROUP),
                data=json.dumps(server), content_type='html/json')
        self.assertEqual(response.status_code, self.expected_create,
                         response.data)
        if self.expected_create != 200:
            self.assertIn(self.message,
                          json.loads(response.data)['errormsg'])
            return

        self.server_id = json.loads(
            response.data.decode('utf-8'))['node']['_id']

        if self.update is not None:
            before = self._stored_service()
            with self._allow(self.allowed):
                response = self.tester.put(
                    '/browser/server/obj/{0}/{1}'.format(
                        utils.SERVER_GROUP, self.server_id),
                    data=json.dumps(dict(self.update, id=self.server_id)),
                    content_type='html/json')
            self.assertEqual(response.status_code, self.expected_update,
                             response.data)
            if self.expected_update != 200:
                self.assertIn(self.message,
                              json.loads(response.data)['errormsg'])
                # Nothing was stored, not even in the owner's
                # connection parameters.
                self.assertEqual(self._stored_service(), before)
            else:
                self.assertEqual(self._stored_service()[0], SERVICE)

        if self.connect_allowed is not None:
            with self._allow(self.connect_allowed):
                response = self.tester.post(
                    '/browser/server/connect/{0}/{1}'.format(
                        utils.SERVER_GROUP, self.server_id),
                    data=json.dumps({'password': 'not used'}),
                    content_type='html/json')
            # The password dialog is shown again, with the error.
            self.assertEqual(response.status_code, 401, response.data)
            self.assertIn(SETTING,
                          json.loads(response.data)['result']['errmsg'])

    def tearDown(self):
        if self.server_id is not None:
            utils.delete_server_with_api(self.tester, self.server_id)


class AdhocServiceAllowlistTestCase(BaseTestGenerator):
    """The workspace's ad hoc connection, which creates a server, refuses
    a service that is not listed."""

    scenarios = [
        ('Ad hoc connection with a service that is not listed',
         dict(data={'service': SERVICE})),
        ('Ad hoc connection with a service connection parameter',
         dict(data={'connection_params': [
             {'name': 'service', 'value': SERVICE}]})),
    ]

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest('The service allowlist only applies to server '
                          'mode.')

    def _adhoc_count(self):
        with self.app.app_context():
            return Server.query.filter_by(is_adhoc=1).count()

    def runTest(self):
        before = self._adhoc_count()
        data = dict(server_name='adhoc_service_probe', did='postgres',
                    host=self.server['host'], port=self.server['port'],
                    user=self.server['username'])
        data.update(self.data)
        with patch.dict(self.app.config, {SETTING: []}):
            response = self.tester.post(
                '/misc/workspace/adhoc_connect_server',
                data=json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, 403, response.data)
        self.assertIn(SETTING, json.loads(response.data)['errormsg'])
        self.assertEqual(self._adhoc_count(), before)

    def tearDown(self):
        with self.app.app_context():
            for s in Server.query.filter_by(
                    is_adhoc=1, name='adhoc_service_probe').all():
                db.session.delete(s)
            db.session.commit()
