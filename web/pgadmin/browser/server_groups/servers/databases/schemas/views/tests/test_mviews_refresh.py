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
from . import utils as views_utils

MVIEW_CHECK_UTILITY_URL = 'browser/mview/check_utility_exists/'
MVIEW_REFRESH_URL = 'browser/mview/refresh_data/'
IS_UTILITY_EXISTS = True


class MViewsUpdateParameterTestCase(BaseTestGenerator):
    """This class will check materialized view refresh functionality."""
    scenarios = [
        ('Check utility route',
         dict(type='check_utility')
         ),
        ('Refresh materialized view with invalid oid',
         dict(type='invalid')
         ),
        ('Refresh materialized view with data',
         dict(type='with_data')
         ),
        ('Refresh materialized view with no data',
         dict(type='with_no_data')
         ),
        ('Refresh materialized view with data (concurrently)',
         dict(type='with_data_concurrently')
         ),
        ('Refresh materialized view with no data (concurrently)',
         dict(type='with_no_data_concurrently')
         ),
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
            raise Exception("Could not connect to database to update a mview.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to update a mview.")

        self.m_view_name = "test_mview_put_%s" % (str(uuid.uuid4())[1:8])
        m_view_sql = "CREATE MATERIALIZED VIEW %s.%s TABLESPACE pg_default " \
                     "AS SELECT 'test_pgadmin' WITH NO DATA;ALTER TABLE " \
                     "%s.%s OWNER TO %s"

        self.m_view_id = views_utils.create_view(self.server,
                                                 self.db_name,
                                                 self.schema_name,
                                                 m_view_sql,
                                                 self.m_view_name)

    def runTest(self):
        """This class will check materialized view refresh functionality"""

        mview_response = views_utils.verify_view(self.server, self.db_name,
                                                 self.m_view_name)
        if not mview_response:
            raise Exception("Could not find the mview to update.")

        data = None
        is_put_request = True

        if self.type == 'check_utility':
            is_put_request = False
        elif self.type == 'invalid':
            data = dict({'concurrent': 'false', 'with_data': 'false'})
        elif self.type == 'with_data':
            data = dict({'concurrent': 'false', 'with_data': 'true'})
        elif self.type == 'with_no_data':
            data = dict({'concurrent': 'false', 'with_data': 'false'})
        elif self.type == 'with_data_concurrently':
            data = dict({'concurrent': 'true', 'with_data': 'true'})
        elif self.type == 'with_no_data_concurrently':
            data = dict({'concurrent': 'true', 'with_data': 'false'})

        response = self.tester.get(
            MVIEW_CHECK_UTILITY_URL + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.m_view_id),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)
        if is_put_request and response.json['success'] == 0:
            self.skipTest(
                "Couldn't check materialized view refresh"
                " functionality because utility/binary does not exists."
            )

        if is_put_request:
            mvid = self.m_view_id
            if self.type == 'invalid':
                mvid = 99999
            response = self.tester.put(
                MVIEW_REFRESH_URL + str(utils.SERVER_GROUP) + '/' +
                str(self.server_id) + '/' +
                str(self.db_id) + '/' +
                str(self.schema_id) + '/' +
                str(mvid),
                data=json.dumps(data),
                follow_redirects=True
            )
            if self.type == 'invalid':
                self.assertEquals(response.status_code, 410)
            else:
                self.assertEquals(response.status_code, 200)
                # On success we get job_id from server
                self.assertTrue('job_id' in response.json['data'])

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
