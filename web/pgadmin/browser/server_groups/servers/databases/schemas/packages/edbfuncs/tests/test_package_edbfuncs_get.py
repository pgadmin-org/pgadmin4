##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils as server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils


class PackageEDBFuncsGetTestCase(BaseTestGenerator):
    """ This class will fetch functions/procedures of package
     under test schema. """
    skip_on_database = ['gpdb', 'pg']

    scenarios = [
        # Fetching default URL for package node.
        ('Fetch Package Functions/Procedures URL', dict(
            url='/browser/{0}/nodes/'))
    ]

    def setUp(self):
        super(PackageEDBFuncsGetTestCase, self).setUp()
        schema_info = parent_node_dict["schema"][-1]
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.pkg_name = "pkg_%s" % str(uuid.uuid4())[1:8]
        self.proc_name = "proc_%s" % str(uuid.uuid4())[1:8]
        self.func_name = "func_%s" % str(uuid.uuid4())[1:8]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        server_con = server_utils.connect_server(self, self.server_id)

        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        pg_cursor = connection.cursor()
        query = """
        CREATE OR REPLACE PACKAGE %s.%s
IS
    emp_name character varying(10);
    PROCEDURE %s(INOUT p_empno numeric);
    FUNCTION %s() RETURN integer;
END %s;


CREATE OR REPLACE PACKAGE BODY %s.%s
IS
    v_counter integer;
    PROCEDURE %s(INOUT p_empno numeric) IS
    BEGIN
        SELECT ename INTO emp_name FROM emp WHERE empno = p_empno;
        v_counter := v_counter + 1;
    END;
    FUNCTION %s() RETURN integer IS
    BEGIN
        RETURN v_counter;
    END;
END %s;""" % (self.schema_name, self.pkg_name, self.proc_name,
              self.func_name, self.pkg_name, self.schema_name,
              self.pkg_name, self.proc_name, self.func_name,
              self.pkg_name)

        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created package
        pg_cursor.execute("SELECT oid FROM pg_namespace"
                          " WHERE nspname='%s'" %
                          self.pkg_name)
        self.package_id = pg_cursor.fetchone()[0]
        connection.close()

    def runTest(self):
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")

        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")

        # Fetch Package function
        url = self.url.format('edbfunc') + str(
            utils.SERVER_GROUP) + '/' + str(self.server_id) + '/' + str(
            self.db_id) + '/' + str(self.schema_id) + '/' + str(
            self.package_id) + "/"
        response = self.tester.get(url,
                                   content_type='html/json')

        response_data = json.loads(response.data.decode('utf-8'))

        self.assertEquals(response.status_code, 200)
        self.assertEquals(len(response_data['data']), 1)
        self.assertEquals(response_data['data'][0]['label'],
                          self.func_name + '()')
        self.assertEquals(response_data['data'][0]['_type'], 'edbfunc')

        # Fetch Package procedure
        url = self.url.format('edbproc') + str(
            utils.SERVER_GROUP) + '/' + str(self.server_id) + '/' + str(
            self.db_id) + '/' + str(self.schema_id) + '/' + str(
            self.package_id) + "/"
        response = self.tester.get(url,
                                   content_type='html/json')

        response_data = json.loads(response.data.decode('utf-8'))

        self.assertEquals(response.status_code, 200)
        self.assertEquals(len(response_data['data']), 1)
        self.assertIn(self.proc_name, response_data['data'][0]['label'])
        self.assertIn("INOUT", response_data['data'][0]['label'])
        self.assertEquals(response_data['data'][0]['_type'], 'edbproc')

    def tearDown(self):
        """This function disconnect the test database."""
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
