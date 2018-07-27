##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
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


class TableAddTestCase(BaseTestGenerator):
    """ This class will add new collation under schema node. """
    scenarios = [
        # Fetching default URL for table node.
        ('Create Table', dict(url='/browser/table/obj/')),
        ('Create Range partitioned table with 2 partitions',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='range'
              )
         ),
        ('Create List partitioned table with 2 partitions',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='list'
              )
         ),
        ('Create Hash partitioned table with 2 partitions',
         dict(url='/browser/table/obj/',
              server_min_version=110000,
              partition_type='hash'
              )
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

        self.is_partition = False
        if hasattr(self, 'server_min_version'):
            server_con = server_utils.connect_server(self, self.server_id)
            if not server_con["info"] == "Server connected.":
                raise Exception("Could not connect to server to add "
                                "partitioned table.")
            if server_con["data"]["version"] < self.server_min_version:
                message = "Partitioned table are not supported by " \
                          "PPAS/PG 10.0 and below."
                self.skipTest(message)
            else:
                self.is_partition = True

    def runTest(self):
        """ This function will add table under schema node. """
        db_user = self.server["username"]
        self.table_name = "test_table_add_%s" % (str(uuid.uuid4())[1:8])
        data = {
            "check_constraint": [],
            "coll_inherits": "[]",
            "columns": [
                {
                    "name": "empno",
                    "cltype": "numeric",
                    "attacl": [],
                    "is_primary_key": False,
                    "attoptions": [],
                    "seclabels": []
                },
                {
                    "name": "empname",
                    "cltype": "character[]",
                    "attacl": [],
                    "is_primary_key": False,
                    "attoptions": [],
                    "seclabels": []
                },
                {
                    "name": "DOJ",
                    "cltype": "date",
                    "attacl": [],
                    "is_primary_key": False,
                    "attoptions": [],
                    "seclabels": []
                }
            ],
            "exclude_constraint": [],
            "fillfactor": "",
            "hastoasttable": True,
            "like_constraints": True,
            "like_default_value": True,
            "like_relation": "pg_catalog.pg_namespace",
            "name": self.table_name,
            "primary_key": [],
            "relacl": [
                {
                    "grantee": db_user,
                    "grantor": db_user,
                    "privileges":
                        [
                            {
                                "privilege_type": "a",
                                "privilege": True,
                                "with_grant": True
                            },
                            {
                                "privilege_type": "r",
                                "privilege": True,
                                "with_grant": False
                            },
                            {
                                "privilege_type": "w",
                                "privilege": True,
                                "with_grant": False
                            }
                        ]
                }
            ],
            "relhasoids": True,
            "relowner": db_user,
            "schema": self.schema_name,
            "seclabels": [],
            "spcname": "pg_default",
            "unique_constraint": [],
            "vacuum_table": [
                {
                    "name": "autovacuum_analyze_scale_factor"
                },
                {
                    "name": "autovacuum_analyze_threshold"
                },
                {
                    "name": "autovacuum_freeze_max_age"
                },
                {
                    "name": "autovacuum_vacuum_cost_delay"
                },
                {
                    "name": "autovacuum_vacuum_cost_limit"
                },
                {
                    "name": "autovacuum_vacuum_scale_factor"
                },
                {
                    "name": "autovacuum_vacuum_threshold"
                },
                {
                    "name": "autovacuum_freeze_min_age"
                },
                {
                    "name": "autovacuum_freeze_table_age"
                }
            ],
            "vacuum_toast": [
                {
                    "name": "autovacuum_freeze_max_age"
                },
                {
                    "name": "autovacuum_vacuum_cost_delay"
                },
                {
                    "name": "autovacuum_vacuum_cost_limit"
                },
                {
                    "name": "autovacuum_vacuum_scale_factor"
                },
                {
                    "name": "autovacuum_vacuum_threshold"
                },
                {
                    "name": "autovacuum_freeze_min_age"
                },
                {
                    "name": "autovacuum_freeze_table_age"
                }
            ]
        }

        if self.is_partition:
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
