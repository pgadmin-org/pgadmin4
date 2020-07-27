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
from urllib.parse import urlencode

from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as columns_utils


class ColumnMsqlTestCase(BaseTestGenerator):
    """This class will test msql route of column with various combinations."""
    scenarios = [
        ('msql column change timestamp array length',
         dict(
             url='/browser/column/msql/',
             data_type='timestamp(3) with time zone[]',
             new_len=6,
             expected_res='ALTER TABLE {schema}.{table}\n    ALTER COLUMN '
                          '{column} TYPE timestamp({len}) with time zone [];'
         )),
        ('msql column change timestamp length',
         dict(
             url='/browser/column/msql/',
             data_type='timestamp(4) with time zone',
             new_len=7,
             expected_res='ALTER TABLE {schema}.{table}\n    ALTER COLUMN '
                          '{column} TYPE timestamp({len}) with time zone ;'
         )),
        ('msql column change numeric array precision',
         dict(
             url='/browser/column/msql/',
             data_type='numeric(5,2)[]',
             old_len=5,
             new_precision=4,
             expected_res='ALTER TABLE {schema}.{table}\n    ALTER COLUMN '
                          '{column} TYPE numeric({len}, {precision})[];'
         )),
        ('msql column change numeric precision',
         dict(
             url='/browser/column/msql/',
             data_type='numeric(6,3)',
             old_len=6,
             new_precision=5,
             expected_res='ALTER TABLE {schema}.{table}\n    ALTER COLUMN '
                          '{column} TYPE numeric({len}, {precision});'
         )),
        ('msql column change numeric array length',
         dict(
             url='/browser/column/msql/',
             data_type='numeric(6,3)[]',
             new_len=8,
             old_precision=3,
             expected_res='ALTER TABLE {schema}.{table}\n    ALTER COLUMN '
                          '{column} TYPE numeric({len}, {precision})[];'
         )),
        ('msql column change numeric length',
         dict(
             url='/browser/column/msql/',
             data_type='numeric(6,4)',
             new_len=8,
             old_precision=4,
             expected_res='ALTER TABLE {schema}.{table}\n    ALTER COLUMN '
                          '{column} TYPE numeric({len}, {precision});'
         )),
        ('msql column change numeric array len and precision',
         dict(
             url='/browser/column/msql/',
             data_type='numeric(10,5)[]',
             new_len=15,
             new_precision=8,
             expected_res='ALTER TABLE {schema}.{table}\n    ALTER COLUMN '
                          '{column} TYPE numeric({len}, {precision})[];'
         )),
        ('msql column change numeric len and precision',
         dict(
             url='/browser/column/msql/',
             data_type='numeric(12,6)',
             new_len=14,
             new_precision=9,
             expected_res='ALTER TABLE {schema}.{table}\n    ALTER COLUMN '
                          '{column} TYPE numeric({len}, {precision});'
         ))
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
        self.table_name = "table_column_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.column_name = "test_column_msql_%s" % (str(uuid.uuid4())[1:8])
        self.column_id = columns_utils.create_column(self.server,
                                                     self.db_name,
                                                     self.schema_name,
                                                     self.table_name,
                                                     self.column_name,
                                                     self.data_type)

    def runTest(self):
        col_response = columns_utils.verify_column(self.server, self.db_name,
                                                   self.column_name)
        if not col_response:
            raise Exception("Could not find the column to update.")

        data = {"attnum": self.column_id}

        expected_len = None
        expected_precision = None

        if hasattr(self, 'new_len'):
            data["attlen"] = self.new_len
            expected_len = self.new_len
        if hasattr(self, 'new_precision'):
            data["attprecision"] = self.new_precision
            expected_precision = self.new_precision

        response = self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.table_id) + '/' +
            str(self.column_id) + '?' +
            urlencode(data),
            follow_redirects=True)
        self.assertEquals(response.status_code, 200)

        response_data = json.loads(response.data.decode('utf-8'))

        if not expected_len and hasattr(self, 'old_len'):
            expected_len = self.old_len

        if not expected_precision and hasattr(self, 'old_precision'):
            expected_precision = self.old_precision

        self.assertEquals(
            response_data['data'],
            self.expected_res.format(
                **dict(
                    [('schema', self.schema_name),
                     ('table', self.table_name),
                     ('column', self.column_name),
                     ('len', expected_len),
                     ('precision', expected_precision)
                     ]
                )
            )
        )

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
