##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import os

from pgadmin.misc.file_manager import read_file_generator
from pgadmin.utils.route import BaseTestGenerator


class TestReadFileGeneratorForEncoding(BaseTestGenerator):
    """
    Check that the start_running_query method works as intended
    """

    scenarios = [
        (
            'When user is trying to load the file with utf-8 encoding',
            dict(
                file='test_file_utf8_encoding.sql',
                encoding='utf-8'
            )
        ),
        (
            'When user is trying to load the file with other encoding and'
            ' trying to use utf-8 encoding to read it',
            dict(
                file='test_file_other_encoding.sql',
                encoding='utf-8'
            )
        ),
    ]

    def setUp(self):
        """Set up test file path for each scenario."""
        self.dir_path = os.path.dirname(os.path.realpath(__file__))
        self.complate_path = os.path.join(self.dir_path, self.file)

    def runTest(self):
        """Verify that the generator reads the file content properly."""
        result = read_file_generator(self.complate_path, self.encoding)
        # Check if file is read properly by the generator
        self.assertIn('SELECT 1', next(result))


class TestReadFileGeneratorLargeFileFallback(BaseTestGenerator):
    """
    Check that large files (> 4MB) with non-UTF8 characters in later chunks
    are read without duplicating earlier chunks (#10462).
    """

    scenarios = [
        (
            'When file is larger than 4MB with non-UTF-8 byte after 4MB',
            dict(encoding='utf-8')
        ),
    ]

    def setUp(self):
        """Create a temporary test file larger than 4MB with Latin-1 byte."""
        self.test_file_path = os.path.join(
            os.path.dirname(os.path.realpath(__file__)),
            'test_large_file_fallback.tmp'
        )
        line = b'SELECT 1;\r\n'
        # Create a file slightly larger than 4MB (4 * 1024 * 1024 bytes)
        # with a Latin-1 byte in the second chunk
        self.expected_bytes = (
            line * (4 * 1024 * 1024 // len(line)) + b'-- caf\xe9\r\n'
        )
        with open(self.test_file_path, 'wb') as f:
            f.write(self.expected_bytes)

    def tearDown(self):
        """Clean up the temporary test file."""
        if os.path.exists(self.test_file_path):
            os.remove(self.test_file_path)

    def runTest(self):
        """Verify large file yields all chunks exactly once with fallback."""
        chunks = list(read_file_generator(self.test_file_path, self.encoding))
        full_content = ''.join(chunks)
        # Ensure that no duplicate chunks were yielded
        self.assertEqual(len(full_content), len(self.expected_bytes))
        self.assertEqual(full_content, self.expected_bytes.decode('latin-1'))
