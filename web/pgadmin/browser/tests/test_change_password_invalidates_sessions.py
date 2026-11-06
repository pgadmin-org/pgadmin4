##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import os
import sqlite3
import uuid
from unittest.mock import MagicMock, patch

import config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils

# The runner keeps one application context alive for the whole suite, and
# Flask reuses it for each request, so Flask-Login's cached user in g could
# in principle leak from one test client to another. These tests do not
# depend on that not happening by assumption: without the uniquifier
# rotation every revocation scenario fails (the other client still gets
# 200), the administrator reset goes through a route only an Administrator
# can use, and the forgot-password client goes through a route only an
# anonymous user can use, so each client really runs as itself.


def _get_fs_uniquifier(email):
    """Read a user's fs_uniquifier straight from the config database."""
    conn = sqlite3.connect(config.TEST_SQLITE_PATH)
    try:
        cur = conn.cursor()
        cur.execute('SELECT fs_uniquifier FROM user WHERE email = ?',
                    (email,))
        row = cur.fetchone()
        return row[0] if row else None
    finally:
        conn.close()


class ChangePasswordInvalidatesSessionsTestCase(BaseTestGenerator):
    """
    A user's active sessions are identified by their fs_uniquifier: every
    request re-validates the session's stored uniquifier against the one in
    the database (_user_loader -> find_user(fs_uniquifier=...)). Rotating it
    therefore invalidates every other session for that user (CWE-613).

    This validates that when a user changes their own password, a second,
    independently logged-in session for the same user is rejected afterwards,
    while the current session stays authenticated. A failed change must leave
    all sessions untouched.
    """

    scenarios = [
        ('A successful password change invalidates the user\'s other session',
         dict(current_password='initial_password',
              new_password='reassigned_password',
              expect_invalidated=True)),

        ('A failed password change leaves the other session authenticated',
         dict(current_password=str(uuid.uuid4())[4:8],
              new_password='reassigned_password',
              expect_invalidated=False)),
    ]

    def setUp(self):
        self.username = 'session_inval_' + str(uuid.uuid4())[:8] + \
            '@example.com'
        self.initial_password = 'initial_password'

        # Create the normal user as the administrator.
        response = self.tester.post(
            '/user_management/save',
            data=json.dumps({
                "auth_source": "internal",
                "email": self.username,
                "role": "2",
                "active": True,
                "newPassword": self.initial_password,
                "confirmPassword": self.initial_password,
                "locked": False
            }),
            content_type='application/json',
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 200,
                         'User creation is NOT successful')

        response = self.tester.get('/user_management/user/')
        users = json.loads(response.data.decode('utf-8'))
        self.user_id = next(
            (u['id'] for u in users if u['email'] == self.username), None)
        self.assertIsNotNone(self.user_id, 'Newly created user id is None')

        # Current session: log in as the normal user so change_password acts
        # on this account.
        self.tester.logout()
        response = self.tester.login(self.username, self.initial_password,
                                     True)
        self.assertEqual(response.status_code, 200)

        # A second, independent session for the same user (e.g. another
        # browser), which a successful password change must invalidate.
        self.other_client = self.app.test_client()
        self.other_client.setApp(self.app)
        response = self.other_client.login(
            self.username, self.initial_password, True)
        self.assertEqual(response.status_code, 200)
        # Sanity check: the second session is authenticated to begin with.
        self.assertEqual(
            self.other_client.get('/browser/change_password').status_code,
            200)

    def runTest(self):
        before = _get_fs_uniquifier(self.username)

        # Change the password from the current session.
        response = self.tester.get('/browser/change_password',
                                   follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        csrf_token = self.tester.fetch_csrf(response)
        self.tester.post(
            '/browser/change_password',
            data=json.dumps(dict(
                password=self.current_password,
                new_password=self.new_password,
                new_password_confirm=self.new_password,
                csrf_token=csrf_token,
            )),
            content_type='application/json',
            follow_redirects=True
        )

        after = _get_fs_uniquifier(self.username)
        other_status = self.other_client.get(
            '/browser/change_password').status_code

        if self.expect_invalidated:
            # The uniquifier rotated, so the other session is now rejected.
            self.assertNotEqual(before, after,
                                'fs_uniquifier was not rotated')
            self.assertNotEqual(
                other_status, 200,
                'The other session is still authenticated after a password '
                'change (CWE-613)')
            # The session that changed the password stays logged in.
            self.assertEqual(
                self.tester.get('/browser/change_password').status_code, 200,
                'Current session was logged out after changing its own '
                'password')
        else:
            # A rejected change must not disturb any session.
            self.assertEqual(before, after,
                             'fs_uniquifier changed on a failed change')
            self.assertEqual(
                other_status, 200,
                'The other session was invalidated by a failed change')

    def tearDown(self):
        self.other_client.logout()
        self.tester.logout()
        test_utils.login_tester_account(self.tester)
        self.tester.delete(
            '/user_management/save/{0}'.format(self.user_id),
            follow_redirects=True
        )


class ForgotPasswordInvalidatesSessionsTestCase(BaseTestGenerator):
    """
    The forgot-password reset (anonymous recovery via an emailed token) must
    also end the user's existing sessions. The reset_password(token) route
    calls Flask-Security's update_password(), which rotates fs_uniquifier. This
    validates that after a reset, the user's independently logged-in session is
    rejected (CWE-613). The reset-notice email is suppressed so the test does
    not depend on a mail server.
    """

    scenarios = [
        ('A forgot-password reset invalidates the user\'s session', dict()),
    ]

    def setUp(self):
        self.username = 'forgot_pw_' + str(uuid.uuid4())[:8] + \
            '@example.com'
        self.initial_password = 'initial_password'

        # Create the normal user as the administrator.
        response = self.tester.post(
            '/user_management/save',
            data=json.dumps({
                "auth_source": "internal",
                "email": self.username,
                "role": "2",
                "active": True,
                "newPassword": self.initial_password,
                "confirmPassword": self.initial_password,
                "locked": False
            }),
            content_type='application/json',
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 200,
                         'User creation is NOT successful')

        response = self.tester.get('/user_management/user/')
        users = json.loads(response.data.decode('utf-8'))
        self.user_id = next(
            (u['id'] for u in users if u['email'] == self.username), None)
        self.assertIsNotNone(self.user_id, 'Newly created user id is None')

        # The user's own session, in a second client.
        self.user_client = self.app.test_client()
        self.user_client.setApp(self.app)
        response = self.user_client.login(
            self.username, self.initial_password, True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.user_client.get('/browser/change_password').status_code, 200)

    def runTest(self):
        from flask_security.recoverable import generate_reset_password_token
        from pgadmin.model import User

        before = _get_fs_uniquifier(self.username)

        # The reset route is @anonymous_user_required, so a fresh, logged-out
        # client performs the reset with a freshly minted token.
        anon = self.app.test_client()
        anon.setApp(self.app)
        with self.app.test_request_context():
            user = User.query.filter_by(email=self.username).first()
            token = generate_reset_password_token(user)

        new_password = 'forgot_reset_password'
        # Suppress the reset-notice email so update_password() completes
        # without a mail server; the fs_uniquifier rotation happens regardless.
        with patch('flask_security.recoverable.send_password_reset_notice'):
            get_res = anon.get('/browser/reset_password/' + token)
            csrf_token = anon.fetch_csrf(get_res)
            anon.post(
                '/browser/reset_password/' + token,
                data=dict(
                    password=new_password,
                    password_confirm=new_password,
                    csrf_token=csrf_token,
                ),
                follow_redirects=True
            )

        after = _get_fs_uniquifier(self.username)
        self.assertNotEqual(
            before, after,
            'fs_uniquifier was not rotated on a forgot-password reset')
        self.assertNotEqual(
            self.user_client.get('/browser/change_password').status_code, 200,
            'The user session survived a forgot-password reset (CWE-613)')

    def tearDown(self):
        self.user_client.logout()
        test_utils.login_tester_account(self.tester)
        self.tester.delete(
            '/user_management/save/{0}'.format(self.user_id),
            follow_redirects=True
        )


class CliResetInvalidatesSessionsTestCase(BaseTestGenerator):
    """
    A password reset from the command line (setup.py update-user --password,
    the remediation path an administrator uses to recover a compromised
    account) must also end that user's existing sessions. The CLI is a separate
    process; it shares the uniquifier via the config database, which the server
    re-reads on every request. This runs the real CLI against the test config
    database while a session is live and asserts that session is then rejected
    (CWE-613).
    """

    scenarios = [
        ('A CLI password reset invalidates the user\'s session', dict()),
    ]

    def setUp(self):
        self.username = 'cli_reset_' + str(uuid.uuid4())[:8] + \
            '@example.com'
        self.initial_password = 'initial_password'

        response = self.tester.post(
            '/user_management/save',
            data=json.dumps({
                "auth_source": "internal",
                "email": self.username,
                "role": "2",
                "active": True,
                "newPassword": self.initial_password,
                "confirmPassword": self.initial_password,
                "locked": False
            }),
            content_type='application/json',
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 200,
                         'User creation is NOT successful')

        response = self.tester.get('/user_management/user/')
        users = json.loads(response.data.decode('utf-8'))
        self.user_id = next(
            (u['id'] for u in users if u['email'] == self.username), None)
        self.assertIsNotNone(self.user_id, 'Newly created user id is None')

        # The user's own session, in a second client.
        self.user_client = self.app.test_client()
        self.user_client.setApp(self.app)
        response = self.user_client.login(
            self.username, self.initial_password, True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.user_client.get('/browser/change_password').status_code, 200)

    def runTest(self):
        import os
        import subprocess
        import sys

        import pgadmin

        before = _get_fs_uniquifier(self.username)

        # Run the real CLI in a separate process, pointed at the same config
        # database the in-process server is using.
        web_dir = os.path.dirname(os.path.dirname(pgadmin.__file__))
        result = subprocess.run(
            [sys.executable, 'setup.py', 'update-user', self.username,
             '--password', 'cli_reset_password', '--role', 'User',
             '--sqlite-path', config.TEST_SQLITE_PATH],
            cwd=web_dir, capture_output=True, text=True, timeout=180
        )
        self.assertEqual(
            result.returncode, 0,
            'setup.py update-user failed: {0}'.format(result.stderr))

        after = _get_fs_uniquifier(self.username)
        self.assertNotEqual(
            before, after,
            'fs_uniquifier was not rotated by a CLI password reset')
        self.assertNotEqual(
            self.user_client.get('/browser/change_password').status_code, 200,
            'The user session survived a CLI password reset (CWE-613)')

    def tearDown(self):
        self.user_client.logout()
        test_utils.login_tester_account(self.tester)
        self.tester.delete(
            '/user_management/save/{0}'.format(self.user_id),
            follow_redirects=True
        )


class AdminResetInvalidatesSessionsTestCase(BaseTestGenerator):
    """
    An administrator resetting a user's password (the recovery path for a
    compromised account) must also end that user's existing sessions. This
    validates that after an admin reset via POST /user_management/save, the
    user's independently logged-in session is rejected.
    """

    scenarios = [
        ('An admin password reset invalidates the user\'s session', dict()),
    ]

    def setUp(self):
        self.username = 'admin_reset_' + str(uuid.uuid4())[:8] + \
            '@example.com'
        self.initial_password = 'initial_password'

        # Create the normal user as the administrator (current session stays
        # logged in as the administrator).
        response = self.tester.post(
            '/user_management/save',
            data=json.dumps({
                "auth_source": "internal",
                "email": self.username,
                "role": "2",
                "active": True,
                "newPassword": self.initial_password,
                "confirmPassword": self.initial_password,
                "locked": False
            }),
            content_type='application/json',
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 200,
                         'User creation is NOT successful')

        response = self.tester.get('/user_management/user/')
        users = json.loads(response.data.decode('utf-8'))
        self.user_id = next(
            (u['id'] for u in users if u['email'] == self.username), None)
        self.assertIsNotNone(self.user_id, 'Newly created user id is None')

        # The user's own session, in a second client.
        self.user_client = self.app.test_client()
        self.user_client.setApp(self.app)
        response = self.user_client.login(
            self.username, self.initial_password, True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.user_client.get('/browser/change_password').status_code, 200)

    def runTest(self):
        before = _get_fs_uniquifier(self.username)

        # Administrator resets the user's password.
        response = self.tester.post(
            '/user_management/save',
            data=json.dumps({
                "id": self.user_id,
                "newPassword": 'admin_reset_password',
                "confirmPassword": 'admin_reset_password',
            }),
            content_type='application/json',
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 200,
                         'Admin password reset was not successful')

        after = _get_fs_uniquifier(self.username)
        self.assertNotEqual(
            before, after,
            'fs_uniquifier was not rotated on an admin password reset')
        self.assertNotEqual(
            self.user_client.get('/browser/change_password').status_code, 200,
            'The user session survived an admin password reset (CWE-613)')

    def tearDown(self):
        self.user_client.logout()
        test_utils.login_tester_account(self.tester)
        self.tester.delete(
            '/user_management/save/{0}'.format(self.user_id),
            follow_redirects=True
        )


class ReencryptFailureStillRevokesSessionsTestCase(BaseTestGenerator):
    """
    change_password() re-encrypts the user's saved server passwords after
    changing the password. The uniquifier rotation is committed with the new
    password before the re-encryption, so a re-encryption failure cannot
    leave the new password persisted with the old uniquifier - which would
    keep the user's other sessions authenticated (CWE-613). This forces the
    re-encryption to fail and asserts that the other session is still
    revoked, and that the change is still reported as done, with the saved
    passwords cleared, since the password has in fact changed.
    """

    scenarios = [
        ('A re-encryption failure after the change still invalidates the '
         'other session', dict()),
    ]

    def setUp(self):
        self.username = 'reenc_fail_' + str(uuid.uuid4())[:8] + \
            '@example.com'
        self.initial_password = 'initial_password'

        response = self.tester.post(
            '/user_management/save',
            data=json.dumps({
                "auth_source": "internal",
                "email": self.username,
                "role": "2",
                "active": True,
                "newPassword": self.initial_password,
                "confirmPassword": self.initial_password,
                "locked": False
            }),
            content_type='application/json',
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 200,
                         'User creation is NOT successful')

        response = self.tester.get('/user_management/user/')
        users = json.loads(response.data.decode('utf-8'))
        self.user_id = next(
            (u['id'] for u in users if u['email'] == self.username), None)
        self.assertIsNotNone(self.user_id, 'Newly created user id is None')

        # Current session: log in as the normal user so change_password acts
        # on this account.
        self.tester.logout()
        response = self.tester.login(self.username, self.initial_password,
                                     True)
        self.assertEqual(response.status_code, 200)

        # A second, independent session for the same user, which the change
        # must invalidate even though re-encryption fails.
        self.other_client = self.app.test_client()
        self.other_client.setApp(self.app)
        response = self.other_client.login(
            self.username, self.initial_password, True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.other_client.get('/browser/change_password').status_code,
            200)

    def runTest(self):
        before = _get_fs_uniquifier(self.username)

        response = self.tester.get('/browser/change_password',
                                   follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        csrf_token = self.tester.fetch_csrf(response)

        # Make the per-server re-encryption blow up. The route imports it from
        # this module at call time, so patching the source attribute takes
        # effect. Before the fix this ran before the uniquifier rotation, so
        # the rotation was skipped and the other session survived.
        with patch('pgadmin.browser.server_groups.servers.utils'
                   '.reencrpyt_server_passwords',
                   side_effect=Exception('forced re-encryption failure')):
            response = self.tester.post(
                '/browser/change_password',
                data=json.dumps(dict(
                    password=self.initial_password,
                    new_password='reassigned_password',
                    new_password_confirm='reassigned_password',
                    csrf_token=csrf_token,
                )),
                content_type='application/json',
                follow_redirects=True
            )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            json.loads(response.data)['data']['passwords_cleared'], -1)

        after = _get_fs_uniquifier(self.username)
        self.assertNotEqual(
            before, after,
            'fs_uniquifier was not rotated when re-encryption failed')
        self.assertNotEqual(
            self.other_client.get('/browser/change_password').status_code, 200,
            'The other session survived a password change whose re-encryption '
            'failed (CWE-613)')

    def tearDown(self):
        self.other_client.logout()
        self.tester.logout()
        test_utils.login_tester_account(self.tester)
        self.tester.delete(
            '/user_management/save/{0}'.format(self.user_id),
            follow_redirects=True
        )


class ReencryptClearsUndecryptablePasswordTestCase(BaseTestGenerator):
    """
    A login-password change re-encrypts the user's saved server passwords. If
    one server's saved password can no longer be decrypted (saved under a
    still-older key), it must be cleared while the others are still
    re-encrypted, rather than failing the whole change and leaving good saved
    passwords unreadable. This exercises the real reencrpyt_server_passwords()
    with just one server's decryption forced to fail (first server fails, a
    later one succeeds).
    """

    scenarios = [
        ('An undecryptable saved password is cleared; others re-encrypt',
         dict()),
    ]

    def setUp(self):
        from pgadmin.model import db, Server, ServerGroup, User
        from pgadmin.utils.crypto import encrypt

        self.old_key = 'old-reenc-key'
        self.new_key = 'new-reenc-key'
        self.username = 'reenc_tol_' + str(uuid.uuid4())[:8] + \
            '@example.com'

        response = self.tester.post(
            '/user_management/save',
            data=json.dumps({
                "auth_source": "internal",
                "email": self.username,
                "role": "2",
                "active": True,
                "newPassword": 'initial_password',
                "confirmPassword": 'initial_password',
                "locked": False
            }),
            content_type='application/json',
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 200,
                         'User creation is NOT successful')

        with self.app.app_context():
            self.uid = User.query.filter_by(email=self.username).one().id

            group = ServerGroup(user_id=self.uid, name='reenc_tol_group')
            db.session.add(group)
            db.session.flush()
            self.group_id = group.id

            # First server: saved under an unrelated key, so it cannot be
            # decrypted with old_key. Second: saved correctly under old_key.
            bad = Server(user_id=self.uid, servergroup_id=group.id,
                         name='reenc_bad', host='localhost', port=5432,
                         maintenance_db='postgres', username='u',
                         save_password=1,
                         password=encrypt('secret-bad', self.old_key))
            good = Server(user_id=self.uid, servergroup_id=group.id,
                          name='reenc_good', host='localhost', port=5432,
                          maintenance_db='postgres', username='u',
                          save_password=1,
                          password=encrypt('secret-good', self.old_key))
            db.session.add_all([bad, good])
            db.session.commit()
            self.bad_id, self.good_id = bad.id, good.id
            self.bad_ciphertext = bad.password

    def runTest(self):
        import config
        from pgadmin.browser.server_groups.servers import utils
        from pgadmin.model import Server
        from pgadmin.utils.crypto import decrypt

        real_decrypt = utils.decrypt

        def flaky_decrypt(ciphertext, key):
            # Only the first server's value fails, as if saved under a
            # still-older key; everything else decrypts normally.
            if ciphertext == self.bad_ciphertext:
                raise UnicodeDecodeError(
                    'utf-8', b'\xff', 0, 1, 'simulated older key')
            return real_decrypt(ciphertext, key)

        # Desktop mode so connection_manager() resolves the server by id
        # without a logged-in request user.
        with self.app.app_context(), self.app.test_request_context():
            with patch.object(config, 'SERVER_MODE', False), \
                    patch.object(utils, 'decrypt', side_effect=flaky_decrypt):
                cleared = utils.reencrpyt_server_passwords(
                    self.uid, self.old_key, self.new_key,
                    clear_undecryptable=True)

            bad = Server.query.filter_by(id=self.bad_id).one()
            good = Server.query.filter_by(id=self.good_id).one()
            bad_password = bad.password
            bad_save_password = bad.save_password
            good_pw = decrypt(good.password, self.new_key)

        self.assertEqual(
            cleared, 1, 'expected exactly one saved password to be cleared')
        self.assertIsNone(
            bad_password, 'the undecryptable saved password was not cleared')
        self.assertEqual(bad_save_password, 0)
        if isinstance(good_pw, bytes):
            good_pw = good_pw.decode()
        self.assertEqual(
            good_pw, 'secret-good',
            'the good saved password was not re-encrypted under the new key')

    def tearDown(self):
        from pgadmin.model import db, Server, ServerGroup
        with self.app.app_context():
            Server.query.filter_by(servergroup_id=self.group_id).delete()
            ServerGroup.query.filter_by(id=self.group_id).delete()
            db.session.commit()
        test_utils.login_tester_account(self.tester)
        self.tester.delete(
            '/user_management/save/{0}'.format(self.uid),
            follow_redirects=True
        )


class ReencryptStrictKeepsPasswordsTestCase(
        ReencryptClearsUndecryptablePasswordTestCase):
    """
    Without clear_undecryptable (the master-password callers, which may be
    given the wrong old key), an undecryptable saved password raises and
    nothing is committed, so the saved passwords survive for the right key.
    """

    scenarios = [
        ('Without clear_undecryptable an undecryptable password raises',
         dict()),
    ]

    def runTest(self):
        import config
        from pgadmin.browser.server_groups.servers import utils
        from pgadmin.model import db, Server
        from pgadmin.utils.crypto import decrypt

        real_decrypt = utils.decrypt

        def flaky_decrypt(ciphertext, key):
            if ciphertext == self.bad_ciphertext:
                raise UnicodeDecodeError(
                    'utf-8', b'\xff', 0, 1, 'simulated older key')
            return real_decrypt(ciphertext, key)

        with self.app.app_context(), self.app.test_request_context():
            with patch.object(config, 'SERVER_MODE', False), \
                    patch.object(utils, 'decrypt', side_effect=flaky_decrypt):
                with self.assertRaises(UnicodeDecodeError):
                    utils.reencrpyt_server_passwords(
                        self.uid, self.old_key, self.new_key)
            db.session.rollback()

            bad = Server.query.filter_by(id=self.bad_id).one()
            good = Server.query.filter_by(id=self.good_id).one()
            self.assertEqual(bad.password, self.bad_ciphertext)
            self.assertEqual(bad.save_password, 1)
            good_pw = decrypt(good.password, self.old_key)

        if isinstance(good_pw, bytes):
            good_pw = good_pw.decode()
        self.assertEqual(
            good_pw, 'secret-good',
            'the good saved password was not left under the old key')


class ReencryptWithoutManagerTestCase(
        ReencryptClearsUndecryptablePasswordTestCase):
    """
    The connection manager only holds copies of the saved passwords, so a
    server it cannot be found for must still have its saved values
    re-encrypted rather than failing the batch.
    """

    scenarios = [
        ('A server with no connection manager is still re-encrypted',
         dict()),
    ]

    def runTest(self):
        from pgadmin.browser.server_groups.servers import utils
        from pgadmin.model import Server
        from pgadmin.utils.crypto import decrypt
        from pgadmin.utils.exception import ObjectGone

        driver = MagicMock()
        driver.connection_manager.side_effect = ObjectGone('gone')
        with self.app.app_context(), self.app.test_request_context():
            with patch('pgadmin.utils.driver.get_driver',
                       return_value=driver):
                cleared = utils.reencrpyt_server_passwords(
                    self.uid, self.old_key, self.new_key,
                    clear_undecryptable=True)

            bad = Server.query.filter_by(id=self.bad_id).one()
            good = Server.query.filter_by(id=self.good_id).one()
            bad_pw = decrypt(bad.password, self.new_key)
            good_pw = decrypt(good.password, self.new_key)

        self.assertEqual(cleared, 0)
        for value, expected in ((bad_pw, 'secret-bad'),
                                (good_pw, 'secret-good')):
            if isinstance(value, bytes):
                value = value.decode()
            self.assertEqual(value, expected)


class ChangePasswordReencryptsSharedServerTestCase(BaseTestGenerator):
    """
    A self-service password change by a user with a SharedServer row must
    re-encrypt both their own and their shared-server saved passwords. The
    SharedServer row's own id is not a Server id, so looking its connection
    manager up by it failed the change and, as everything is committed at
    the end, left every saved password under the old key.
    """

    scenarios = [
        ('Own and shared-server saved passwords are re-encrypted', dict()),
    ]

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest('Shared servers only exist in server mode.')

        from pgadmin.model import db, Server, ServerGroup, SharedServer, \
            User
        from pgadmin.utils.crypto import encrypt

        self.username = 'reenc_shared_' + str(uuid.uuid4())[:8] + \
            '@example.com'
        self.password = 'initial_password'
        self.new_password = 'new_password1'
        response = self.tester.post(
            '/user_management/save',
            data=json.dumps({
                "auth_source": "internal",
                "email": self.username,
                "role": "2",
                "active": True,
                "newPassword": self.password,
                "confirmPassword": self.password,
                "locked": False
            }),
            content_type='application/json',
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 200,
                         'User creation is NOT successful')

        with self.app.test_request_context():
            user = User.query.filter_by(email=self.username).one()
            self.uid = user.id
            admin = User.query.filter_by(
                email=os.environ['PGADMIN_SETUP_EMAIL']).one()
            admin_group = ServerGroup.query.filter_by(
                user_id=admin.id).first()
            shared = Server(user_id=admin.id,
                            servergroup_id=admin_group.id,
                            name='reenc_shared', host='localhost',
                            port=5432, maintenance_db='postgres',
                            username='u', shared=True)
            db.session.add(shared)
            db.session.flush()

            group = ServerGroup.query.filter_by(user_id=self.uid).first()
            own = Server(user_id=self.uid, servergroup_id=group.id,
                         name='reenc_own', host='localhost', port=5432,
                         maintenance_db='postgres', username='u',
                         save_password=1,
                         password=encrypt('own-secret', self.password))
            db.session.add(own)
            shared_row = SharedServer(
                osid=shared.id, user_id=self.uid,
                server_owner=admin.username, servergroup_id=group.id,
                name='reenc_shared', host='localhost', port=5432,
                maintenance_db='postgres', username='u', save_password=1,
                password=encrypt('shared-secret', self.password),
                use_ssh_tunnel=0, tunnel_authentication=0,
                tunnel_prompt_password=0, shared=True)
            db.session.add(shared_row)
            db.session.commit()
            self.shared_id = shared.id
            self.own_id = own.id
            self.shared_row_id = shared_row.id

        self.tester.logout()
        response = self.tester.login(self.username, self.password, True)
        self.assertEqual(response.status_code, 200)

    def runTest(self):
        from pgadmin.model import Server, SharedServer
        from pgadmin.utils.crypto import decrypt
        from pgadmin.utils.driver.psycopg3 import Driver

        before = _get_fs_uniquifier(self.username)
        response = self.tester.get('/browser/change_password')
        csrf = self.tester.fetch_csrf(response)
        with patch.object(Driver, 'rebind_session_managers',
                          autospec=True,
                          side_effect=Driver.rebind_session_managers) \
                as rebind:
            response = self.tester.post(
                '/browser/change_password',
                data=json.dumps(dict(
                    password=self.password, new_password=self.new_password,
                    new_password_confirm=self.new_password,
                    csrf_token=csrf)),
                content_type='application/json', follow_redirects=True)
        self.assertEqual(response.status_code, 200, response.data)
        # This session's connection managers are moved to the new
        # uniquifier, so its open connections are kept.
        rebind.assert_called_once()
        self.assertEqual(rebind.call_args.args[1:],
                         (before, _get_fs_uniquifier(self.username)))
        # Nothing had to be cleared, so the dialog shows a plain success.
        self.assertEqual(
            json.loads(response.data)['data']['passwords_cleared'], 0)

        with self.app.test_request_context():
            own = Server.query.filter_by(id=self.own_id).one()
            shared_row = SharedServer.query.filter_by(
                id=self.shared_row_id).one()
            values = [(decrypt(own.password, self.new_password),
                       'own-secret'),
                      (decrypt(shared_row.password, self.new_password),
                       'shared-secret')]

        for value, expected in values:
            if isinstance(value, bytes):
                value = value.decode()
            self.assertEqual(value, expected)

    def tearDown(self):
        from pgadmin.model import db, Server, SharedServer
        self.tester.logout()
        test_utils.login_tester_account(self.tester)
        with self.app.test_request_context():
            SharedServer.query.filter_by(id=self.shared_row_id).delete()
            Server.query.filter_by(id=self.own_id).delete()
            Server.query.filter_by(id=self.shared_id).delete()
            db.session.commit()
        self.tester.delete(
            '/user_management/save/{0}'.format(self.uid),
            follow_redirects=True
        )


class ReencryptLooksUpSharedServerManagerByOsidTestCase(
        ChangePasswordReencryptsSharedServerTestCase):
    """
    The connection manager of a SharedServer row is keyed by the id of the
    Server it shares (osid), not by the row's own id, which a missing
    manager would otherwise hide.
    """

    scenarios = [
        ('A shared server manager is looked up by osid', dict()),
    ]

    def runTest(self):
        from pgadmin.browser.server_groups.servers import utils

        driver = MagicMock()
        driver.connection_manager.return_value.tunnel_password = None
        with self.app.test_request_context(), \
                patch('pgadmin.utils.driver.get_driver',
                      return_value=driver):
            utils.reencrpyt_server_passwords(
                self.uid, self.password, self.new_password,
                clear_undecryptable=True)

        looked_up = [c.args[0] for c in
                     driver.connection_manager.call_args_list]
        self.assertIn(self.shared_id, looked_up)
        self.assertIn(self.own_id, looked_up)
        if self.shared_row_id not in (self.shared_id, self.own_id):
            self.assertNotIn(self.shared_row_id, looked_up)


class RebindSessionManagersTestCase(BaseTestGenerator):
    """
    After a password change rotates the user's fs_uniquifier, the current
    session's connection managers are re-tagged with it, so they are not
    dropped as stale (which would close the session's open connections).
    State built for another uniquifier is left alone.
    """

    scenarios = [
        ('Managers built for the old uniquifier are re-tagged', dict()),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.utils.driver import psycopg3

        class _Session(dict):
            sid = 'rebind-test-sid'
            force_write = False

        fake_session = _Session(__pgsql_server_managers={
            1: {'pga_user': 'old'}, 2: {'pga_user': 'someone-else'}})
        own = MagicMock(pga_user='old')
        other = MagicMock(pga_user='someone-else')

        driver = psycopg3.Driver()
        driver.managers[fake_session.sid] = {'1': own, '2': other}
        with patch.object(psycopg3, 'session', fake_session):
            driver.rebind_session_managers('old', 'new')

        self.assertEqual(own.pga_user, 'new')
        self.assertEqual(other.pga_user, 'someone-else')
        saved = fake_session['__pgsql_server_managers']
        self.assertEqual(saved[1]['pga_user'], 'new')
        self.assertEqual(saved[2]['pga_user'], 'someone-else')
        self.assertTrue(fake_session.force_write)
