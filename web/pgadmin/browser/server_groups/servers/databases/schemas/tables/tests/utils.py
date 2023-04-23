##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import traceback
import os
import json
from urllib.parse import urlencode

from regression.python_test_utils import test_utils as utils

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/table_test_data.json") as data_file:
    test_cases = json.load(data_file)


def api_create(self):
    return self.tester.post("{0}{1}/{2}/{3}/{4}/".
                            format(self.url, utils.SERVER_GROUP,
                                   self.server_id,
                                   self.db_id, self.schema_id),
                            data=json.dumps(self.data),
                            content_type='html/json'
                            )


def api_delete(self, table_id=None):
    if table_id is None:
        table_id = self.table_id
    return self.tester.delete("{0}{1}/{2}/{3}/{4}/{5}".
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id,
                                     self.schema_id, table_id),
                              data=json.dumps(self.data),
                              follow_redirects=True)


def api_get(self, table_id=None):
    if table_id is None:
        table_id = self.table_id
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, table_id),
                           follow_redirects=True
                           )


def api_get_msql(self, url_encode_data):
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}?{6}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.table_id,
                                  urlencode(url_encode_data)),
                           follow_redirects=True
                           )


def api_put(self):
    return self.tester.put("{0}{1}/{2}/{3}/{4}/{5}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.table_id),
                           data=json.dumps(self.data),
                           follow_redirects=True
                           )


def api_get_pre_table_creation_params(self, url_encode_data=None):
    if url_encode_data is None:
        return self.tester.get("{0}{1}/{2}/{3}/{4}/".
                               format(self.url, utils.SERVER_GROUP,
                                      self.server_id, self.db_id,
                                      self.schema_id),
                               follow_redirects=True
                               )
    else:
        return self.tester.get("{0}{1}/{2}/{3}/{4}/?{5}".
                               format(self.url, utils.SERVER_GROUP,
                                      self.server_id, self.db_id,
                                      self.schema_id,
                                      urlencode(url_encode_data)),
                               follow_redirects=True
                               )


