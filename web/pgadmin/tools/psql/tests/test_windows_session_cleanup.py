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
        ('A newer process on the same socket is left alone',
         dict(replaced=True)),
    ]

    quit_first = False
    replaced = False

    def runTest(self):
        sid = 'test-windows-session-cleanup'
        process = MagicMock()
        process.fd = 42

        newer = MagicMock()

        def isalive():
            # Emulate the \q handler running whilst psql is still alive.
            if self.quit_first:
                self.app.config['sessions'].pop(sid, None)
            # Emulate a second start_process on the same socket.
            if self.replaced:
                self.app.config['sessions'][sid] = newer
                psql.pdata[sid] = newer
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
            self.app.config.setdefault('sid_soid_mapping', dict())
            self.app.config['sid_soid_mapping']['7'] = [sid, 'other']
            psql.session_input[sid] = ''

            try:
                psql.windows_platform(['psql', 'dbname=postgres'], sid,
                                      1024, 7)

                drain_stdout.assert_called_once_with(process, sid, 1024)
                if self.replaced:
                    self.assertIs(self.app.config['sessions'][sid], newer)
                    self.assertIs(psql.pdata[sid], newer)
                    self.assertIn(sid, psql.open_psql_connections)
                    adhoc.assert_not_called()
                    return

                self.assertNotIn(sid, self.app.config['sessions'])
                self.assertNotIn(sid, psql.pdata)
                self.assertNotIn(sid, psql.cdata)
                self.assertNotIn(sid, psql.open_psql_connections)
                self.assertNotIn(sid, psql.session_input)
                self.assertEqual(
                    self.app.config['sid_soid_mapping']['7'], ['other'])
                adhoc.assert_called_once_with(7)
            finally:
                self.app.config['sessions'].pop(sid, None)
                self.app.config['sid_soid_mapping'].pop('7', None)
                for registry in (psql.pdata, psql.cdata,
                                 psql.open_psql_connections,
                                 psql.session_input):
                    registry.pop(sid, None)
