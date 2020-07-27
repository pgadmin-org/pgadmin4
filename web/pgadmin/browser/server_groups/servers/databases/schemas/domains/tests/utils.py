##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import traceback
import os
import json
from regression.python_test_utils import test_utils as utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/domain_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_domain(server, db_name, schema_name, schema_id, domain_name,
                  domain_sql=None):
    """
    This function is used to add the domain to existing schema
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param schema_id: schema id
    :type schema_id: int
    :param domain_name: domain name
    :type domain_name: str
    :return: None
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        pg_cursor = connection.cursor()

        if domain_sql is None:
            query = 'CREATE DOMAIN ' + schema_name + '.' + domain_name + \
                    ' AS character(10) DEFAULT 1'
        else:
            query = 'CREATE DOMAIN ' + schema_name + '.' +\
                    domain_name + ' ' + domain_sql

        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created domain
        pg_cursor.execute("SELECT d.oid, d.typname FROM pg_type d WHERE"
                          " d.typname='%s' AND d.typnamespace='%s'" %
                          (domain_name, schema_id))
        domains = pg_cursor.fetchone()
        connection.close()
        return domains
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_domain(server, db_name, schema_id, domain_name):
    """
    This function get the oid & name of the domain
    :param server: server details
    :type server: dict
    :param db_name: db name
    :type db_name: str
    :param schema_id: schema id
    :type schema_id: int
    :param domain_name: domain name
    :type domain_name: str
    :return:
    """
    connection = utils.get_db_connection(db_name,
                                         server['username'],
                                         server['db_password'],
                                         server['host'],
                                         server['port'])
    pg_cursor = connection.cursor()
    pg_cursor.execute("SELECT d.oid, d.typname FROM pg_type d WHERE"
                      " d.typname='%s' AND d.typnamespace='%s'" %
                      (domain_name, schema_id))
    domains = pg_cursor.fetchone()
    connection.close()
    return domains


def delete_domain(server, db_name, schema_name, domain_name):
    """
    This function deletes the domain.
    :param server:
    :param db_name:
    :param schema_name:
    :param domain_name:
    :return:
    """

    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("DROP DOMAIN %s.%s" %
                          (schema_name, domain_name))
        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_domain_from_sql(server, db_name, sql):
    """
    This function create domain from the reverse engineered sql
    :param server:
    :param db_name:
    :param sql:
    :return:
    """

    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        pg_cursor = connection.cursor()
        pg_cursor.execute(sql)
        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)
