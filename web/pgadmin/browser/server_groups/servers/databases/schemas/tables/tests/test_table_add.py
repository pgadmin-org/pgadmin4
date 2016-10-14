# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import json
import uuid

from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.tablespaces.tests import utils as \
    tablespace_utils
from . import utils as table_utils


class TableAddTestCase(BaseTestGenerator):
    """ This class will add new collation under schema node. """
    scenarios = [
        # Fetching default URL for table node.
        ('Fetch table Node URL', dict(url='/browser/table/obj/'))
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

    def runTest(self):
        """ This function will add table under schema node. """
        db_user = self.server["username"]
        self.table_name = "test_table_add_%s" % (str(uuid.uuid4())[1:6])
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
                {"name": "DOJ",
                 "cltype": "date[]",
                 "attacl": [],
                 "is_primary_key": False,
                 "attoptions": [],
                 "seclabels": []
                 }
            ],
            "exclude_constraint": [],
            "fillfactor": "11",
            "hastoasttable": True,
            "like_constraints": True,
            "like_default_value": True,
            "like_relation": "pg_catalog.pg_tables",
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
