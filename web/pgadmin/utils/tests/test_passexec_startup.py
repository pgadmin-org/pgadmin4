##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils import passexec
from pgadmin.utils.passexec import server_passexec_startup


class TestServerPassexecStartup(BaseTestGenerator):
    """The legacy conversion runs only for the server-mode web app, never
    from the CLI (setup.py), which could be pointed at a desktop DB."""

    scenarios = [
        ('Server mode, web app', dict(server_mode=True, cli_mode=False,
                                      check=True, convert=True)),
        ('Server mode, CLI', dict(server_mode=True, cli_mode=True,
                                  check=True, convert=False)),
        ('Desktop mode, web app', dict(server_mode=False, cli_mode=False,
                                       check=False, convert=False)),
        ('Desktop mode, CLI', dict(server_mode=False, cli_mode=True,
                                   check=False, convert=False)),
    ]

    def runTest(self):
        app = MagicMock()
        with patch.object(passexec.config, 'SERVER_MODE',
                          self.server_mode), \
                patch.object(passexec, 'check_server_passexec_config') \
                as mock_check, \
                patch.object(passexec, 'convert_legacy_server_passexec') \
                as mock_convert:
            server_passexec_startup(app, self.cli_mode)
        self.assertEqual(mock_check.called, self.check)
        self.assertEqual(mock_convert.called, self.convert)
        if self.convert:
            mock_convert.assert_called_once_with(app.logger)
