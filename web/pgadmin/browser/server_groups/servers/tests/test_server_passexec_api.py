##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for named password exec commands in the servers API.

The test runner starts pgAdmin in desktop mode and has a single user, so
the API tests switch the server-mode code paths on by patching
config.SERVER_MODE for the owner's requests. Non-owner behaviour, which
needs a second user, is tested against the view helpers with mocks."""

import json
import sqlite3
from unittest.mock import MagicMock, patch

import config
from pgadmin.browser.server_groups.servers import (
    prepare_passexec_data, passexec_api_fields)
from pgadmin.utils.passexec import (
    normalise_passexec_name, passexec_name_for_api,
    PASSEXEC_INHERIT, PASSEXEC_NONE)
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils

COMMANDS = {'vault': ['/usr/bin/vault-get', '--short']}
CMDS_PATH = 'pgadmin.utils.passexec.get_server_passexec_commands'


class PassexecNameConversionTestCase(BaseTestGenerator):
    """Pure tests for normalise_passexec_name."""

    scenarios = [
        ('owner none', dict(owner=True, value=None, expect=None)),
        ('owner empty', dict(owner=True, value='', expect=None)),
        ('owner __none__',
         dict(owner=True, value=PASSEXEC_NONE, expect=None)),
        ('owner name', dict(owner=True, value='vault', expect='vault')),
        ('owner unknown name',
         dict(owner=True, value='nope', expect=ValueError)),
        ('owner __inherit__',
         dict(owner=True, value=PASSEXEC_INHERIT, expect=ValueError)),
        ('non-owner __inherit__',
         dict(owner=False, value=PASSEXEC_INHERIT, expect=None)),
        ('non-owner none', dict(owner=False, value=None, expect='')),
        ('non-owner empty', dict(owner=False, value='', expect='')),
        ('non-owner __none__',
         dict(owner=False, value=PASSEXEC_NONE, expect='')),
        ('non-owner name',
         dict(owner=False, value='vault', expect='vault')),
        ('non-owner unknown name',
         dict(owner=False, value='nope', expect=ValueError)),
    ]

    def runTest(self):
        with patch(CMDS_PATH, return_value=COMMANDS):
            if self.expect is ValueError:
                with self.assertRaises(ValueError):
                    normalise_passexec_name(self.value, not self.owner)
            else:
                self.assertEqual(
                    normalise_passexec_name(self.value, not self.owner),
                    self.expect)


class PassexecNameForApiTestCase(BaseTestGenerator):
    """passexec_name_for_api is the inverse of normalise_passexec_name."""

    scenarios = [
        ('owner none', dict(non_owner=False, stored=None,
                            expect=PASSEXEC_NONE)),
        ('owner name', dict(non_owner=False, stored='vault',
                            expect='vault')),
        ('non-owner none', dict(non_owner=True, stored=None,
                                expect=PASSEXEC_INHERIT)),
        ('non-owner empty', dict(non_owner=True, stored='',
                                 expect=PASSEXEC_NONE)),
        ('non-owner name', dict(non_owner=True, stored='vault',
                                expect='vault')),
    ]

    def runTest(self):
        self.assertEqual(
            passexec_name_for_api(self.stored, self.non_owner),
            self.expect)


class PassexecPayloadHelpersTestCase(BaseTestGenerator):
    """prepare_passexec_data and passexec_api_fields, which carry the
    owner and non-owner rules for the create, update and properties
    views."""

    scenarios = [('helpers', dict())]

    def runTest(self):
        with patch(CMDS_PATH, return_value=COMMANDS):
            # Server mode: free-text command refused.
            with patch.object(config, 'SERVER_MODE', True):
                for non_owner in (False, True):
                    _, err = prepare_passexec_data(
                        {'passexec_cmd': 'echo x'}, non_owner)
                    self.assertIsNotNone(err)
                # Empty command key is dropped.
                data, err = prepare_passexec_data(
                    {'passexec_cmd': '', 'name': 'a'}, False)
                self.assertIsNone(err)
                self.assertEqual(data, {'name': 'a'})
                # Non-owner values map to SharedServer semantics.
                data, err = prepare_passexec_data(
                    {'passexec_name': PASSEXEC_NONE}, True)
                self.assertEqual(data['passexec_name'], '')
                data, err = prepare_passexec_data(
                    {'passexec_name': PASSEXEC_INHERIT}, True)
                self.assertIsNone(data['passexec_name'])
                data, err = prepare_passexec_data(
                    {'passexec_name': 'vault',
                     'passexec_expiration': 30}, True)
                self.assertEqual(data['passexec_name'], 'vault')
                # Owner may not inherit; unknown names refused.
                _, err = prepare_passexec_data(
                    {'passexec_name': PASSEXEC_INHERIT}, False)
                self.assertIsNotNone(err)
                _, err = prepare_passexec_data(
                    {'passexec_name': 'nope'}, True)
                self.assertIsNotNone(err)

            # Desktop mode: name dropped, command kept.
            with patch.object(config, 'SERVER_MODE', False):
                data, err = prepare_passexec_data(
                    {'passexec_name': 'vault', 'passexec_cmd': 'echo x'},
                    False)
                self.assertIsNone(err)
                self.assertEqual(data, {'passexec_cmd': 'echo x'})

        # Properties for a non-owner come from their SharedServer row,
        # never from the overlaid owner object.
        owner_obj = MagicMock(passexec_cmd='secret', passexec_name='vault',
                              passexec_expiration=99)
        with patch.object(config, 'SERVER_MODE', True):
            ss = MagicMock(passexec_name=None, passexec_expiration=None)
            fields = passexec_api_fields(owner_obj, ss, True)
            self.assertNotIn('passexec_cmd', fields)
            self.assertEqual(fields['passexec_name'], PASSEXEC_INHERIT)
            self.assertIsNone(fields['passexec_expiration'])
            ss = MagicMock(passexec_name='', passexec_expiration=5)
            fields = passexec_api_fields(owner_obj, ss, True)
            self.assertEqual(fields['passexec_name'], PASSEXEC_NONE)
            self.assertEqual(fields['passexec_expiration'], 5)
            fields = passexec_api_fields(owner_obj, None, False)
            self.assertNotIn('passexec_cmd', fields)
            self.assertEqual(fields['passexec_name'], 'vault')
            self.assertEqual(fields['passexec_expiration'], 99)
        with patch.object(config, 'SERVER_MODE', False):
            fields = passexec_api_fields(owner_obj, None, False)
            self.assertEqual(fields, {'passexec_cmd': 'secret',
                                      'passexec_expiration': 99})


class PassexecServerApiTestCase(BaseTestGenerator):
    """Owner create/update/properties through the real views, with the
    server-mode rules switched on by patching config.SERVER_MODE."""

    scenarios = [('api', dict())]

    def setUp(self):
        self.created = []
        self.url = '/browser/server/obj/{0}/'.format(utils.SERVER_GROUP)

    def tearDown(self):
        for sid in self.created:
            utils.delete_server_with_api(self.tester, sid)

    def _post(self, **extra):
        payload = dict(self.server)
        payload.pop('passexec_cmd', None)
        payload.update(extra)
        response = self.tester.post(
            self.url, data=json.dumps(payload), content_type='html/json')
        if response.status_code == 200:
            self.created.append(
                json.loads(response.data.decode('utf-8'))['node']['_id'])
        return response

    def _row(self, sid):
        conn = sqlite3.connect(config.TEST_SQLITE_PATH)
        try:
            conn.row_factory = sqlite3.Row
            return conn.execute(
                'SELECT passexec_cmd, passexec_name FROM server '
                'WHERE id=?', (sid,)).fetchone()
        finally:
            conn.close()

    def _props(self, sid):
        response = self.tester.get(self.url + str(sid))
        self.assertEqual(response.status_code, 200)
        return json.loads(response.data.decode('utf-8'))

    def runTest(self):
        with patch(CMDS_PATH, return_value=COMMANDS), \
                patch.object(config, 'SERVER_MODE', True):
            # 1. valid name stored and returned.
            r = self._post(passexec_name='vault')
            self.assertEqual(r.status_code, 200)
            sid = self.created[-1]
            self.assertEqual(self._row(sid)['passexec_name'], 'vault')
            props = self._props(sid)
            self.assertEqual(props['passexec_name'], 'vault')
            self.assertNotIn('passexec_cmd', props)

            # 2. unknown name refused.
            self.assertEqual(
                self._post(passexec_name='nope').status_code, 400)

            # 3a. free-text command refused in server mode.
            self.assertEqual(
                self._post(passexec_cmd='echo x').status_code, 400)

            # 4. owner may not choose inherit.
            r = self.tester.put(
                self.url + str(sid),
                data=json.dumps({'passexec_name': PASSEXEC_INHERIT}),
                content_type='html/json')
            self.assertEqual(r.status_code, 400)
            self.assertEqual(self._row(sid)['passexec_name'], 'vault')

            # Owner update to none clears it.
            r = self.tester.put(
                self.url + str(sid),
                data=json.dumps({'passexec_name': PASSEXEC_NONE}),
                content_type='html/json')
            self.assertEqual(r.status_code, 200)
            self.assertIsNone(self._row(sid)['passexec_name'])
            self.assertEqual(
                self._props(sid)['passexec_name'], PASSEXEC_NONE)

        with patch.object(config, 'SERVER_MODE', False):
            # 3b. desktop mode stores the command; 8. ignores the name.
            r = self._post(passexec_cmd='echo x', passexec_name='vault')
            self.assertEqual(r.status_code, 200)
            row = self._row(self.created[-1])
            self.assertEqual(row['passexec_cmd'], 'echo x')
            self.assertIsNone(row['passexec_name'])


class PassexecSharedServerUpdateTestCase(BaseTestGenerator):
    """Non-owner updates: _set_valid_attr_value stores the name and
    expiration on the SharedServer and leaves the owner's row alone."""

    scenarios = [('shared update', dict())]

    def runTest(self):
        from pgadmin.browser.server_groups.servers import ServerNode
        node = ServerNode.__new__(ServerNode)
        cmap = {'passexec_name': 'passexec_name',
                'passexec_expiration': 'passexec_expiration',
                'passexec_cmd': 'passexec_cmd'}
        srv_mod = 'pgadmin.browser.server_groups.servers'
        for api, stored in ((PASSEXEC_NONE, ''), (PASSEXEC_INHERIT, None),
                            ('vault', 'vault')):
            owner = MagicMock(shared=True, user_id=1, passexec_name='keep',
                              passexec_cmd=None, passexec_expiration=None)
            ss = MagicMock(passexec_name='old', passexec_expiration=None)
            with patch(CMDS_PATH, return_value=COMMANDS), \
                    patch.object(config, 'SERVER_MODE', True), \
                    patch(srv_mod + '.current_user', MagicMock(id=2)), \
                    patch(srv_mod + '.get_crypt_key',
                          return_value=(True, b'k')):
                data, err = prepare_passexec_data(
                    {'passexec_name': api, 'passexec_expiration': 30}, True)
                self.assertIsNone(err)
                node._set_valid_attr_value(1, data, cmap, owner, ss)
            self.assertEqual(ss.passexec_name, stored)
            self.assertEqual(ss.passexec_expiration, 30)
            self.assertEqual(owner.passexec_name, 'keep')
