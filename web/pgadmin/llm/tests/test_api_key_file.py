##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import shutil
import tempfile
from unittest.mock import patch
from pgadmin.utils.route import BaseTestGenerator


class ReadApiKeyFileTestCase(BaseTestGenerator):
    """Test cases for _read_api_key_from_file content validation"""

    scenarios = [
        ('Valid API key', dict(
            file_content='sk-abc123',
            expected='sk-abc123',
        )),
        ('Key with leading/trailing whitespace', dict(
            file_content='  sk-abc123  \n',
            expected='sk-abc123',
        )),
        ('Multi-line content', dict(
            file_content='sk-abc123\nsome-other-line',
            expected=None,
        )),
        ('Content with spaces', dict(
            file_content='sk abc 123',
            expected=None,
        )),
        ('Content with tab', dict(
            file_content='sk\tabc123',
            expected=None,
        )),
        ('Empty file', dict(
            file_content='',
            expected=None,
        )),
        ('Non-ASCII content', dict(
            file_content='sk-abc123\u00e9\u00e8\u00ea',
            expected=None,
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.llm.utils import _read_api_key_from_file

        tmp = tempfile.NamedTemporaryFile(
            mode='w', suffix='.key', delete=False
        )
        try:
            tmp.write(self.file_content)
            tmp.flush()
            tmp.close()

            real_path = os.path.realpath(tmp.name)

            with patch(
                'pgadmin.llm.utils.validate_api_key_path',
                return_value=real_path
            ):
                result = _read_api_key_from_file(tmp.name)
                self.assertEqual(result, self.expected)
        finally:
            if os.path.exists(tmp.name):
                os.unlink(tmp.name)


class ReadApiKeyFileNonExistentTestCase(BaseTestGenerator):
    """Test that _read_api_key_from_file returns None for missing files"""

    scenarios = [
        ('Non-existent file returns None', dict()),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.llm.utils import _read_api_key_from_file

        fake_path = '/tmp/pgadmin_test_nonexistent_key_file.key'
        # Ensure the file truly does not exist
        if os.path.exists(fake_path):
            os.unlink(fake_path)

        with patch(
            'pgadmin.llm.utils.validate_api_key_path',
            return_value=os.path.realpath(fake_path)
        ):
            result = _read_api_key_from_file(fake_path)
            self.assertIsNone(result)


class ReadApiKeyFileOversizeTestCase(BaseTestGenerator):
    """Test that _read_api_key_from_file rejects files over 1024 bytes"""

    scenarios = [
        ('Oversize file returns None', dict()),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.llm.utils import _read_api_key_from_file

        tmp = tempfile.NamedTemporaryFile(
            mode='w', suffix='.key', delete=False
        )
        try:
            tmp.write('A' * 1025)
            tmp.flush()
            tmp.close()

            real_path = os.path.realpath(tmp.name)

            with patch(
                'pgadmin.llm.utils.validate_api_key_path',
                return_value=real_path
            ):
                result = _read_api_key_from_file(tmp.name)
                self.assertIsNone(result)
        finally:
            if os.path.exists(tmp.name):
                os.unlink(tmp.name)


class ValidateApiKeyPathNullByteTestCase(BaseTestGenerator):
    """Test that validate_api_key_path rejects paths with null bytes."""

    scenarios = [
        ('Null byte in path rejected', dict()),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.llm.utils import validate_api_key_path

        with patch('config.SERVER_MODE', False):
            result = validate_api_key_path(
                '/tmp/key\x00/../../../etc/passwd'
            )
            self.assertIsNone(result)


class ValidateApiKeyPathServerModeTestCase(BaseTestGenerator):
    """Test validate_api_key_path in server mode"""

    scenarios = [
        ('Path within user storage', dict(
            sub_path='my_api_key.txt',
            expect_valid=True,
        )),
        ('Path outside user storage', dict(
            sub_path=None,
            outside_path='/etc/passwd',
            expect_valid=False,
        )),
        ('Path traversal attempt', dict(
            sub_path=None,
            traversal=True,
            expect_valid=False,
        )),
        ('Symlink escaping user storage', dict(
            sub_path=None,
            symlink=True,
            expect_valid=False,
        )),
        ('Path in other users storage', dict(
            sub_path=None,
            other_user=True,
            expect_valid=False,
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.llm.utils import validate_api_key_path

        tmpdir = tempfile.mkdtemp()
        try:
            # Create a fake user storage directory
            user_storage = os.path.join(tmpdir, 'storage', 'testuser')
            os.makedirs(user_storage)

            if self.expect_valid and self.sub_path:
                # Create the actual file inside user storage
                file_path = os.path.join(user_storage, self.sub_path)
                with open(file_path, 'w') as f:
                    f.write('test')
                test_path = file_path
            elif hasattr(self, 'traversal') and self.traversal:
                # Path traversal: start in user storage but escape
                test_path = os.path.join(
                    user_storage, '..', '..', 'etc', 'passwd'
                )
            elif hasattr(self, 'symlink') and self.symlink:
                # Symlink inside user storage pointing outside
                outside_file = os.path.join(tmpdir, 'secret.key')
                with open(outside_file, 'w') as f:
                    f.write('secret')
                link_path = os.path.join(user_storage, 'link.key')
                os.symlink(outside_file, link_path)
                test_path = link_path
            elif hasattr(self, 'other_user') and self.other_user:
                # File in another user's storage directory
                other_storage = os.path.join(
                    tmpdir, 'storage', 'otheruser'
                )
                os.makedirs(other_storage)
                other_file = os.path.join(
                    other_storage, 'key.txt'
                )
                with open(other_file, 'w') as f:
                    f.write('stolen')
                test_path = other_file
            else:
                test_path = self.outside_path

            with patch(
                'config.SERVER_MODE', True
            ), patch(
                'pgadmin.llm.utils._get_user_storage_dirs',
                return_value=[user_storage]
            ):
                result = validate_api_key_path(test_path)

                if self.expect_valid:
                    self.assertIsNotNone(result)
                    expected_resolved = os.path.realpath(test_path)
                    self.assertEqual(result, expected_resolved)
                else:
                    self.assertIsNone(result)
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)


class ValidateApiKeyPathDesktopModeTestCase(BaseTestGenerator):
    """Test validate_api_key_path in desktop mode"""

    scenarios = [
        ('Path within home directory', dict(
            use_home_path=True,
            expect_valid=True,
        )),
        ('Path outside home directory', dict(
            use_home_path=False,
            expect_valid=False,
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.llm.utils import validate_api_key_path

        home_dir = os.path.realpath(os.path.expanduser('~'))

        if self.use_home_path:
            # Create a temp file within the home directory
            tmp = tempfile.NamedTemporaryFile(
                dir=home_dir, suffix='.key', delete=False
            )
            try:
                tmp.write(b'test')
                tmp.close()
                test_path = tmp.name

                with patch('config.SERVER_MODE', False):
                    result = validate_api_key_path(test_path)
                    self.assertIsNotNone(result)
                    expected = os.path.realpath(test_path)
                    self.assertEqual(result, expected)
            finally:
                if os.path.exists(tmp.name):
                    os.unlink(tmp.name)
        else:
            # Use a path guaranteed to be outside the home directory.
            # /var/tmp may resolve via symlink on macOS, so resolve
            # the real home dir and pick something clearly outside it.
            outside_path = '/var/tmp/outside_home.key'
            resolved_outside = os.path.realpath(outside_path)
            # Guard: on unusual systems this could still be under
            # home, in which case skip the test.
            if resolved_outside.startswith(home_dir + os.sep):
                self.skipTest(
                    '/var/tmp resolves under home on this system'
                )

            with patch('config.SERVER_MODE', False):
                result = validate_api_key_path(outside_path)
                self.assertIsNone(result)


class ValidateApiKeyPathOldStyleStorageTestCase(BaseTestGenerator):
    """Test that old-style storage directories (username split at @)
    are accepted in server mode."""

    scenarios = [
        ('File in old-style storage dir accepted', dict()),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.llm.utils import validate_api_key_path

        tmpdir = tempfile.mkdtemp()
        try:
            # Old-style: username split at @
            old_storage = os.path.join(
                tmpdir, 'storage', 'testuser'
            )
            # New-style: full username with @ replaced
            new_storage = os.path.join(
                tmpdir, 'storage', 'testuser_example.com'
            )
            os.makedirs(old_storage)

            file_path = os.path.join(old_storage, 'key.txt')
            with open(file_path, 'w') as f:
                f.write('test')

            with patch(
                'config.SERVER_MODE', True
            ), patch(
                'pgadmin.llm.utils._get_user_storage_dirs',
                return_value=[new_storage, old_storage]
            ):
                result = validate_api_key_path(file_path)
                self.assertIsNotNone(result)
                self.assertEqual(
                    result, os.path.realpath(file_path)
                )
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)


class ReadApiKeyFileTrustedPathTestCase(BaseTestGenerator):
    """Test that _trusted=True skips directory validation."""

    scenarios = [
        ('Trusted path reads file outside storage', dict()),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.llm.utils import _read_api_key_from_file

        tmp = tempfile.NamedTemporaryFile(
            mode='w', suffix='.key', delete=False
        )
        try:
            tmp.write('sk-trusted-admin-key')
            tmp.flush()
            tmp.close()

            # With _trusted=False and mocked validation rejecting,
            # the file should NOT be read.
            with patch(
                'pgadmin.llm.utils.validate_api_key_path',
                return_value=None
            ):
                result = _read_api_key_from_file(tmp.name)
                self.assertIsNone(result)

            # With _trusted=True, validation is skipped and
            # the file should be read regardless.
            result = _read_api_key_from_file(
                tmp.name, _trusted=True
            )
            self.assertEqual(result, 'sk-trusted-admin-key')
        finally:
            if os.path.exists(tmp.name):
                os.unlink(tmp.name)
