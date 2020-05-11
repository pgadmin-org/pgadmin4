##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils as server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as tables_utils


class TableUpdateParameterTestCase(BaseTestGenerator):
    """This class will add new collation under schema node."""
    scenarios = [
        # Fetching default URL for table node.
        ('Enable custom auto vacuum and set the parameters for table '
         'without autovacuum_enabled',
         dict(url='/browser/table/obj/',
              api_data={
                  'autovacuum_custom': True,
                  'vacuum_table': {
                      'changed': [
                          {'name': 'autovacuum_vacuum_cost_delay',
                           'value': 20},
                          {'name': 'autovacuum_vacuum_threshold',
                           'value': 20}
                      ]
                  }}
              )
         ),
        ('Change a parameter to zero value '
         'without autovacuum_enabled',
         dict(url='/browser/table/obj/',
              api_data={
                  'vacuum_table': {
                      'changed': [
                          {'name': 'autovacuum_vacuum_cost_delay',
                           'value': 0}
                      ]
                  }}
              )
         ),
        ('Enable autovacuum_enabled',
         dict(url='/browser/table/obj/',
              api_data={'autovacuum_enabled': 't'}
              )
         ),
        ('Reset individual parameters for table',
         dict(url='/browser/table/obj/',
              api_data={
                  'autovacuum_enabled': 'x',
                  'vacuum_table': {
                      'changed': [
                          {'name': 'autovacuum_vacuum_cost_delay',
                           'value': None},
                      ]
                  }}
              )
         ),
        ('Reset custom auto vacuum',
         dict(url='/browser/table/obj/',
              api_data={'autovacuum_custom': False}
              )
         ),
        ('Enable toast custom auto vacuum and set the parameters for table '
         'without autovacuum_enabled',
         dict(url='/browser/table/obj/',
              api_data={
                  'toast_autovacuum': True,
                  'vacuum_toast': {
                      'changed': [
                          {'name': 'autovacuum_vacuum_cost_delay',
                           'value': 20},
                          {'name': 'autovacuum_vacuum_threshold',
                           'value': 20}
                      ]
                  }}
              )
         ),
        ('Change a toast parameter to zero value '
         'without autovacuum_enabled',
         dict(url='/browser/table/obj/',
              api_data={
                  'vacuum_toast': {
                      'changed': [
                          {'name': 'autovacuum_vacuum_cost_delay',
                           'value': 0}
                      ]
                  }}
              )
         ),
        ('Enable toast.autovacuum_enabled',
         dict(url='/browser/table/obj/',
              api_data={'toast_autovacuum_enabled': 't'}
              )
         ),
        ('Reset individual toast parameters for table',
         dict(url='/browser/table/obj/',
              api_data={
                  'toast_autovacuum_enabled': 'x',
                  'vacuum_toast': {
                      'changed': [
                          {'name': 'autovacuum_vacuum_cost_delay',
                           'value': None},
                      ]
                  }}
              )
         ),
        ('Reset auto vacuum',
         dict(url='/browser/table/obj/',
              api_data={'toast_autovacuum': False}
              )
         ),
    ]

    table_name = "test_table_parameters_%s" % (str(uuid.uuid4())[1:8])

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")

        self.table_id = tables_utils.get_table_id(self.server, self.db_name,
                                                  self.table_name)
        if self.table_id is None:
            self.table_id = tables_utils.create_table(
                self.server, self.db_name,
                self.schema_name,
                self.table_name)

    def runTest(self):
        """This function will fetch added table under schema node."""
        table_response = tables_utils.verify_table(self.server, self.db_name,
                                                   self.table_id)
        if not table_response:
            raise Exception("Could not find the table to update.")

        data = self.api_data
        data['oid'] = self.table_id
        response = self.tester.put(self.url + str(utils.SERVER_GROUP) + '/' +
                                   str(self.server_id) + '/' +
                                   str(self.db_id) + '/' +
                                   str(self.schema_id) + '/' +
                                   str(self.table_id),
                                   data=json.dumps(data),
                                   follow_redirects=True)
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
