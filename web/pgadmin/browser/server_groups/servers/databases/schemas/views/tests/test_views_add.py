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


class ViewsAddTestCase(BaseTestGenerator):
    """This class will add new view under schema node."""
    view_name = "test_view_add_%s" % (str(uuid.uuid4())[1:8])
    v_data = {"schema": "",
              "owner": "",
              "datacl": [],
              "seclabels": [],
              "name": view_name,
              "definition": "SELECT 'Hello World';"
              }
    m_view_name = "test_mview_add_%s" % (str(uuid.uuid4())[1:8])
    m_view_data = {"spcname": "pg_default",
                   "toast_autovacuum_enabled": False,
                   "autovacuum_enabled": False,
                   "schema": "",
                   "owner": "",
                   "vacuum_table": [
                       {"name": "autovacuum_analyze_scale_factor"},
                       {"name": "autovacuum_analyze_threshold"},
                       {"name": "autovacuum_freeze_max_age"},
                       {"name": "autovacuum_vacuum_cost_delay"},
                       {"name": "autovacuum_vacuum_cost_limit"},
                       {"name": "autovacuum_vacuum_scale_factor"},
                       {"name": "autovacuum_vacuum_threshold"},
                       {"name": "autovacuum_freeze_min_age"},
                       {"name": "autovacuum_freeze_table_age"}],
                   "vacuum_toast": [{"name": "autovacuum_freeze_max_age"},
                                    {"name": "autovacuum_vacuum_cost_delay"},
                                    {"name": "autovacuum_vacuum_cost_limit"},
                                    {"name": "autovacuum_vacuum_scale_factor"},
                                    {"name": "autovacuum_vacuum_threshold"},
                                    {"name": "autovacuum_freeze_min_age"},
                                    {"name": "autovacuum_freeze_table_age"}],
                   "datacl": [],
                   "seclabels": [],
                   "name": m_view_name,
                   "definition": "SELECT 'test_pgadmin';"}
    scenarios = [
        ('Add view under schema node', dict(url='/browser/view/obj/',
                                            data=v_data)),
        ('Add materialized view under schema node',
         dict(url='/browser/mview/obj/', data=m_view_data))
    ]

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        server_response = server_utils.connect_server(self, self.server_id)

        if server_response["data"]["version"] < 90300 and "mview" in self.url:
            message = "Materialized Views are not supported by PG9.2 " \
                      "and PPAS9.2 and below."
            self.skipTest(message)

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add view.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add the view.")

    def runTest(self):
        """This function will add view under schema node."""
        db_user = self.server["username"]
        self.data["schema"] = self.schema_name
        self.data["owner"] = db_user
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' + str(self.server_id) +
            '/' + str(self.db_id) + '/' + str(self.schema_id) + '/',
            data=json.dumps(self.data), content_type='html/json')
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
