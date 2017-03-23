##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys

from pgadmin.utils.driver import DriverRegistry
from regression.python_test_utils.template_helper import file_as_template

DriverRegistry.load_drivers()
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils

if sys.version_info[0] >= 3:
    long = int


class TestTablesAcl(BaseTestGenerator):
    def runTest(self):
        """ This tests that when there are permissions set up on the table, acl query returns the permissions"""
        with test_utils.Database(self.server) as (connection, database_name):
            test_utils.create_table(self.server, database_name, "test_table")

            cursor = connection.cursor()
            cursor.execute("GRANT SELECT ON test_table TO PUBLIC")

            cursor = connection.cursor()
            cursor.execute("SELECT oid FROM pg_class WHERE relname='test_table'")
            table_id = cursor.fetchone()[0]

            if connection.server_version < 90100:
                self.versions_to_test = ['default']
            else:
                self.versions_to_test = ['9.1_plus']

            for version in self.versions_to_test:
                template_file = os.path.join(os.path.dirname(__file__), "..", version, "acl.sql")
                template = file_as_template(template_file)
                public_schema_id = 2200
                sql = template.render(scid=public_schema_id,
                                      tid=table_id)

                cursor = connection.cursor()
                cursor.execute(sql)
                fetch_result = cursor.fetchall()
                public_acls = filter(lambda (acl): acl[1] == 'PUBLIC', fetch_result)
                self.assertEqual(len(public_acls), 1)

                new_acl_map = dict(zip(map(lambda (column): column.name, cursor.description), public_acls[0]))

                self.assertEqual('PUBLIC', new_acl_map['grantee'])
                self.assertEqual(self.server['username'], new_acl_map['grantor'])
                self.assertEqual('relacl', new_acl_map['deftype'])
                self.assertEqual(['r'], new_acl_map['privileges'])
                self.assertEqual([False], new_acl_map['grantable'])