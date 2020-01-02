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
        ('Enable custom auto vacuum and set the parameters for table',
         dict(url='/browser/table/obj/', type='set_vacuum_parameters')
         ),
        ('Disable auto vacuum and reset the parameters for table',
         dict(url='/browser/table/obj/', type='reset_vacuum_parameters')
         ),
        ('Disable custom auto vacuum and reset all the parameters for table',
         dict(url='/browser/table/obj/', type='reset_all_vacuum_parameters')
         ),
        ('Enable custom auto vacuum and set the toast parameters for table',
         dict(url='/browser/table/obj/', type='set_toast_parameters')
         ),
        ('Disable auto vacuum and reset the toast parameters for table',
         dict(url='/browser/table/obj/', type='reset_toast_parameters')
         ),
        ('Disable custom auto vacuum and reset all the toast '
         'parameters for table',
         dict(url='/browser/table/obj/', type='reset_all_toast_parameters')
         )
    ]

    @classmethod
    def setUpClass(self):
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
        self.table_name = "test_table_parameters_%s" % (str(uuid.uuid4())[1:8])

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

        data = None
        if self.type == 'set_vacuum_parameters':
            data = dict({'oid': self.table_id,
                         'autovacuum_custom': True,
                         'autovacuum_enabled': True,
                         'vacuum_table': dict({'changed': [
                             {'name': 'autovacuum_vacuum_cost_delay',
                              'value': 20},
                             {'name': 'autovacuum_vacuum_threshold',
                              'value': 20}
                         ]})})
        elif self.type == 'reset_vacuum_parameters':
            data = dict({'oid': self.table_id,
                         'autovacuum_enabled': False,
                         'vacuum_table': dict({'changed': [
                             {'name': 'autovacuum_vacuum_cost_delay',
                              'value': None},
                             {'name': 'autovacuum_vacuum_threshold',
                              'value': None}
                         ]})})
        elif self.type == 'reset_all_vacuum_parameters':
            data = dict({'oid': self.table_id, 'autovacuum_custom': False})
        elif self.type == 'set_toast_parameters':
            data = dict({'oid': self.table_id,
                         'autovacuum_custom': True,
                         'autovacuum_enabled': True,
                         'vacuum_toast': dict({'changed': [
                             {'name': 'autovacuum_vacuum_cost_delay',
                              'value': 20},
                             {'name': 'autovacuum_vacuum_threshold',
                              'value': 20}
                         ]})})
        elif self.type == 'reset_toast_parameters':
            data = dict({'oid': self.table_id,
                         'autovacuum_enabled': False,
                         'vacuum_toast': dict({'changed': [
                             {'name': 'autovacuum_vacuum_cost_delay',
                              'value': None},
                             {'name': 'autovacuum_vacuum_threshold',
                              'value': None}
                         ]})})
        elif self.type == 'reset_all_toast_parameters':
            data = dict({'oid': self.table_id, 'autovacuum_custom': False})

        response = self.tester.put(self.url + str(utils.SERVER_GROUP) + '/' +
                                   str(self.server_id) + '/' +
                                   str(self.db_id) + '/' +
                                   str(self.schema_id) + '/' +
                                   str(self.table_id),
                                   data=json.dumps(data),
                                   follow_redirects=True)
        self.assertEquals(response.status_code, 200)

    @classmethod
    def tearDownClass(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
