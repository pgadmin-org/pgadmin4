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


class ERDPrequisite(BaseTestGenerator):

    def setUp(self):
        self.db_name = "erdtestdb_{0}".format(str(uuid.uuid4())[1:8])
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.did = utils.create_database(self.server, self.db_name)
        self.sgid = config_data["server_group"]

    def runTest(self):
        db_con = database_utils.connect_database(self,
                                                 self.sgid,
                                                 self.sid,
                                                 self.did)

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database to add the schema.")

        trans_id = random.randint(1, 9999999)
        url = '/erd/prequisite/{trans_id}/{sgid}/{sid}/{did}'.format(
            trans_id=trans_id, sgid=self.sgid, sid=self.sid, did=self.did)

        response = self.tester.get(url)
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertIn('col_types', response_data['data'])
        self.assertIn('schemas', response_data['data'])

    def tearDown(self):
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        utils.drop_database(connection, self.db_name)
