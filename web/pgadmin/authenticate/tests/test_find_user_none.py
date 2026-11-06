##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that looking an account up by a missing email finds none, rather
than an account without an email.
"""

from flask import current_app

from pgadmin.model import db, User
from pgadmin.utils.constants import INTERNAL
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.user_utils import add_user

USERNAME = 'find-user-none@example.com'


class FindUserNoneTestCase(BaseTestGenerator):
    """find_user(email=None) does not match an account with no email."""

    scenarios = [
        ('Look up a missing email, matching case',
         dict(case_insensitive=False)),
        ('Look up a missing email, ignoring case',
         dict(case_insensitive=True)),
    ]

    def setUp(self):
        uid = add_user(self, USERNAME, INTERNAL)
        with self.app.app_context():
            db.session.get(User, uid).email = None
            db.session.commit()

    def runTest(self):
        with self.app.app_context():
            datastore = current_app.extensions['security'].datastore
            self.assertIsNone(datastore.find_user(
                case_insensitive=self.case_insensitive, email=None))
