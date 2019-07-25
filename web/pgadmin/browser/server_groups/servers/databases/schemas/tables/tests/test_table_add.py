##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
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


class TableAddTestCase(BaseTestGenerator):
    """ This class will add new collation under schema node. """
    scenarios = [
        # Fetching default URL for table node.
        ('Create Table', dict(url='/browser/table/obj/')),
        ('Create Range partitioned table with 2 partitions',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='range',
              skip_msg='Partitioned table are not supported by '
                       'PPAS/PG 10.0 and below.'
              )
         ),
        ('Create Range partitioned table with 1 default and 2'
         ' value based partition',
         dict(url='/browser/table/obj/',
              server_min_version=110000,
              partition_type='range',
              is_default=True,
              skip_msg='Partitioned table are not supported by '
                       'PPAS/PG 10.0 and below.'
              )
         ),
        ('Create List partitioned table with 2 partitions',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='list',
              skip_msg='Partitioned table are not supported by '
                       'PPAS/PG 10.0 and below.'
              )
         ),
        ('Create Hash partitioned table with 2 partitions',
         dict(url='/browser/table/obj/',
              server_min_version=110000,
              partition_type='hash',
              skip_msg='Hash Partition are not supported by '
                       'PPAS/PG 11.0 and below.'
              )
         ),
        ('Create Table with Identity columns',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              skip_msg='Identity columns are not supported by '
                       'PPAS/PG 10.0 and below.',
              columns=[{
                  'name': 'iden_always',
                  'cltype': 'bigint',
                  'attacl': [],
                  'is_primary_key': False,
                  'attnotnull': True,
                  'attlen': None,
                  'attprecision': None,
                  'attoptions': [],
                  'seclabels': [],
                  'colconstype': 'i',
                  'attidentity': 'a',
                  'seqincrement': 1,
                  'seqstart': 1,
                  'seqmin': 1,
                  'seqmax': 10,
                  'seqcache': 1,
                  'seqcycle': True
              }, {
                  'name': 'iden_default',
                  'cltype': 'bigint',
                  'attacl': [],
                  'is_primary_key': False,
                  'attnotnull': True,
                  'attlen': None,
                  'attprecision': None,
                  'attoptions': [],
                  'seclabels': [],
                  'colconstype': 'i',
                  'attidentity': 'd',
                  'seqincrement': 2,
                  'seqstart': 2,
                  'seqmin': 2,
                  'seqmax': 2000,
                  'seqcache': 1,
                  'seqcycle': True
              }])
         ),
        ('Create Table with Generated columns',
         dict(url='/browser/table/obj/',
              server_min_version=120000,
              skip_msg='Generated columns are not supported by '
                       'PPAS/PG 12.0 and below.',
              columns=[{
                  'name': 'm1',
                  'cltype': 'bigint',
                  'attacl': [],
                  'is_primary_key': False,
                  'attoptions': [],
                  'seclabels': []
              }, {
                  'name': 'm2',
                  'cltype': 'bigint',
                  'attacl': [],
                  'is_primary_key': False,
                  'attoptions': [],
                  'seclabels': []
              }, {
                  'name': 'genrated',
                  'cltype': 'bigint',
                  'attacl': [],
                  'is_primary_key': False,
                  'attnotnull': True,
                  'attlen': None,
                  'attprecision': None,
                  'attoptions': [],
                  'seclabels': [],
                  'colconstype': 'g',
                  'genexpr': 'm1*m2'
              }])
         )

    ]

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

        if hasattr(self, 'server_min_version'):
            server_con = server_utils.connect_server(self, self.server_id)
            if not server_con["info"] == "Server connected.":
                raise Exception("Could not connect to server to add "
                                "partitioned table.")
            if server_con["data"]["version"] < self.server_min_version:
                self.skipTest(self.skip_msg)

    def runTest(self):
        """ This function will add table under schema node. """
        db_user = self.server["username"]
        self.table_name = "test_table_add_%s" % (str(uuid.uuid4())[1:8])
        # Get the common data
        data = tables_utils.get_table_common_data()
        data.update({
            "name": self.table_name,
            "relowner": db_user,
            "schema": self.schema_name,
            "relacl": [{
                "grantee": db_user,
                "grantor": db_user,
                "privileges": [{
                    "privilege_type": "a",
                    "privilege": True,
                    "with_grant": True
                }, {
                    "privilege_type": "r",
                    "privilege": True,
                    "with_grant": False
                }, {
                    "privilege_type": "w",
                    "privilege": True,
                    "with_grant": False
                }]
            }]
        })

        # If column is provided in the scenario then use those columns
        if hasattr(self, 'columns'):
            data['columns'] = self.columns

        if hasattr(self, 'partition_type'):
            data['partition_type'] = self.partition_type
            data['is_partitioned'] = True
            if self.partition_type == 'range':
                data['partitions'] = \
                    [{'values_from': "'2010-01-01'",
                      'values_to': "'2010-12-31'",
                      'is_attach': False,
                      'partition_name': 'emp_2010'
                      },
                     {'values_from': "'2011-01-01'",
                      'values_to': "'2011-12-31'",
                      'is_attach': False,
                      'partition_name': 'emp_2011'
                      }]
                if hasattr(self, 'is_default'):
                    data['partitions'] = \
                        [{'values_from': "'2010-01-01'",
                          'values_to': "'2010-12-31'",
                          'is_attach': False,
                          'partition_name': 'emp_2010_def'
                          },
                         {'values_from': "'2011-01-01'",
                          'values_to': "'2011-12-31'",
                          'is_attach': False,
                          'partition_name': 'emp_2011_def'
                          },
                         {'values_from': "",
                          'values_to': "",
                          'is_attach': False,
                          'is_default': True,
                          'partition_name': 'emp_2012_def'
                          }]
                data['partition_keys'] = \
                    [{'key_type': 'column', 'pt_column': 'DOJ'}]
            elif self.partition_type == 'list':
                data['partitions'] = \
                    [{'values_in': "'2012-01-01', '2012-12-31'",
                      'is_attach': False,
                      'partition_name': 'emp_2012'
                      },
                     {'values_in': "'2013-01-01', '2013-12-31'",
                      'is_attach': False,
                      'partition_name': 'emp_2013'
                      }]
                data['partition_keys'] = \
                    [{'key_type': 'column', 'pt_column': 'DOJ'}]
            else:
                data['partitions'] = \
                    [{'values_modulus': "24",
                      'values_remainder': "3",
                      'is_attach': False,
                      'partition_name': 'emp_2016'
                      },
                     {'values_modulus': "8",
                      'values_remainder': "2",
                      'is_attach': False,
                      'partition_name': 'emp_2017'
                      }]
                data['partition_keys'] = \
                    [{'key_type': 'column', 'pt_column': 'empno'}]

        # Add table
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id) + '/',
            data=json.dumps(data),
            content_type='html/json')
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
