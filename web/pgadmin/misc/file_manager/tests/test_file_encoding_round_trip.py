##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A file loaded into the Query Tool must be saved back in the encoding it
was read with, so an unedited round trip leaves it byte-for-byte unchanged
(#10531)."""

import contextlib
import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

from pgadmin.misc.file_manager import Filemanager
from pgadmin.utils.constants import MY_STORAGE
from pgadmin.utils.route import BaseTestGenerator

LOAD_FILE_URL = '/file_manager/load_file/'
SAVE_FILE_URL = '/file_manager/save_file/'


class TestFileEncodingRoundTrip(BaseTestGenerator):
    """Load a file through the endpoint, save it back, check the bytes."""

    scenarios = [
        ('Latin-1 file without a BOM is saved back as latin-1',
         dict(files={'/a.sql': b'SELECT 1; -- caf\xe9\n'},
              load='/a.sql', save='/a.sql', edit=None,
              expected=b'SELECT 1; -- caf\xe9\n')),
        ('UTF-8 file is saved back as UTF-8',
         dict(files={'/a.sql': 'SELECT 1; -- café\n'.encode('utf-8')},
              load='/a.sql', save='/a.sql', edit=None,
              expected='SELECT 1; -- café\n'.encode('utf-8'))),
        ('UTF-8 file with a BOM keeps its BOM',
         dict(files={'/a.sql': 'SELECT 1; -- café\n'.encode('utf-8-sig')},
              load='/a.sql', save='/a.sql', edit=None,
              expected='SELECT 1; -- café\n'.encode('utf-8-sig'))),
        ('Latin-1 file edited with a character latin-1 lacks falls back '
         'to UTF-8',
         dict(files={'/a.sql': b'SELECT 1; -- caf\xe9\n'},
              load='/a.sql', save='/a.sql',
              edit='SELECT 1; -- café €\n',
              expected='SELECT 1; -- café €\n'.encode('utf-8'))),
        ('A latin-1 file with the same name in another directory does not '
         'change how this one is saved',
         dict(files={'/a.sql': b'SELECT 1; -- caf\xe9\n',
                     '/sub/a.sql': b'SELECT 2;\n'},
              load='/a.sql', save='/sub/a.sql',
              edit='SELECT 2; -- café\n',
              expected='SELECT 2; -- café\n'.encode('utf-8'))),
    ]

    def setUp(self):
        # Pure request/filesystem logic: no Postgres connection needed.
        unittest.TestCase.setUp(self)
        self.storage_dir = tempfile.mkdtemp(prefix='pga_filemgr_enc_')
        for name, content in self.files.items():
            path = self._path(name)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'wb') as f:
                f.write(content)

    def tearDown(self):
        for name in self.files:
            Filemanager.loaded_file_encodings.pop(
                os.path.realpath(self._path(name)), None)
        shutil.rmtree(self.storage_dir, ignore_errors=True)

    def _path(self, name):
        return os.path.join(self.storage_dir, name.lstrip('/'))

    def _post(self, url, payload):
        with contextlib.ExitStack() as stack:
            stack.enter_context(
                patch('pgadmin.misc.file_manager.get_storage_directory',
                      return_value=self.storage_dir))
            prefs = stack.enter_context(
                patch('pgadmin.misc.file_manager.Preferences.module'))
            prefs.return_value.preference.return_value.get \
                .return_value = MY_STORAGE
            return self.tester.post(url, data=json.dumps(payload),
                                    content_type='application/json')

    def runTest(self):
        response = self._post(LOAD_FILE_URL, {'file_name': self.load})
        self.assertEqual(response.status_code, 200)
        loaded = response.data.decode('utf-8')

        response = self._post(SAVE_FILE_URL, {
            'file_name': self.save,
            'file_content': loaded if self.edit is None else self.edit,
        })
        self.assertEqual(response.status_code, 200)

        with open(self._path(self.save), 'rb') as f:
            self.assertEqual(f.read(), self.expected)
