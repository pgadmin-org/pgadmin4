##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test for PasswordExec.get() with a Service-only connection.

When a server is configured via the ``Service`` field (pg_service.conf) with
host, port and username left blank, ``PasswordExec`` is constructed with
those attributes as ``None``. ``get()`` used to pass them straight into
``str.replace()``, which raises ``TypeError: replace() argument 2 must be
str, not None``. The fix substitutes an empty string for any unset
placeholder instead."""

from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.passexec import PasswordExec


class TestPasswordExecServiceOnly(BaseTestGenerator):
    """PasswordExec.get() must not raise when host/port/username are None."""

    def setUp(self):
        pass

    def runTest(self):
        pexec = PasswordExec(
            'echo %HOSTNAME%:%PORT%:%USERNAME%', None, None, None)

        fake_driver = MagicMock()
        fake_driver.qtIdent.return_value = 'quoted'
        fake_proc = MagicMock(stdout='secret\n')

        with self.app.app_context(), \
                patch('pgadmin.utils.passexec.get_driver',
                      return_value=fake_driver), \
                patch('pgadmin.utils.passexec.subprocess.run',
                      return_value=fake_proc) as mock_run, \
                patch('pgadmin.utils.passexec.config.SERVER_MODE', False):
            password = pexec.get()

        self.assertEqual(password, 'secret')
        self.assertEqual(mock_run.call_args[0][0], 'echo ::')
        fake_driver.qtIdent.assert_not_called()
