##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import os
import json
import traceback

from regression.python_test_utils import test_utils as utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/rules_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_rule(server, db_name, schema_name, table_name, rule_name):
    """
    This function creates a rule under provided table.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param table_name: table name
    :type table_name: str
    :param rule_name: rule name
    :type rule_name: str
    :return rule_id: role id
    :rtype: int
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
        query = "CREATE OR REPLACE RULE %s AS ON UPDATE TO %s.%s DO NOTHING" %\
                (rule_name, schema_name, table_name)
        pg_cursor.execute(query)
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        # Get role oid of newly added rule
        pg_cursor.execute("select oid from pg_catalog.pg_rewrite where "
                          "rulename='%s'" % rule_name)
        rule = pg_cursor.fetchone()
        rule_id = ''
        if rule:
            rule_id = rule[0]
        connection.close()
        return rule_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_rule(server, db_name, rule_name):
    """
    This function verifies rule exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param rule_name: rule name
    :type rule_name: str
    :return rule: rule record from database
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
        pg_cursor.execute("select * from pg_catalog.pg_rewrite where "
                          "rulename='%s'" % rule_name)
        rule = pg_cursor.fetchone()
        connection.close()
        return rule
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
