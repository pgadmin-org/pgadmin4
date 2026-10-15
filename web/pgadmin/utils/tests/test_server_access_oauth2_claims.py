##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for restricting shared servers with an OAuth2 server group
claim (OAUTH2_SERVER_GROUP_CLAIM)."""

import uuid
from unittest.mock import MagicMock, patch

from flask import session

from pgadmin.model import db, Server, ServerGroup, User
from pgadmin.utils.constants import INTERNAL, OAUTH2
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils import server_access

# Sentinel meaning the session key is not set at all.
NOT_SET = object()


class ServerAccessOAuth2ClaimsTestCase(BaseTestGenerator):
    """Check which groups and servers a user can see for a given claim.

    Another user owns three groups: 'Granted' and 'Other' each hold a
    shared server, and 'Private' holds a server that isn't shared. The
    viewer owns 'Mine', holding their own server.
    """

    scenarios = [
        ('Non-OAuth2 user sees all shared servers', dict(
            auth_source=INTERNAL,
            claims=['Granted'],
            hide_shared=False,
            expected_groups=['Mine', 'Granted', 'Other'],
            expected_servers=['mine', 'granted', 'other'],
        )),
        ('OAuth2 user without a configured claim sees all shared servers',
         dict(
             auth_source=OAUTH2,
             claims=NOT_SET,
             hide_shared=False,
             expected_groups=['Mine', 'Granted', 'Other'],
             expected_servers=['mine', 'granted', 'other'],
         )),
        ('OAuth2 claim restricts shared servers to granted groups', dict(
            auth_source=OAUTH2,
            claims=['Granted'],
            hide_shared=False,
            expected_groups=['Mine', 'Granted'],
            expected_servers=['mine', 'granted'],
        )),
        ('Missing OAuth2 claim hides all other users\' shared servers', dict(
            auth_source=OAUTH2,
            claims=[],
            hide_shared=False,
            expected_groups=['Mine'],
            expected_servers=['mine'],
        )),
        ('OAuth2 claim does not grant servers that are not shared', dict(
            auth_source=OAUTH2,
            claims=['Private'],
            hide_shared=False,
            expected_groups=['Mine'],
            expected_servers=['mine'],
        )),
        ('hide_shared ignores groups granted by the OAuth2 claim', dict(
            auth_source=OAUTH2,
            claims=['Granted', 'Private'],
            hide_shared=True,
            expected_groups=['Mine'],
            expected_servers=['mine', 'granted'],
        )),
    ]

    def setUp(self):
        self.created = []
        with self.app.app_context():
            owner = self._add(User(
                username='sa-owner-{0}@example.com'.format(
                    uuid.uuid4().hex[:8]),
                email=None, active=True, auth_source=INTERNAL,
                fs_uniquifier=uuid.uuid4().hex))
            viewer = self._add(User(
                username='sa-viewer-{0}@example.com'.format(
                    uuid.uuid4().hex[:8]),
                email=None, active=True, auth_source=self.auth_source,
                fs_uniquifier=uuid.uuid4().hex))

            self.server_ids = {}
            for owner_id, group_name, server_name, shared in (
                (owner.id, 'Granted', 'granted', True),
                (owner.id, 'Other', 'other', True),
                (owner.id, 'Private', 'private', False),
                (viewer.id, 'Mine', 'mine', False),
            ):
                group = self._add(
                    ServerGroup(user_id=owner_id, name=group_name))
                server = self._add(Server(
                    user_id=owner_id, servergroup_id=group.id,
                    name=server_name, host='192.0.2.1', port=5432,
                    maintenance_db='postgres', username='postgres',
                    save_password=0, shared=shared))
                self.server_ids[server_name] = server.id

            self.owner_id = owner.id
            self.viewer_id = viewer.id

    def _add(self, obj):
        db.session.add(obj)
        db.session.commit()
        self.created.append(obj)
        return obj

    def runTest(self):
        viewer = MagicMock(id=self.viewer_id, auth_source=self.auth_source)

        with self.app.test_request_context('/'), \
                patch.object(server_access, 'current_user', viewer), \
                patch.object(server_access.config, 'SERVER_MODE', True):
            if self.claims is not NOT_SET:
                session['oauth2_server_group_claims'] = self.claims

            groups = server_access.get_server_groups_for_user(
                hide_shared=self.hide_shared)
            self.assertEqual(
                [g.name for g in groups if g.user_id in
                 (self.owner_id, self.viewer_id)],
                self.expected_groups)

            # Only check the rows this test created; the test database
            # may hold servers belonging to other tests.
            visible = {
                s.name for s in server_access.get_user_server_query()
                .filter(Server.id.in_(self.server_ids.values()))
            }
            self.assertEqual(visible, set(self.expected_servers))

            for name, sid in self.server_ids.items():
                server = server_access.get_server(sid)
                if name in self.expected_servers:
                    self.assertIsNotNone(
                        server, '{0} should be accessible'.format(name))
                else:
                    self.assertIsNone(
                        server, '{0} should not be accessible'.format(name))

    def tearDown(self):
        with self.app.app_context():
            for obj in reversed(self.created):
                obj = db.session.merge(obj)
                db.session.delete(obj)
            db.session.commit()
