##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Helpers for tests that add pgAdmin User rows.

Each helper registers its undo with addCleanup() as soon as there is
something to undo, so it is undone even when setUp() fails part way,
when tearDown() is not called.
"""


def push_app_context(testcase):
    """Push an app context for the test, popped when the test ends."""
    ctx = testcase.app.app_context()
    ctx.push()
    testcase.addCleanup(ctx.pop)


def add_user(testcase, username, auth_source, role_name='User', email=None,
             password=None):
    """Add a User row, deleted with the rows it owns when the test ends.

    Logging a user in creates rows of their own, such as a server group,
    which a plain delete of the User row would leave behind for a user
    created later with the same id.
    """
    from pgadmin.model import db, Role, User

    with testcase.app.app_context():
        user = User(username=username,
                    email=username if email is None else email,
                    auth_source=auth_source,
                    active=True,
                    password=password,
                    roles=[Role.query.filter_by(name=role_name).first()])
        db.session.add(user)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        uid = user.id

    testcase.addCleanup(_delete_user, testcase, uid)
    return uid


def _delete_user(testcase, uid):
    from pgadmin.tools.user_management import delete_user

    with testcase.app.app_context():
        status, msg = delete_user(uid)
    testcase.assertTrue(status, msg)
