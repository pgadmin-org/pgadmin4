##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.tools.maintenance import Message
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import patch


class MaintenanceMessageTest(BaseTestGenerator):
    """Test the Maintenance Message class"""

    SERVER_NAME = "server (host:port)"
    scenarios = [
        ('When maintained the server with VACUUM on database',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'op': 'VACUUM',
                     'vacuum_analyze': False,
                     'vacuum_freeze': False,
                     'vacuum_full': False,
                     'verbose': True
                 },
                 cmd="VACUUM VERBOSE;\n"
             ),
             expected_msg="VACUUM on database 'postgres' of server " +
                          SERVER_NAME
         )),
        ('When maintained the server with VACUUM on table ',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'schema': 'test_schema',
                     'table': 'test_table',
                     'op': 'VACUUM',
                     'verbose': True
                 },
                 cmd="VACUUM FULL;\n"
             ),
             expected_msg="VACUUM on table 'postgres/test_schema/test_table' "
                          "of server " + SERVER_NAME
         )),
        ('When maintained the server with VACUUM on constraint ',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'schema': 'test_schema',
                     'table': 'test_table',
                     'primary_key': 'test_pkey',
                     'op': 'VACUUM',
                     'verbose': True
                 },
                 cmd="VACUUM FULL VERBOSE;\n"
             ),
             expected_msg="VACUUM on constraint "
                          "'postgres/test_schema/test_table/test_pkey' "
                          "of server " + SERVER_NAME
         )),
        ('When maintained the server with VACUUM on index ',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'schema': 'test_schema',
                     'table': 'test_table',
                     'index': 'test_idx',
                     'op': 'VACUUM',
                     'verbose': True
                 },
                 cmd="VACUUM FULL VERBOSE;\n"
             ),
             expected_msg="VACUUM on index "
                          "'postgres/test_schema/test_table/test_idx' "
                          "of server " + SERVER_NAME
         )),
        ('When maintained the server with ANALYZE on database',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'op': 'ANALYZE',
                     'verbose': True
                 },
                 cmd="ANALYZE VERBOSE;\n"
             ),
             expected_msg="ANALYZE on database 'postgres' of server " +
                          SERVER_NAME
         )),
        ('When maintained the server with ANALYZE on table ',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'schema': 'test_schema',
                     'table': 'test_table',
                     'op': 'ANALYZE',
                     'verbose': True
                 },
                 cmd="ANALYZE VERBOSE;\n"
             ),
             expected_msg="ANALYZE on table 'postgres/test_schema/test_table' "
                          "of server " + SERVER_NAME
         )),
        ('When maintained the server with ANALYZE on constraint ',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'schema': 'test_schema',
                     'table': 'test_table',
                     'primary_key': 'test_pkey',
                     'op': 'ANALYZE',
                     'verbose': True
                 },
                 cmd="ANALYZE FULL VERBOSE;\n"
             ),
             expected_msg="ANALYZE on constraint "
                          "'postgres/test_schema/test_table/test_pkey' "
                          "of server " + SERVER_NAME
         )),
        ('When maintained the server with ANALYZE on index ',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'schema': 'test_schema',
                     'table': 'test_table',
                     'index': 'test_idx',
                     'op': 'ANALYZE',
                     'verbose': True
                 },
                 cmd="ANALYZE;\n"
             ),
             expected_msg="ANALYZE on index "
                          "'postgres/test_schema/test_table/test_idx' "
                          "of server " + SERVER_NAME
         )),
        ('When maintained the server with REINDEX on database',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'op': 'REINDEX',
                     'verbose': False
                 },
                 cmd="REINDEX (VERBOSE);\n"
             ),
             expected_msg="REINDEX on database 'postgres' of server " +
                          SERVER_NAME
         )),
        ('When maintained the server with REINDEX on schema',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'schema': 'test_schema',
                     'op': 'REINDEX',
                     'verbose': False
                 },
                 cmd="REINDEX (VERBOSE);\n"
             ),
             expected_msg="REINDEX SCHEMA on schema 'postgres/test_schema' "
                          "of server " + SERVER_NAME
         )),
        ('When maintained the server with REINDEX on table',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'schema': 'test_schema',
                     'table': 'test_table',
                     'op': 'REINDEX',
                     'verbose': False
                 },
                 cmd="REINDEX;\n"
             ),
             expected_msg="REINDEX TABLE on table "
                          "'postgres/test_schema/test_table' of server " +
                          SERVER_NAME
         )),
        ('When maintained the server with REINDEX on index',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'schema': 'test_schema',
                     'table': 'test_table',
                     'primary_key': 'test_pkey',
                     'op': 'REINDEX',
                     'verbose': False
                 },
                 cmd="REINDEX;\n"
             ),
             expected_msg="REINDEX INDEX on constraint "
                          "'postgres/test_schema/test_table/test_pkey' "
                          "of server " + SERVER_NAME
         )),
        ('When maintained the server with CLUSTER',
         dict(
             class_params=dict(
                 sid=1,
                 data={
                     'database': 'postgres',
                     'op': 'CLUSTER',
                     'verbose': True
                 },
                 cmd="CLUSTER VERBOSE;\n"
             ),
             expected_msg="CLUSTER on database 'postgres' of server " +
                          SERVER_NAME

         )),
    ]

    @patch('pgadmin.tools.maintenance.Message.get_server_name')
    def runTest(self, get_server_name_mock):
        get_server_name_mock.return_value = self.SERVER_NAME
        maintenance_obj = Message(
            self.class_params['sid'],
            self.class_params['data'],
            self.class_params['cmd']
        )

        # Check the expected message returned
        self.assertEqual(maintenance_obj.message, self.expected_msg)
