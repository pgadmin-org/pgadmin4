# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import uuid
import json

from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from . import utils as views_utils


class ViewsUpdateTestCase(BaseTestGenerator):
    """This class will update the view/mview under schema node."""
    view_sql = "CREATE OR REPLACE VIEW %s.%s AS SELECT 'Hello World'; " \
               "ALTER TABLE %s.%s OWNER TO %s"
    m_view_sql = "CREATE MATERIALIZED VIEW %s.%s TABLESPACE pg_default AS " \
                 "SELECT 'test_pgadmin' WITH NO DATA;ALTER TABLE %s.%s OWNER" \
                 " TO %s"
    scenarios = [
        ('Update view under schema node', dict(url='/browser/view/obj/',
                                               view_name=
                                               "test_view_put_%s" %
                                               (str(uuid.uuid4())[1:6]),
                                               sql_query=view_sql)),
        ('Update materialized view under schema node',
         dict(url='/browser/mview/obj/',
              view_name="test_mview_put_%s" % (str(uuid.uuid4())[1:6]),
              sql_query=m_view_sql))
    ]

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to update a view.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to update a view.")
        self.view_id = views_utils.create_view(self.server,
                                               self.db_name,
                                               self.schema_name,
                                               self.sql_query,
                                               self.view_name)

    def runTest(self):
        """This function will update the view/mview under schema node."""
        view_response = views_utils.verify_view(self.server, self.db_name,
                                                self.view_name)
        if not view_response:
            raise Exception("Could not find the view to update.")
        data = {"id": self.view_id,
                "comment": "This is test comment"
                }
        response = self.tester.put(
            "{0}{1}/{2}/{3}/{4}/{5}".format(self.url, utils.SERVER_GROUP,
                                            self.server_id, self.db_id,
                                            self.schema_id, self.view_id
                                            ),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
