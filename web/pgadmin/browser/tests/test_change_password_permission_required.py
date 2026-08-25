##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""RBAC regression: the self-service change-password route must honour the
'change_password' permission.

AllPermissionTypes.change_password exists in the permission catalogue and
is presented in Role management as a toggle ("Change Password"), but
browser.change_password never checked it -- it relied on
@pga_login_required alone. An administrator who explicitly revoked this
permission from a role (e.g. to force password changes through an
external identity provider only) had that restriction silently ignored:
any authenticated user under that role could still change their own
password through the in-app form regardless.

Note this is lower severity than the tool-RBAC gaps it sits alongside: the
route is inherently self-scoped (a user can only ever change their own
password, never another user's), so the impact is a policy-enforcement
gap rather than a privilege-escalation or cross-tenant data exposure.

Skipped in DESKTOP mode, where every request is auto-authenticated as the
all-permissions DESKTOP_USER and no permission decorator is exercisable.
"""

import config

from pgadmin.utils.route import BaseTestGenerator
from regression.test_setup import config_data
from regression.python_test_utils.test_utils import \
    create_user_wise_test_client

test_user_details = None
if config.SERVER_MODE:
    test_user_details = config_data['pgAdmin4_test_non_admin_credentials']


class ChangePasswordPermissionRequiredTestCase(BaseTestGenerator):
    """A user lacking the change_password permission must get 403 from
    browser.change_password, not just from tool routes."""

    scenarios = [
        ('browser.change_password requires change_password permission',
         dict()),
    ]

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest(
                'Permission decorators are only exercisable in SERVER '
                'mode; DESKTOP mode auto-authenticates as the '
                'all-permissions DESKTOP_USER on every request.'
            )
        if not (hasattr(config, 'SECURITY_CHANGEABLE') and
                config.SECURITY_CHANGEABLE):
            self.skipTest(
                'browser.change_password is only registered when '
                'SECURITY_CHANGEABLE is enabled.'
            )

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        response = self.tester.get('/browser/change_password',
                                   follow_redirects=False)

        self.assertEqual(
            response.status_code, 403,
            'browser.change_password did not enforce the change_password '
            'permission for a user lacking it: expected 403, got {0}. '
            'Body: {1!r}'.format(
                response.status_code, response.data[:200]
            )
        )

    def tearDown(self):
        pass
