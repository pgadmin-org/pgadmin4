##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json
import os
import secrets

from pgadmin.utils.route import BaseTestGenerator, BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from .utils import apply_sql_chunks, restore_schema
from pgadmin.utils.versioned_template_loader import \
    get_version_mapping_directories


class SchemaDiffTestCase(BaseSocketTestGenerator):
    """ This class will test the schema diff. """
    scenarios = [
        # Fetching default URL for database node.
        ('Schema diff comparison', dict(
            url='schema_diff/compare_database/{0}/{1}/{2}/{3}/{4}/0/0'))
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    # Objects that the generated script is known not to settle yet, each
    # with the issue that covers it. The test fails on anything outside
    # this list, and also fails when something on it starts working, so
    # that the list cannot quietly rot.
    KNOWN_DIFFERENCES = {
        # Rebuilding a partitioned table leaves its scaffolding default
        # partition behind.
        'table table_for_partition_1': 10301,
        # CREATE OR REPLACE wraps the body in newlines, leaving a
        # whitespace-only difference.
        'procedure proc1(IN arg1 bigint)': 10302,
    }

    def setUp(self):
        super().setUp()
        self.src_database = "db_schema_diff_src_%s" % str(uuid.uuid4())[1:8]
        self.tar_database = "db_schema_diff_tar_%s" % str(uuid.uuid4())[1:8]

        self.src_db_id = utils.create_database(self.server, self.src_database)
        self.tar_db_id = utils.create_database(self.server, self.tar_database)

        self.server = parent_node_dict["server"][-1]["server"]
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        self.schema_name = 'test_schema_diff'

        self.restored_backup = True
        status = self.restore_backup()
        if not status:
            self.restored_backup = False

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

        status, self.src_schema_id, _ = restore_schema(
            self.server, self.src_database, self.schema_name, src_sql_path)
        if not status:
            print("Failed to restore schema on source database.")
            return False

        status, self.tar_schema_id, _ = restore_schema(
            self.server, self.tar_database, self.schema_name, tar_sql_path)
        if not status:
            print("Failed to restore schema on target database.")
            return False

        return True

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
        for version_mapping in get_version_mapping_directories():
            if version_mapping['number'] > \
                    self.server_information['server_version']:
                continue

            complete_path = os.path.join(absolute_path,
                                         version_mapping['name'])

            if os.path.exists(complete_path):
                return complete_path

        return None

    def compare(self):
        data = {
            'trans_id': self.trans_id,
            'source_sid': self.server_id,
            'source_did': self.src_db_id,
            'target_sid': self.server_id,
            'target_did': self.tar_db_id,
            'ignore_owner': 0,
            'ignore_whitespaces': 0,
            'ignore_tablespace': 0,
            'ignore_grants': 0
        }
        self.socket_client.emit('compare_database', data,
                                namespace=self.SOCKET_NAMESPACE)
        received = self.socket_client.get_received(self.SOCKET_NAMESPACE)

        # A comparison that throws part way through still reports the
        # objects it managed to get through, so watching only for the
        # success message would quietly assert against a fraction of the
        # databases.
        failures = [message['args'][0] for message in received
                    if message['name'] == 'compare_database_failed']
        self.assertEqual(failures, [], 'The comparison failed')

        response_data = received[-1]['args'][0]
        self.assertEqual(received[-1]['name'], "compare_database_success",
                         response_data)
        return response_data

    def runTest(self):
        """ This function will test the schema diff."""
        self.assertEqual(True, self.restored_backup)
        self.trans_id = str(secrets.choice(range(1, 99999)))
        init_url = 'schema_diff/initialize/{}'.format(self.trans_id)
        response = self.tester.get(init_url)
        self.assertEqual(response.status_code, 200)

        received = self.socket_client.get_received(self.SOCKET_NAMESPACE)
        assert received[0]['name'] == 'connected'

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
            str(secrets.choice(range(1, 99999)))))
        file_obj = open(diff_file, 'a')

        chunks = []

        for diff in response_data:
            ddl = None
            if diff['status'] == 'Identical':
                src_obj_oid = diff['source_oid']
                tar_obj_oid = diff['target_oid']
                src_schema_id = diff['source_scid']
                tar_schema_id = diff['target_scid']

                if src_obj_oid is not None and tar_obj_oid is not None:
                    url = 'schema_diff/ddl_compare/{0}/{1}/{2}/{3}/{4}/{5}/' \
                          '{6}/{7}/{8}/{9}/{10}/'.format(self.trans_id,
                                                         self.server_id,
                                                         self.src_db_id,
                                                         src_schema_id,
                                                         self.server_id,
                                                         self.tar_db_id,
                                                         tar_schema_id,
                                                         src_obj_oid,
                                                         tar_obj_oid,
                                                         diff['type'],
                                                         diff['status']
                                                         )

                    response = self.tester.get(url)

                    self.assertEqual(response.status_code, 200)
                    ddl_response = json.loads(response.data.decode('utf-8'))
                    ddl = ddl_response['diff_ddl']
            elif 'diff_ddl' in diff:
                ddl = diff['diff_ddl']

            if ddl and ddl.strip():
                file_obj.write(ddl)
                chunks.append(('{0} {1}'.format(diff['type'], diff['title']),
                               ddl))

        file_obj.close()

        # Every object's SQL has to be valid, and applying the lot has to
        # leave the two databases identical. Anything else is a bug in the
        # SQL we generate, so it fails the test rather than being discarded
        # the way it was before #10293. The script is left on disk when it
        # does fail, since it is the evidence of what went wrong.
        #
        # The objects go in one at a time and are retried, rather than as a
        # single script, because Schema Diff no longer orders the script it
        # generates by dependency (#10295), so an object can fail purely
        # because something it needs comes later on. Retrying tells that
        # apart from SQL that is simply wrong; once #10295 is fixed this
        # can go back to applying the script in one go.
        _, failed = apply_sql_chunks(self.server, self.tar_database, chunks)
        if failed:
            self.fail(
                'The SQL generated for {0} of {1} object(s) never applied:'
                '\n{2}\nThe script has been left at {3}'.format(
                    len(failed), len(chunks),
                    '\n'.join('  {0}: {1}'.format(label, error)
                              for label, _, error in failed),
                    diff_file))

        response_data = self.compare()
        not_identical = {'{0} {1}'.format(diff['type'], diff['title'])
                         for diff in response_data
                         if diff['status'] != 'Identical'}

        unexpected = not_identical - set(self.KNOWN_DIFFERENCES)
        if unexpected:
            self.fail('Applying the generated script left {0} object(s) '
                      'unexpectedly different: {1}\nThe script has been '
                      'left at {2}'.format(len(unexpected),
                                           ', '.join(sorted(unexpected)),
                                           diff_file))

        settled = set(self.KNOWN_DIFFERENCES) - not_identical
        if settled:
            self.fail('{0} settles now that the generated script has been '
                      'applied, so it should come off '
                      'KNOWN_DIFFERENCES'.format(', '.join(sorted(settled))))

        os.remove(diff_file)

    def tearDown(self):
        """This function drop the added database"""
        super().tearDown()
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
