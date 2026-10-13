##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import socket
from unittest.mock import patch, MagicMock

from flask import request

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools import psql


def emits_for(emit, room):
    """
    Return the calls on a patched sio.emit that were sent to room. The patch
    is global, so psql sessions started by other tests that are still running
    can emit into the same mock, and those calls must be ignored.
    """
    return [call for call in emit.call_args_list
            if call.kwargs.get('room', call.kwargs.get('to')) == room]


class PSQLWindowsReadStdout(BaseTestGenerator):
    """
    read_stdout() must report the end of the pty's output, rather than
    raising, when pywinpty's reader thread has closed its socket.
    """
    scenarios = [
        ('Output is forwarded whilst the socket is open',
         dict(chunk=b'psql (18.0)\r\n', close_writer=False,
              expected_result=True, expected='psql (18.0)\r\n')),
        ('A closed socket ends the read loop',
         dict(chunk=None, close_writer=True,
              expected_result=False, expected='')),
    ]

    def runTest(self):
        reader, writer = socket.socketpair()
        try:
            if self.chunk:
                writer.sendall(self.chunk)
            if self.close_writer:
                writer.close()

            process = MagicMock()
            process.fd = reader.fileno()

            def read(size):
                data = reader.recv(size)
                if not data:
                    raise EOFError('Pty is closed')
                return data.decode('utf-8')
            process.read.side_effect = read

            with patch.object(psql.sio, 'emit') as emit, \
                    patch.object(psql.sio, 'sleep'):
                result = psql.read_stdout(
                    process, 'test-windows-read-stdout', 1024)

            self.assertIs(result, self.expected_result)
            forwarded = ''.join(
                call.args[1]['result']
                for call in emits_for(emit, 'test-windows-read-stdout'))
            self.assertEqual(forwarded, self.expected)
        finally:
            reader.close()
            writer.close()


class PSQLWindowsEOFBeforeExit(BaseTestGenerator):
    """
    If the pty's output ends before isalive() reports that psql has exited,
    the output must still be drained and the session cleaned up.
    """
    scenarios = [
        ('Output ends whilst psql still appears alive', dict()),
    ]

    def runTest(self):
        sid = 'test-windows-eof-before-exit'
        process = MagicMock()
        process.fd = 42
        process.isalive.return_value = True

        pty_process = MagicMock()
        pty_process.spawn.return_value = process

        with self.app.test_request_context(), \
                patch.object(psql, 'PtyProcess', pty_process, create=True), \
                patch.object(psql, 'set_term_size'), \
                patch.object(psql, 'get_user_env', return_value={}), \
                patch.object(psql, 'read_stdout',
                             return_value=False) as read_stdout, \
                patch.object(psql, 'drain_stdout') as drain_stdout, \
                patch('pgadmin.misc.workspaces.'
                      'check_and_delete_adhoc_server'):
            request.sid = sid
            self.app.config.setdefault('sessions', dict())
            self.app.config.setdefault('sid_soid_mapping', dict())

            try:
                psql.windows_platform(['psql', 'dbname=postgres'], sid,
                                      1024, 7)

                read_stdout.assert_called_once()
                drain_stdout.assert_called_once_with(process, sid, 1024)
                self.assertNotIn(sid, self.app.config['sessions'])
                self.assertNotIn(sid, psql.pdata)
                self.assertNotIn(sid, psql.open_psql_connections)
                process.close.assert_called_once_with()
            finally:
                self.app.config['sessions'].pop(sid, None)
                for registry in (psql.pdata, psql.cdata,
                                 psql.open_psql_connections,
                                 psql.session_input):
                    registry.pop(sid, None)


class PSQLWindowsSpawnFailure(BaseTestGenerator):
    """
    A failure to spawn psql must be shown in the terminal and must not leave
    the socket registered against the server.
    """
    scenarios = [
        ('psql.exe cannot be found',
         dict(error=FileNotFoundError('The command was not found'))),
        ('The pseudo-terminal cannot be created',
         dict(error=OSError('ConPTY creation failed'))),
    ]

    def runTest(self):
        sid = 'test-windows-spawn-failure'
        pty_process = MagicMock()
        pty_process.spawn.side_effect = self.error

        with self.app.test_request_context(), \
                patch.object(psql, 'PtyProcess', pty_process, create=True), \
                patch.object(psql, 'get_user_env', return_value={}), \
                patch.object(psql, 'set_term_size') as set_term_size, \
                patch.object(psql.sio, 'emit') as emit:
            request.sid = sid
            self.app.config.setdefault('sessions', dict())
            soid_mapping = self.app.config.setdefault('sid_soid_mapping',
                                                      dict())
            saved_soids = soid_mapping.get('7')
            soid_mapping['7'] = [sid, 'other']

            try:
                psql.windows_platform(['psql', 'dbname=postgres'], sid,
                                      1024, 7)

                calls = emits_for(emit, sid)
                self.assertEqual(len(calls), 1)
                self.assertEqual(calls[0].args[0], 'pty-output')
                self.assertTrue(calls[0].args[1]['error'])
                self.assertIn(str(self.error), calls[0].args[1]['result'])
                self.assertEqual(soid_mapping['7'], ['other'])
                self.assertNotIn(sid, self.app.config['sessions'])
                self.assertNotIn(sid, psql.pdata)
                set_term_size.assert_not_called()
            finally:
                if saved_soids is None:
                    soid_mapping.pop('7', None)
                else:
                    soid_mapping['7'] = saved_soids


class PSQLWindowsClosePtyProcess(BaseTestGenerator):
    """
    pywinpty marks a process as closed once isalive() sees it exit, which
    makes PtyProcess.close() do nothing, so the sockets must be closed
    directly.
    """
    scenarios = [
        ('close() does nothing after exit', dict(close_error=None)),
        ('close() raises', dict(close_error=IOError('Could not terminate'))),
    ]

    def runTest(self):
        fileobj, peer = socket.socketpair()
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            process = MagicMock()
            process.fileobj = fileobj
            process._server = server
            if self.close_error is not None:
                process.close.side_effect = self.close_error

            psql.close_pty_process(process)

            process.close.assert_called_once_with()
            self.assertEqual(fileobj.fileno(), -1)
            self.assertEqual(server.fileno(), -1)
        finally:
            for sock in (fileobj, peer, server):
                sock.close()