def create_table(server, db_name, schema_name, table_name, custom_query=None):
    """
    This function creates a table under provided schema.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :return table_id: table id
    :rtype: int
    """
    if custom_query is None:
        query = "CREATE TABLE %s.%s(id serial UNIQUE NOT NULL, name text," \
                " location text)" % \
                (schema_name, table_name)
    else:
        query = eval(custom_query)
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(query)
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        # Get 'oid' from newly created table
        pg_cursor.execute("select oid from pg_catalog.pg_class "
                          "where relname='%s'" % table_name)
        table = pg_cursor.fetchone()
        table_id = ''
        if table:
            table_id = table[0]
        connection.close()
        return table_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_table(server, db_name, table_id):
    """
    This function verifies table exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param table_id: schema name
    :type table_id: int
    :return table: table record from database
    :rtype: tuple
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT * FROM pg_catalog.pg_class tb "
                          "WHERE tb.oid=%s" % table_id)
        table = pg_cursor.fetchone()
        connection.close()
        return table
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def create_table_for_partition(
    server, db_name, schema_name, table_name,
    table_type, partition_type, partition_name=None
):
    """
    This function creates partitioned/partition/regular table
    under provided schema.

    :param server: server details
    :param db_name: database name
    :param schema_name: schema name
    :param table_name: table name
    :param table_type: regular/partitioned/partition
    :param partition_type: partition table type (range/list)
    :param partition_name: Partition Name
    :return table_id: table id
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()

        query = ''
        if table_type == 'partitioned':
            if partition_type == 'range':
                query = "CREATE TABLE %s.%s(country text, sales bigint, " \
                        "saledate date) PARTITION BY RANGE(saledate)" % \
                        (schema_name, table_name)
            else:
                query = "CREATE TABLE %s.%s(country text, sales bigint, " \
                        "saledate date) PARTITION BY LIST(saledate)" % \
                        (schema_name, table_name)
        elif table_type == 'partition':
            if partition_type == 'range':
                query = "CREATE TABLE %s.%s PARTITION OF %s.%s " \
                        "FOR VALUES FROM ('2012-01-01') TO ('2012-12-31')" % \
                        (schema_name, partition_name, schema_name, table_name)
            else:
                query = "CREATE TABLE %s.%s PARTITION OF %s.%s " \
                        "FOR VALUES IN ('2013-01-01')" % \
                        (schema_name, partition_name, schema_name, table_name)

            # To fetch OID table name is actually partition name
            table_name = partition_name
        elif table_type == 'regular':
            query = "CREATE TABLE %s.%s(country text, sales bigint," \
                    "saledate date NOT NULL)" % (schema_name, table_name)

        pg_cursor.execute(query)
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        # Get 'oid' from newly created table
        pg_cursor.execute("select oid from pg_catalog.pg_class "
                          "where relname='%s'" % table_name)
        table = pg_cursor.fetchone()
        table_id = ''
        if table:
            table_id = table[0]
        connection.close()
        return table_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def set_partition_data(server, db_name, schema_name, table_name,
                       partition_type, data, mode):
    """
    This function is used to set the partitions data on the basis of
    partition type and action.

    :param server: server details
    :param db_name: Database Name
    :param schema_name: Schema Name
    :param table_name: Table Name
    :param partition_type: range or list
    :param data: Data
    :param mode: create/detach
    :return:
    """

    data['partitions'] = dict()
    if partition_type == 'range' and mode == 'create':
        data['partitions'].update(
            {'added': [{'values_from': "'2014-01-01'",
                        'values_to': "'2014-12-31'",
                        'is_attach': False,
                        'partition_name': 'sale_2014'},
                       {'values_from': "'2015-01-01'",
                        'values_to': "'2015-12-31'",
                        'is_attach': False,
                        'partition_name': 'sale_2015'
                        }]
             }
        )
    if partition_type == 'range' and mode == 'multilevel':
        data['partitions'].update(
            {'added': [{'values_from': "'2014-01-01'",
                        'values_to': "'2014-12-31'",
                        'is_attach': False,
                        'partition_name': 'sale_2014_sub_part',
                        'is_sub_partitioned': True,
                        'sub_partition_type': 'range',
                        'sub_partition_keys':
                            [{'key_type': 'column', 'pt_column': 'sales'}]
                        },
                       {'values_from': "'2015-01-01'",
                        'values_to': "'2015-12-31'",
                        'is_attach': False,
                        'partition_name': 'sale_2015_sub_part',
                        'is_sub_partitioned': True,
                        'sub_partition_type': 'list',
                        'sub_partition_keys':
                            [{'key_type': 'column', 'pt_column': 'sales'}]
                        }]
             }
        )
    elif partition_type == 'list' and mode == 'create':
        data['partitions'].update(
            {'added': [{'values_in': "'2016-01-01', '2016-12-31'",
                        'is_attach': False,
                        'partition_name': 'sale_2016'},
                       {'values_in': "'2017-01-01', '2017-12-31'",
                        'is_attach': False,
                        'partition_name': 'sale_2017'
                        }]
             }
        )
    elif partition_type == 'list' and mode == 'multilevel':
        data['partitions'].update(
            {'added': [{'values_in': "'2016-01-01', '2016-12-31'",
                        'is_attach': False,
                        'partition_name': 'sale_2016_sub_part',
                        'is_sub_partitioned': True,
                        'sub_partition_type': 'list',
                        'sub_partition_keys':
                            [{'key_type': 'column', 'pt_column': 'sales'}]
                        },
                       {'values_in': "'2017-01-01', '2017-12-31'",
                        'is_attach': False,
                        'partition_name': 'sale_2017_sub_part',
                        'is_sub_partitioned': True,
                        'sub_partition_type': 'list',
                        'sub_partition_keys':
                            [{'key_type': 'column', 'pt_column': 'sales'}]
                        }]
             }
        )
    elif partition_type == 'range' and mode == 'detach':
        partition_id = create_table_for_partition(server, db_name, schema_name,
                                                  table_name, 'partition',
                                                  partition_type, 'sale_2012')
        data['partitions'].update(
            {'deleted': [{'oid': partition_id}]
             }
        )
    elif partition_type == 'list' and mode == 'detach':
        partition_id = create_table_for_partition(server, db_name, schema_name,
                                                  table_name, 'partition',
                                                  partition_type, 'sale_2013')
        data['partitions'].update(
            {'deleted': [{'oid': partition_id}]
             }
        )
    elif partition_type == 'range' and mode == 'attach':
        partition_id = create_table_for_partition(
            server, db_name, schema_name, 'attach_sale_2010', 'regular',
            partition_type
        )
        data['partitions'].update(
            {'added': [{'values_from': "'2010-01-01'",
                        'values_to': "'2010-12-31'",
                        'is_attach': True,
                        'partition_name': partition_id
                        }]
             }
        )
    elif partition_type == 'list' and mode == 'attach':
        partition_id = create_table_for_partition(
            server, db_name, schema_name, 'attach_sale_2011', 'regular',
            partition_type
        )
        data['partitions'].update(
            {'added': [{'values_in': "'2011-01-01'",
                        'is_attach': True,
                        'partition_name': partition_id
                        }]
             }
        )


