#######################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from pgadmin.utils.compile_template_name import compile_template_name
from pgadmin.utils.route import BaseTestGenerator


class TestCompileTemplateName(BaseTestGenerator):
    scenarios = [
        (
            'When server is Postgres and version is 10, it returns the path '
            'to the postgres template',
            dict(
                server_type='pg',
                version=100000,
                expected_return_value='some/prefix/#100000#/some_file.sql'
            )
        ),
    ]

    def runTest(self):
        result = compile_template_name(
            'some/prefix', 'some_file.sql', self.version
        )
        self.assertEqual(result, self.expected_return_value)
