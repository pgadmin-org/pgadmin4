##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
from unittest.mock import MagicMock, patch

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.roles import RoleView


class RoleCheckPermissionTest(BaseTestGenerator):
    """Unit tests for RoleView._check_permission's ADMIN OPTION carve-out.

    A role holder who is neither a superuser nor a CREATEROLE holder, but
    who has been granted ADMIN OPTION on the specific role being updated,
    should be allowed through the permission gate so they can manage that
    role's membership - but only for 'update', never for 'drop', and the
    view should record that the request must be restricted to membership
    changes only.
    """
    scenarios = [
        ('Check Role Node', dict(url='/browser/role/obj/'))
    ]

    def setUp(self):
        pass

    def runTest(self):
        view = RoleView(cmd=None)
        view.manager = MagicMock()

        # Plain user, no admin option: update is forbidden.
        view.manager.user_info = {
            'is_superuser': False, 'can_create_role': False, 'id': 5
        }
        view.has_admin_option = False
        self.assertTrue(view._check_permission(True, 'update', {'rid': 10}))
        self.assertFalse(view.membership_only_update)

        # Same user, but with ADMIN OPTION on the target role: allowed
        # through, flagged as membership-only.
        view.has_admin_option = True
        self.assertFalse(view._check_permission(True, 'update', {'rid': 10}))
        self.assertTrue(view.membership_only_update)

        # ADMIN OPTION does not extend to dropping the role.
        self.assertTrue(view._check_permission(True, 'drop', {'rid': 10}))

        # Superusers are unaffected by the ADMIN OPTION check.
        view.manager.user_info = {
            'is_superuser': True, 'can_create_role': False, 'id': 5
        }
        view.has_admin_option = False
        self.assertFalse(view._check_permission(True, 'update', {'rid': 10}))

    def tearDown(self):
        pass


class RoleMembersOnlyUpdateRequestKeysTest(BaseTestGenerator):
    """Regression test for the membership-only update guard.

    _validate_rolemembers() mutates the request dict in place, adding
    derived keys ('rol_members_list', 'rol_members_revoked_list') that
    the client never sent. The membership-only update guard in
    RoleView.update() must check the client-supplied keys captured
    before that mutation (self.request_keys), not the mutated dict,
    otherwise a valid ADMIN OPTION request containing only 'rolmembers'
    would be wrongly rejected as forbidden.
    """
    scenarios = [
        ('Check Role Node', dict(url='/browser/role/obj/'))
    ]

    def setUp(self):
        pass

    def runTest(self):
        view = RoleView(cmd=None)
        view.manager = MagicMock()
        view.manager.version = 170000

        data = {
            'rolmembers': {
                'added': [
                    {'role': 'member_role', 'admin': True,
                     'inherit': True, 'set': True}
                ],
                'changed': [],
                'deleted': []
            }
        }

        # Mirror what validate_request() does: capture the client
        # supplied keys before running the validators.
        request_keys = set(data)

        # This mutates 'data' in place, adding derived keys.
        self.assertIsNone(view._validate_rolemembers(10, data))
        self.assertIn('rol_members_list', data)

        # The mutated dict is no longer a subset of {'rolmembers'} ...
        self.assertFalse(set(data) <= {'rolmembers'})

        # ... but the keys captured before mutation still are, so the
        # membership-only guard (which must use request_keys) allows
        # the request through instead of returning 403.
        self.assertTrue(request_keys <= {'rolmembers'})

    def tearDown(self):
        pass


class RoleUpdateAdminOptionMembershipOnlyTest(BaseTestGenerator):
    """End-to-end regression test for the ADMIN OPTION membership-only
    update guard.

    The two tests above exercise _check_permission() and
    _validate_rolemembers() individually, but neither actually calls
    validate_request() or RoleView.update(), so a regression that broke
    how those two decorators interact (e.g. the membership-only guard
    reading the wrong dict, or request_keys being set/consumed at the
    wrong point in the chain) would slip past them.

    This test drives RoleView.update() through its real decorator chain
    (check_precondition -> validate_request -> update) with the driver,
    connection and SQL rendering mocked out, submitting a 'rolmembers'
    -only body as a user who holds ADMIN OPTION on the target role (but
    is neither a superuser nor a CREATEROLE holder), and asserts the
    request is NOT rejected with 403.
    """
    scenarios = [
        ('Check Role Node', dict(url='/browser/role/obj/'))
    ]

    def setUp(self):
        pass

    @patch('pgadmin.browser.server_groups.servers.roles.get_driver')
    @patch('pgadmin.browser.server_groups.servers.roles.render_template')
    def runTest(self, render_template_mock, get_driver_mock):
        view = RoleView(cmd=None)

        manager = MagicMock()
        manager.version = 170000
        manager.db_info = None
        manager.user_info = {
            'is_superuser': False, 'can_create_role': False, 'id': 5
        }

        conn = MagicMock()
        conn.connected.return_value = True
        # Used for the permission lookup, the ALTER ROLE, and the
        # post-update node fetch alike; has_admin_option=True is what
        # drives the ADMIN OPTION carve-out in _check_permission().
        conn.execute_dict.return_value = (True, {'rows': [{
            'rolname': 'grp_role', 'rolcanlogin': False, 'rolsuper': False,
            'has_admin_option': True, 'description': None
        }]})
        manager.connection.return_value = conn

        get_driver_mock.return_value.connection_manager.return_value = \
            manager

        # The client sends only 'rolmembers' - exactly what an ADMIN
        # OPTION holder (who may manage membership only) is allowed to
        # change.
        body = {
            'rolmembers': {
                'added': [
                    {'role': 'member_role', 'admin': True,
                     'inherit': True, 'set': True}
                ],
                'changed': [],
                'deleted': []
            }
        }

        with self.app.test_request_context(
            data=json.dumps(body), content_type='application/json'
        ):
            response = view.update(gid=1, sid=1, rid=10)

        # The real _check_permission() call, driven off the mocked
        # has_admin_option row, must have flagged this as a
        # membership-only update ...
        self.assertTrue(view.membership_only_update)
        # ... and update() must let it through rather than forbidding it.
        self.assertNotEqual(response.status_code, 403)

    def tearDown(self):
        pass
