##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid
import secrets
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression import parent_node_dict
from regression.test_setup import config_data
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.versioned_template_loader import \
    get_version_mapping_directories
from os import path


class ERDSql(BaseTestGenerator):

    def setUp(self):
        self.db_name = "erdtestdb_{0}".format(str(uuid.uuid4())[1:8])
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.did = utils.create_database(self.server, self.db_name)
        self.sgid = config_data["server_group"]
        self.maxDiff = None

    def get_expected_sql(self):
        sql_base_path = path.join(
            path.dirname(path.realpath(__file__)), 'sql')

        # Iterate the version mapping directories.
        for version_mapping in \
                get_version_mapping_directories():
            if version_mapping['number'] > \
                    self.server_information['server_version']:
                continue

            complete_path = path.join(
                sql_base_path, version_mapping['name'])

            if not path.exists(complete_path):
                continue
            break

        data_sql = ''
        with open(path.join(complete_path, 'test_sql_output.sql')) as fp:
            data_sql = fp.read()

        return data_sql

    def runTest(self):
        db_con = database_utils.connect_database(self,
                                                 self.sgid,
                                                 self.sid,
                                                 self.did)

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database to add the schema.")

        trans_id = secrets.choice(range(1, 9999999))
        url = '/erd/sql/{trans_id}/{sgid}/{sid}/{did}'.format(
            trans_id=trans_id, sgid=self.sgid, sid=self.sid, did=self.did)

        curr_dir = path.dirname(__file__)

        data_json = None
        with open(path.join(curr_dir, 'test_sql_input_data.json')) as fp:
            data_json = fp.read()

        response = self.tester.post(url,
                                    data=data_json,
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)

        data_sql = self.get_expected_sql()

        resp_sql = json.loads(response.data.decode('utf-8'))['data']
        self.assertEqual(resp_sql, data_sql)

    def tearDown(self):
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        utils.drop_database(connection, self.db_name)
