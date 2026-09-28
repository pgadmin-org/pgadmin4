##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from unittest.mock import patch, MagicMock

from flask import request

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools import psql


class PSQLWindowsSessionCleanup(BaseTestGenerator):
    """
    When psql exits on Windows, its session must be removed from every map,
    even if the \\q handler has already removed it from the sessions map
    (which stops the disconnect handler from cleaning up).
    """
    scenarios = [
        ('Session removed by the \\q handler first',
         dict(quit_first=True)),
        ('Session still registered when psql exits',
         dict(quit_first=False)),
    ]

    def runTest(self):
        sid = 'test-windows-session-cleanup'
        process = MagicMock()
        process.fd = 42

        def isalive():
            # Emulate the \q handler running whilst psql is still alive.
            if self.quit_first:
                self.app.config['sessions'].pop(sid, None)
            return False
        process.isalive.side_effect = isalive

        pty_process = MagicMock()
        pty_process.spawn.return_value = process

        with self.app.test_request_context(), \
                patch.object(psql, 'PtyProcess', pty_process, create=True), \
                patch.object(psql, 'set_term_size'), \
                patch.object(psql, 'get_user_env', return_value={}), \
                patch.object(psql, 'drain_stdout') as drain_stdout, \
                patch('pgadmin.misc.workspaces.'
                      'check_and_delete_adhoc_server') as adhoc:
            request.sid = sid
            self.app.config.setdefault('sessions', dict())

            psql.windows_platform(['psql', 'dbname=postgres'], sid, 1024, 7)

            drain_stdout.assert_called_once_with(process, sid, 1024)
            self.assertNotIn(sid, self.app.config['sessions'])
            self.assertNotIn(sid, psql.pdata)
            self.assertNotIn(sid, psql.cdata)
            self.assertNotIn(sid, psql.open_psql_connections)
            adhoc.assert_called_once_with(7)
