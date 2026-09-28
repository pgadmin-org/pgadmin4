##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import socket
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools import psql


class FakePtyProcess:
    """
    Stand-in for winpty.PtyProcess: like pywinpty, it delivers the
    terminal's output through a socket that its reader thread closes at EOF.
    """
    def __init__(self, sock):
        self.sock = sock
        self.fd = sock.fileno()

    def read(self, size=1024):
        data = self.sock.recv(size)
        if not data:
            raise EOFError('Pty is closed')
        return data.decode('utf-8')


class PSQLDrainStdout(BaseTestGenerator):
    """
    Output still queued when psql exits on Windows (for example a
    connection error) must be forwarded to the terminal, not dropped.
    """
    scenarios = [
        ('Queued output is forwarded until EOF',
         dict(chunks=[b'psql: error: connection ', b'to server failed\r\n'],
              close_writer=True,
              expected='psql: error: connection to server failed\r\n')),
        ('Draining stops when nothing more arrives',
         dict(chunks=[b'bye\r\n'],
              close_writer=False,
              expected='bye\r\n')),
    ]

    def runTest(self):
        reader, writer = socket.socketpair()
        try:
            for chunk in self.chunks:
                writer.sendall(chunk)
            if self.close_writer:
                writer.close()

            with patch.object(psql.sio, 'emit') as emit:
                psql.drain_stdout(FakePtyProcess(reader), 'room', 1024,
                                  idle_timeout=0.1, max_wait=2)

            forwarded = ''.join(
                call.args[1]['result'] for call in emit.call_args_list)
            self.assertEqual(forwarded, self.expected)
            for call in emit.call_args_list:
                self.assertEqual(call.args[0], 'pty-output')
                self.assertFalse(call.args[1]['error'])
                self.assertEqual(call.kwargs['room'], 'room')
        finally:
            reader.close()
            writer.close()
