##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid
import random
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression import parent_node_dict
from regression.test_setup import config_data
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils


class ERDTables(BaseTestGenerator):

    def dropDB(self):
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        utils.drop_database(connection, self.db_name)

    def setUp(self):
        self.db_name = "erdtestdb_{0}".format(str(uuid.uuid4())[1:8])
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.did = utils.create_database(self.server, self.db_name)

        try:
            self.sgid = config_data["server_group"]
            self.tables = [
                ["erd1", "table_1"], ["erd2", "table_2"]
            ]

            for tab in self.tables:
                connection = utils.get_db_connection(
                    self.db_name, self.server['username'],
                    self.server['db_password'], self.server['host'],
                    self.server['port'])
                schema_utils.create_schema(connection, tab[0])
                tables_utils.create_table(self.server, self.db_name, tab[0],
                                          tab[1])
                connection.close()
        except Exception as _:
            self.dropDB()
            raise

    def runTest(self):
        db_con = database_utils.connect_database(self,
                                                 self.sgid,
                                                 self.sid,
                                                 self.did)

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database to add the schema.")

        trans_id = random.randint(1, 9999999)
        url = '/erd/tables/{trans_id}/{sgid}/{sid}/{did}'.format(
            trans_id=trans_id, sgid=self.sgid, sid=self.sid, did=self.did)

        response = self.tester.get(url)
        self.assertEqual(response.status_code, 200)

        response = json.loads(response.data.decode('utf-8'))
        self.assertEqual(self.tables, [[tab['schema'], tab['name']]
                                       for tab in response['data']])

    def tearDown(self):
        self.dropDB()
