##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Password recovery is offered only when email is turned on.

Setting MAIL_SERVER to an empty string or None turns email off: the login
page then has no "Forgotten your password?" link, and the password recovery
pages, pgAdmin's and Flask-Security's, are not found.
"""

from unittest.mock import patch

import config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.test_utils import login_tester_account

RECOVERY_URL = '/browser/reset_password'


class PasswordRecoveryMailTestCase(BaseTestGenerator):
    """The password recovery pages follow MAIL_SERVER."""

    scenarios = [
        ('Email turned off with an empty MAIL_SERVER',
         dict(mail_server='', enabled=False)),
        ('Email turned off with MAIL_SERVER set to None',
         dict(mail_server=None, enabled=False)),
        ('Email turned on', dict(mail_server='localhost', enabled=True)),
    ]

    @classmethod
    def setUpClass(cls):
        cls.tester.logout()

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest('Password recovery exists only in server mode.')
        patcher = patch.dict(self.app.config,
                             {'MAIL_SERVER': self.mail_server})
        patcher.start()
        self.addCleanup(patcher.stop)

    def runTest(self):
        res = self.tester.get('/login')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(RECOVERY_URL.encode() in res.data, self.enabled)

        res = self.tester.get(RECOVERY_URL)
        self.assertEqual(res.status_code, 200 if self.enabled else 404)

        if self.enabled:
            return

        with patch('pgadmin.browser.send_mail') as send_mail:
            res = self.tester.post(RECOVERY_URL,
                                   json={'email': 'jane.doe@example.com'})
        self.assertEqual(res.status_code, 404)
        send_mail.assert_not_called()

        for url in (RECOVERY_URL + '/some-token', '/reset',
                    '/reset/some-token'):
            self.assertEqual(self.tester.get(url).status_code, 404, url)

    @classmethod
    def tearDownClass(cls):
        login_tester_account(cls.tester)
