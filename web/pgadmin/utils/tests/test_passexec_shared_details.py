##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################

"""The server details passed to a server-mode password exec command must
come from the server's own row, so that a user cannot copy a shared
server's connection details into a server of their own, or file the
shared server in a group of their own, and be mistaken for a user the
server was shared with."""

import uuid
from unittest.mock import MagicMock, patch

from pgadmin.model import db, Server, ServerGroup, SharedServer, User
from pgadmin.utils.constants import INTERNAL, OAUTH2
from pgadmin.utils.driver.psycopg3 import Driver
from pgadmin.utils.passexec import build_passexec
from pgadmin.utils.route import BaseTestGenerator


class TestPassexecSharedServerDetails(BaseTestGenerator):
    """An administrator shares a server in their 'Production' group. Another
    user files it under their own 'Mine' group, and also creates a server
    of their own with the same host and username, in a group of their own
    that is also called 'Production'."""

    def setUp(self):
        self.created = []
        tag = uuid.uuid4().hex[:8]
        with self.app.app_context():
            admin = self._add(User(
                username='pe-admin-{0}@example.com'.format(tag),
                email=None, active=True, auth_source=INTERNAL,
                fs_uniquifier=uuid.uuid4().hex))
            user = self._add(User(
                username='pe-user-{0}@example.com'.format(tag),
                email=None, active=True, auth_source=OAUTH2,
                fs_uniquifier=uuid.uuid4().hex))
            admin_group = self._add(
                ServerGroup(user_id=admin.id, name='Production'))
            user_group = self._add(
                ServerGroup(user_id=user.id, name='Mine'))
            lookalike_group = self._add(
                ServerGroup(user_id=user.id, name='Production'))
            shared = self._add(Server(
                user_id=admin.id, servergroup_id=admin_group.id,
                name='shared', host='db.example.com', port=5432,
                maintenance_db='postgres', username='app',
                save_password=0, shared=True, passexec_name='vault'))
            self._add(SharedServer(
                osid=shared.id, user_id=user.id,
                server_owner=admin.username,
                servergroup_id=user_group.id, name='shared',
                host='db.example.com', port=5432,
                maintenance_db='postgres', username='app',
                save_password=0, shared=True, passexec_name=None))
            own = self._add(Server(
                user_id=user.id, servergroup_id=lookalike_group.id,
                name='lookalike', host='db.example.com', port=5432,
                maintenance_db='postgres', username='app',
                save_password=0, shared=False, passexec_name='vault'))

            self.admin = (admin.id, admin.username)
            self.user = MagicMock(id=user.id, username=user.username,
                                  auth_source=OAUTH2,
                                  fs_uniquifier=user.fs_uniquifier,
                                  is_authenticated=True)
            self.shared_id = shared.id
            self.own_id = own.id

    def _add(self, obj):
        db.session.add(obj)
        db.session.commit()
        self.created.append(obj)
        return obj

    def _env(self, sid):
        with self.app.test_request_context('/'), \
                patch('pgadmin.utils.passexec.config.SERVER_MODE', True), \
                patch('pgadmin.utils.passexec.config.'
                      'SERVER_PASSEXEC_COMMANDS',
                      {'vault': ['/bin/get-pass']}, create=True), \
                patch('pgadmin.utils.passexec.current_user', self.user), \
                patch('pgadmin.utils.driver.psycopg3.current_user',
                      self.user):
            # Build from what the connection manager would be built from:
            # for the shared server, the user's overlay.
            source = Driver._manager_source(Server.query.get(sid))
            return build_passexec(source).env

    def runTest(self):
        env = self._env(self.shared_id)
        self.assertEqual(env['PGADMIN_PASSEXEC_SHARED'], 'true')
        self.assertEqual(env['PGADMIN_PASSEXEC_SERVER_ID'],
                         str(self.shared_id))
        self.assertEqual(env['PGADMIN_PASSEXEC_SERVER_OWNER'],
                         self.admin[1])
        self.assertEqual(env['PGADMIN_PASSEXEC_SERVER_OWNER_AUTH_SOURCE'],
                         INTERNAL)
        # The owner's group, not the one the user filed it under.
        self.assertEqual(env['PGADMIN_PASSEXEC_SERVER_GROUP'], 'Production')
        self.assertEqual(env['PGADMIN_PASSEXEC_PGADMIN_USER'],
                         self.user.username)

        # The user's own copy has the same connection details and group
        # name, but is identified as theirs.
        own = self._env(self.own_id)
        for k in ('HOST', 'PORT', 'USERNAME', 'DATABASE', 'SERVER_GROUP'):
            self.assertEqual(own['PGADMIN_PASSEXEC_' + k],
                             env['PGADMIN_PASSEXEC_' + k])
        self.assertEqual(own['PGADMIN_PASSEXEC_SHARED'], 'false')
        self.assertEqual(own['PGADMIN_PASSEXEC_SERVER_ID'], str(self.own_id))
        self.assertEqual(own['PGADMIN_PASSEXEC_SERVER_OWNER'],
                         self.user.username)
        self.assertEqual(own['PGADMIN_PASSEXEC_SERVER_OWNER_AUTH_SOURCE'],
                         OAUTH2)

    def tearDown(self):
        with self.app.app_context():
            for obj in reversed(self.created):
                obj = db.session.merge(obj)
                db.session.delete(obj)
            db.session.commit()