def get_table_common_data():
    """
    This function will return the common data used to create a table
    :return:
    """
    return {
        "check_constraint": [],
        "coll_inherits": "[]",
        "columns": [{
            "name": "empno",
            "cltype": "numeric",
            "attacl": [],
            "is_primary_key": False,
            "attoptions": [],
            "seclabels": []
        }, {
            "name": "empname",
            "cltype": "character[]",
            "attacl": [],
            "is_primary_key": False,
            "attoptions": [],
            "seclabels": []
        }, {
            "name": "DOJ",
            "cltype": "date",
            "attacl": [],
            "is_primary_key": False,
            "attoptions": [],
            "seclabels": []
        }, {
            "name": "part_col",
            "cltype": "text",
            "attacl": [],
            "is_primary_key": False,
            "attoptions": [],
            "seclabels": []
        }],
        "exclude_constraint": [],
        "fillfactor": "",
        "hastoasttable": True,
        "like_constraints": True,
        "like_default_value": True,
        "like_relation": "pg_catalog.pg_namespace",
        "primary_key": [],
        "relhasoids": True,
        "seclabels": [],
        "spcname": "pg_default",
        "unique_constraint": [],
        "vacuum_table": [{
            "name": "autovacuum_analyze_scale_factor"
        }, {
            "name": "autovacuum_analyze_threshold"
        }, {
            "name": "autovacuum_freeze_max_age"
        }, {
            "name": "autovacuum_vacuum_cost_delay"
        }, {
            "name": "autovacuum_vacuum_cost_limit"
        }, {
            "name": "autovacuum_vacuum_scale_factor"
        }, {
            "name": "autovacuum_vacuum_threshold"
        }, {
            "name": "autovacuum_freeze_min_age"
        }, {
            "name": "autovacuum_freeze_table_age"
        }],
        "vacuum_toast": [{
            "name": "autovacuum_freeze_max_age"
        }, {
            "name": "autovacuum_vacuum_cost_delay"
        }, {
            "name": "autovacuum_vacuum_cost_limit"
        }, {
            "name": "autovacuum_vacuum_scale_factor"
        }, {
            "name": "autovacuum_vacuum_threshold"
        }, {
            "name": "autovacuum_freeze_min_age"
        }, {
            "name": "autovacuum_freeze_table_age"
        }]
    }


def get_range_partitions_data(data, mode=None, multilevel_partition=False):
    """
    This function returns the partitions data for range partition.
    :param data:
    :param mode:
    :param multilevel_partition:
    :return:
    """
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
    if mode == 'Default':
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
    if multilevel_partition:
        data['partitions'] = \
            [{'values_from': "'2010-01-01'",
              'values_to': "'2010-12-31'",
              'is_attach': False,
              'partition_name': 'emp_2010_multi_level',
              'is_sub_partitioned': True,
              'sub_partition_type': 'range',
              'sub_partition_keys':
                  [{'key_type': 'column', 'pt_column': 'empno'}]
              },
             {'values_from': "'2011-01-01'",
              'values_to': "'2011-12-31'",
              'is_attach': False,
              'partition_name': 'emp_2011_multi_level',
              'is_sub_partitioned': True,
              'sub_partition_type': 'list',
              'sub_partition_keys':
                  [{'key_type': 'column', 'pt_column': 'empno'}]
              }]
    data['partition_keys'] = \
        [{'key_type': 'column', 'pt_column': 'DOJ'}]


def get_list_partitions_data(data, multilevel_partition=False):
    """
    This function returns the partitions data for list partition.
    :param data:
    :param multilevel_partition:
    :return:
    """
    data['partitions'] = \
        [{'values_in': "'2012-01-01', '2012-12-31'",
          'is_attach': False,
          'partition_name': 'emp_2012'
          },
         {'values_in': "'2013-01-01', '2013-12-31'",
          'is_attach': False,
          'partition_name': 'emp_2013'
          }]

    if multilevel_partition:
        data['partitions'] = \
            [{'values_in': "'2012-01-01', '2012-12-31'",
              'is_attach': False,
              'partition_name': 'emp_2012_multi_level',
              'is_sub_partitioned': True,
              'sub_partition_type': 'list',
              'sub_partition_keys':
                  [{'key_type': 'column', 'pt_column': 'empno'}]
              },
             {'values_in': "'2013-01-01', '2013-12-31'",
              'is_attach': False,
              'partition_name': 'emp_2013_multi_level',
              'is_sub_partitioned': True,
              'sub_partition_type': 'range',
              'sub_partition_keys':
                  [{'key_type': 'column', 'pt_column': 'empno'}]
              }]
    data['partition_keys'] = \
        [{'key_type': 'column', 'pt_column': 'DOJ'}]


def get_hash_partitions_data(data):
    """
    This function returns the partitions data for hash partition.
    :param data:
    :return:
    """
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


def get_table_id(server, db_name, table_name):
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("select oid from pg_catalog.pg_class "
                          "where relname='%s'" % table_name)
        table = pg_cursor.fetchone()
        if table:
            table_id = table[0]
        else:
            table_id = None
        connection.close()
        return table_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
