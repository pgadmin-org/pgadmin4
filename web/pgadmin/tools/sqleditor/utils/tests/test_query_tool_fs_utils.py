##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import os
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools.sqleditor.utils.query_tool_fs_utils import \
    read_file_generator


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
        self.dir_path = os.path.dirname(os.path.realpath(__file__))
        self.complate_path = os.path.join(self.dir_path, self.file)

    def runTest(self):
        result = read_file_generator(self.complate_path, self.encoding)
        # Check if file is read properly by the generator
        self.assertIn('SELECT 1', next(result))
