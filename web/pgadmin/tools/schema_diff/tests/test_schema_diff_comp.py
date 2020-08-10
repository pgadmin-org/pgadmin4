##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json
import os
import random

from pgadmin.utils import server_utils as server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from .utils import create_table, create_schema, restore_schema
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.versioned_template_loader import \
    get_version_mapping_directories


class SchemaDiffTestCase():
    """ This class will test the schema diff. """
    scenarios = [
        # Fetching default URL for database node.
        ('Schema diff comparison', dict(
            url='schema_diff/compare/{0}/{1}/{2}/{3}/{4}/{5}/{6}'))
    ]

    def setUp(self):
        self.src_database = "db_schema_diff_src_%s" % str(uuid.uuid4())[1:8]
        self.tar_database = "db_schema_diff_tar_%s" % str(uuid.uuid4())[1:8]

        self.src_db_id = utils.create_database(self.server, self.src_database)
        self.tar_db_id = utils.create_database(self.server, self.tar_database)

        self.server = parent_node_dict["server"][-1]["server"]
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        self.nodes = ['table', 'function', 'procedure', 'view', 'mview']
        self.restore_backup()

    def restore_backup(self):
        self.sql_folder = self.get_sql_folder()

        if self.sql_folder is None:
            raise FileNotFoundError('Schema diff folder does not exists')

        src_sql_path = os.path.join(self.sql_folder, 'source.sql')
        tar_sql_path = os.path.join(self.sql_folder, 'target.sql')

        if not os.path.exists(src_sql_path):
            raise FileNotFoundError(
                '{} file does not exists'.format(src_sql_path))

        if not os.path.exists(tar_sql_path):
            raise FileNotFoundError(
                '{} file does not exists'.format(tar_sql_path))

        self.src_schema_id = restore_schema(self.server, self.src_database,
                                            'source', src_sql_path)
        self.tar_schema_id = restore_schema(self.server, self.tar_database,
                                            'target', tar_sql_path)

    def get_sql_folder(self):
        """
        This function will get the appropriate test folder based on
        server version and their existence.

        :param module_path: Path of the module to be tested.
        :return:
        """
        # Join the application path, module path and tests folder
        tests_folder_path = os.path.dirname(os.path.abspath(__file__))

        # A folder name matching the Server Type (pg, ppas) takes priority so
        # check whether that exists or not. If so, than check the version
        # folder in it, else look directly in the 'tests' folder.
        absolute_path = os.path.join(tests_folder_path, self.server['type'])
        if not os.path.exists(absolute_path):
            absolute_path = tests_folder_path

        # Iterate the version mapping directories.
        for version_mapping in get_version_mapping_directories(
                self.server['type']):
            if version_mapping['number'] > \
                    self.server_information['server_version']:
                continue

            complete_path = os.path.join(absolute_path,
                                         version_mapping['name'])

            if os.path.exists(complete_path):
                return complete_path

        return None

    def compare(self):
        comp_url = self.url.format(self.trans_id, self.server_id,
                                   self.src_db_id,
                                   self.src_schema_id,
                                   self.server_id,
                                   self.tar_db_id,
                                   self.tar_schema_id
                                   )

        response = self.tester.get(comp_url)

        self.assertEquals(response.status_code, 200)
        return json.loads(response.data.decode('utf-8'))

    def runTest(self):
        """ This function will test the schema diff."""

        response = self.tester.get("schema_diff/initialize")
        self.assertEquals(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.trans_id = response_data['data']['schemaDiffTransId']

        url = 'schema_diff/server/connect/{}'.format(self.server_id)
        data = {'password': self.server['db_password']}
        response = self.tester.post(url,
                                    data=json.dumps(data),
                                    content_type='html/json'
                                    )
        response = self.tester.post(
            'schema_diff/database/connect/{0}/{1}'.format(
                self.server_id,
                self.src_db_id))
        response = self.tester.post(
            'schema_diff/database/connect/{0}/{1}'.format(
                self.server_id,
                self.tar_db_id))

        response_data = self.compare()

        diff_file = os.path.join(self.sql_folder, 'diff_{0}.sql'.format(
            str(random.randint(1, 99999))))
        file_obj = open(diff_file, 'a')

        for diff in response_data['data']:
            if diff['type'] in self.nodes and diff['status'] == 'Identical':
                src_obj_oid = diff['source_oid']
                tar_obj_oid = diff['target_oid']
                if src_obj_oid is not None and tar_obj_oid is not None:
                    url = 'schema_diff/ddl_compare/{0}/{1}/{2}/{3}/{4}/{5}/' \
                          '{6}/{7}/{8}/{9}/{10}/'.format(self.trans_id,
                                                         self.server_id,
                                                         self.src_db_id,
                                                         self.src_schema_id,
                                                         self.server_id,
                                                         self.tar_db_id,
                                                         self.tar_schema_id,
                                                         src_obj_oid,
                                                         tar_obj_oid,
                                                         diff['type'],
                                                         diff['status']
                                                         )

                    response = self.tester.get(url)

                    self.assertEquals(response.status_code, 200)
                    response_data = json.loads(response.data.decode('utf-8'))
                    file_obj.write(response_data['diff_ddl'])
            elif 'diff_ddl' in diff:
                file_obj.write(diff['diff_ddl'])

        file_obj.close()
        try:
            restore_schema(self.server, self.tar_database, 'target',
                           diff_file)

            os.remove(diff_file)

            response_data = self.compare()
            for diff in response_data['data']:
                if diff['type'] in self.nodes:
                    self.assertEquals(diff['status'], 'Identical')
        except Exception as e:
            os.remove(diff_file)

    def tearDown(self):
        """This function drop the added database"""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        utils.drop_database(connection, self.src_database)
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        utils.drop_database(connection, self.tar_database)
