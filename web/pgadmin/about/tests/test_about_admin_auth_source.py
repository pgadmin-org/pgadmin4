##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that the About box shows the configuration only to a user with
the Administrator role, not to a user whose email address is that of an
administrator's account from another auth source.
"""

import json

from flask_security import login_user, logout_user

from pgadmin.model import db, User
from pgadmin.utils.constants import LDAP
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.user_utils import add_user
from regression.test_setup import config_data


class AboutAdminAuthSourceTestCase(BaseTestGenerator):
    """The About box decides who is an administrator by the user's role."""

    scenarios = [
        ('Non-admin LDAP user with the internal admin\'s email',
         dict()),
    ]

    def setUp(self):
        # The test account is an internal administrator.
        admin_email = config_data['pgAdmin4_login_credentials'][
            'login_username']
        self.uid = add_user(self, 'about-ldap-user', LDAP,
                            email=admin_email)

    def runTest(self):
        from pgadmin.about import index

        with self.app.test_request_context(
                '/about/', headers={'User-Agent': 'Mozilla/5.0'}):
            login_user(db.session.get(User, self.uid))
            try:
                response = index()
            finally:
                logout_user()

        data = json.loads(response.data)['data']
        self.assertFalse(data['admin'])
        self.assertNotIn('settings', data)
