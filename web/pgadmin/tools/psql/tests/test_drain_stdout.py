##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import socket
import time
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
        ('Draining stops at the overall deadline',
         dict(chunks=[b'bye\r\n'],
              close_writer=False,
              idle_timeout=5,
              max_wait=0.2,
              elapsed_limit=1,
              expected='bye\r\n')),
    ]

    idle_timeout = 0.1
    max_wait = 2
    elapsed_limit = None

    def runTest(self):
        reader, writer = socket.socketpair()
        try:
            for chunk in self.chunks:
                writer.sendall(chunk)
            if self.close_writer:
                writer.close()

            with patch.object(psql.sio, 'emit') as emit:
                started = time.monotonic()
                psql.drain_stdout(FakePtyProcess(reader), 'room', 1024,
                                  idle_timeout=self.idle_timeout,
                                  max_wait=self.max_wait)
                elapsed = time.monotonic() - started

            if self.elapsed_limit is not None:
                self.assertLess(elapsed, self.elapsed_limit)

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
