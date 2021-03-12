##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
from regression.python_test_utils.template_helper import file_as_template
from regression.python_test_utils.sql_template_test_base import \
    SQLTemplateTestBase


class TestTablesAclSql(SQLTemplateTestBase):
    scenarios = [
        ("Test query returns the permissions when there are permissions set up"
         " on the table", dict())
    ]

    def __init__(self):
        super(TestTablesAclSql, self).__init__()
        self.table_id = -1

    def test_setup(self, connection, cursor):
        cursor.execute("GRANT SELECT ON test_table TO PUBLIC")
        cursor = connection.cursor()
        cursor.execute("SELECT oid FROM pg_catalog.pg_class WHERE relname="
                       "'test_table'")
        self.table_id = cursor.fetchone()[0]

    def generate_sql(self, version):
        file_path = os.path.join(os.path.dirname(__file__), "..", "templates",
                                 "tables", "sql")
        template_file = self.get_template_file(version, file_path,
                                               "acl.sql")
        template = file_as_template(template_file)
        public_schema_id = 2200
        sql = template.render(scid=public_schema_id,
                              tid=self.table_id)
        return sql

    def assertions(self, fetch_result, descriptions):
        public_acls = [acl for acl in fetch_result if acl[1] == 'PUBLIC']
        self.assertEqual(len(public_acls), 1)

        new_acl_map = dict(
            zip(map(lambda column: column.name, descriptions), public_acls[0])
        )

        self.assertEqual('PUBLIC', new_acl_map['grantee'])
        self.assertEqual(self.server['username'], new_acl_map['grantor'])
        self.assertEqual('relacl', new_acl_map['deftype'])
        self.assertEqual(['r'], new_acl_map['privileges'])
        self.assertEqual([False], new_acl_map['grantable'])
        return public_acls
