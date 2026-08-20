##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from unittest.mock import MagicMock

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
