##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid
import re

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as funcs_utils


class ProcedureExecSQLTestCase(BaseTestGenerator):
    """ This class will check the EXEC SQL for Procedure. """
    scenarios = [
        # Fetching procedure SQL to EXEC.
        ('Fetch Procedure SQL to execute', dict(
            url='/browser/procedure/exec_sql/', with_args=False, args="",
            expected_sql="{0} {1}.{2}()")),
        ('Fetch Procedure with arguments SQL to execute', dict(
            url='/browser/procedure/exec_sql/', with_args=True,
            args="arg1 bigint",
            expected_sql="{0} {1}.{2}( <arg1 bigint> )"))
    ]

    def runTest(self):
        """ This function will check the EXEC SQL. """
        super().setUp()
        self = funcs_utils.set_up(self)

        if self.server_type == "pg" and\
                self.server_version < 110000:
            message = "Procedures are not supported by PG < 110000."
            self.skipTest(message)

        if self.with_args and self.server_version >= 140000:
            self.expected_sql = "{0} {1}.{2}( <IN arg1 bigint> )"

        proc_name = "test_procedure_exec_sql_%s" % str(uuid.uuid4())[1:8]
        proc_info = funcs_utils.create_procedure(
            self.server, self.db_name, self.schema_name, proc_name,
            self.server_type, self.server_version, self.with_args, self.args)

        proc_id = proc_info[0]

        exec_response = self.tester.get(
            self.url + str(utils.SERVER_GROUP) +
            '/' + str(self.server_id) + '/' + str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(proc_id))
        self.assertEqual(exec_response.status_code, 200)
        exec_sql = json.loads(exec_response.data.decode('utf-8'))

        # Replace multiple spaces with one space and check the expected sql
        sql = re.sub('\s+', ' ', exec_sql).strip()

        # Verify the expected EXEC SQL
        if self.server_type == "pg":
            expected_sql = self.expected_sql.format("CALL", self.schema_name,
                                                    proc_name)
        else:
            expected_sql = self.expected_sql.format("EXEC", self.schema_name,
                                                    proc_name)

        self.assertEqual(sql, expected_sql)

        # Verify the EXEC SQL by running it if we don't have arguments
        if not self.with_args:
            funcs_utils.execute_procedure(self.server, self.db_name, exec_sql)

        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def tearDown(self):
        pass
