##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for decode_log_chunk(), which decodes dashboard log chunks
read as raw bytes with pg_read_binary_file() and transported as hex.
"""

import unittest

from pgadmin.utils.route import BaseTestGenerator


class _SkipServerSetUpMixin:
    """Mixin: skip BaseTestGenerator's Postgres connection — these are
    pure logic tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class DecodeLogChunkTestCase(_SkipServerSetUpMixin, BaseTestGenerator):
    """decode_log_chunk() handles characters split across page reads and
    malformed bytes without raising."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.dashboard import decode_log_chunk

        # A multi-byte character split at the start of a page is shown by
        # the previous page; the leftover trail bytes are dropped here.
        page = 'é'.encode('utf-8')[1:] + b'INFO'
        self.assertEqual(
            decode_log_chunk(page.hex(), 'UTF8', keep_bytes=len(page)),
            'INFO')

        # A character split at the end of a page is completed from the
        # overlap bytes read past the page.
        raw = 'abécd'.encode('utf-8')
        self.assertEqual(
            decode_log_chunk(raw[:6].hex(), 'UTF8', keep_bytes=3),
            'abé')

        # Reassembling pages of a multi-byte log is lossless.
        text = 'line one польность ünïcødé 日本語\nline two\n'
        raw = text.encode('utf-8')
        page_size = 7
        joined = ''.join(
            decode_log_chunk(
                raw[p * page_size:p * page_size + page_size + 4].hex(),
                'UTF8', keep_bytes=page_size)
            for p in range((len(raw) + page_size - 1) // page_size))
        self.assertEqual(joined, text)

        # Malformed leading bytes on a plain whole-file read are kept and
        # shown as replacement characters, not silently dropped.
        self.assertEqual(
            decode_log_chunk((b'\x80\xbfINFO').hex(), 'UTF8'),
            '��INFO')

        # At the end of the file, a character still being written is
        # trimmed, but valid text after an invalid byte is kept.
        self.assertEqual(
            decode_log_chunk((b'ab\xd1').hex(), 'UTF8', keep_bytes=3),
            'ab')
        self.assertEqual(
            decode_log_chunk((b'ab\xffcd').hex(), 'UTF8', keep_bytes=5),
            'ab\ufffdcd')
