##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from .. import utils


class ParseVariablesFromDbTestCase(BaseTestGenerator):
    """Check that setconfig entries are split into name and value."""

    scenarios = [
        ('Plain value', {
            'rows': [{'setconfig': ['work_mem=64MB']}],
            'expected': [{'name': 'work_mem', 'value': '64MB'}]
        }),
        ('Value containing an equals sign', {
            'rows': [{'setconfig': ['app.jwt_secret=c2VjcmV0LWtleQ==']}],
            'expected': [{'name': 'app.jwt_secret',
                          'value': 'c2VjcmV0LWtleQ=='}]
        }),
        ('Value that is a key=value pair', {
            'rows': [{'setconfig': ['application_name=a=b']}],
            'expected': [{'name': 'application_name', 'value': 'a=b'}]
        }),
        ('Boolean value with role and database', {
            'rows': [{'setconfig': ['enable_seqscan=off'],
                      'user_name': 'role1', 'db_name': 'db1'}],
            'expected': [{'name': 'enable_seqscan', 'value': False,
                          'role': 'role1', 'database': 'db1'}]
        }),
        ('No variables', {
            'rows': [{'setconfig': None}],
            'expected': []
        }),
    ]

    def runTest(self):
        result = utils.parse_variables_from_db(self.rows)
        self.assertEqual(result, {'variables': self.expected})
