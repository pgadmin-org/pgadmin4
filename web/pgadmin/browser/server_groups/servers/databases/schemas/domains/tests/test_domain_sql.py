##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json
import re

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as domain_utils


class DomainReverseEngineeredSQLTestCase(BaseTestGenerator):
    """ This class will verify reverse engineered sql for domain
     under schema node. """
    scenarios = [
        # Fetching default URL for domain node.
        ('Domain Reverse Engineered SQL with char',
         dict(url='/browser/domain/sql/',
              domain_name='domain_get_%s' % (str(uuid.uuid4())[1:8]),
              domain_sql='AS "char";'
              )
         ),
        ('Domain Reverse Engineered SQL with Length, Precision and Default',
         dict(url='/browser/domain/sql/',
              domain_name='domain_get_%s' % (str(uuid.uuid4())[1:8]),
              domain_sql='AS numeric(12,2) DEFAULT 12 NOT NULL;'
              )
         ),
        ('Domain Reverse Engineered SQL with Length',
         dict(url='/browser/domain/sql/',
              domain_name='domain_get_%s' % (str(uuid.uuid4())[1:8]),
              domain_sql='AS interval(6);'
              )
         ),
    ]

    def setUp(self):
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        self.schema_info = parent_node_dict["schema"][-1]
        self.schema_name = self.schema_info["schema_name"]
        self.schema_id = self.schema_info["schema_id"]
        self.domain_info = domain_utils.create_domain(self.server,
                                                      self.db_name,
                                                      self.schema_name,
                                                      self.schema_id,
                                                      self.domain_name,
                                                      self.domain_sql)

    def runTest(self):
        """ This function will add domain and verify the
         reverse engineered sql. """
        db_id = self.database_info["db_id"]
        server_id = self.database_info["server_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 server_id, db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to get the domain.")

        db_name = self.database_info["db_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to get the domain.")
        domain_id = self.domain_info[0]

        # Call GET API to fetch the domain sql
        get_response = self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(server_id) + '/' +
            str(db_id) + '/' +
            str(self.schema_id) + '/' +
            str(domain_id),
            content_type='html/json')

        self.assertEquals(get_response.status_code, 200)
        orig_sql = json.loads(get_response.data.decode('utf-8'))

        # Replace multiple spaces with one space and check the expected sql
        sql = re.sub('\s+', ' ', orig_sql).strip()
        expected_sql = '-- DOMAIN: {0}.{1} -- DROP DOMAIN {0}.{1}; ' \
                       'CREATE DOMAIN {0}.{1} {2} ' \
                       'ALTER DOMAIN {0}.{1} OWNER' \
                       ' TO {3};'.format(self.schema_name,
                                         self.domain_name,
                                         self.domain_sql,
                                         self.server["username"])

        self.assertEquals(sql, expected_sql)

        domain_utils.delete_domain(self.server, db_name,
                                   self.schema_name, self.domain_name)

        # Verify the reverse engineered sql with creating domain with
        # the sql we get from the server
        domain_utils.create_domain_from_sql(self.server, db_name, orig_sql)

        domain_utils.delete_domain(self.server, db_name,
                                   self.schema_name, self.domain_name)

        # Disconnect the database
        database_utils.disconnect_database(self, server_id, db_id)

    def tearDown(self):
        pass
