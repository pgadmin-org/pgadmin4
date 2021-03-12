##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import traceback
import os
import json
from regression.python_test_utils import test_utils as utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/domain_constraints_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_domain_constraints(server, db_name, schema_name,
                              domain_name, domain_constraint_name,
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
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()

        if domain_sql is None:
            query = 'ALTER DOMAIN ' + schema_name + '.' + domain_name + \
                    ' ADD CONSTRAINT ' + domain_constraint_name + \
                    ' CHECK (VALUE > 0)'

        else:
            query = 'ALTER DOMAIN ' + schema_name + '.' +\
                    domain_name + ' ' + domain_sql

        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created domain
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_constraint WHERE"
                          " conname='%s'" %
                          domain_constraint_name)
        oid = pg_cursor.fetchone()
        domain_con_id = ''
        if oid:
            domain_con_id = oid[0]
        connection.close()
        return domain_con_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_domain_constraint(server, db_name, domain_constraint_name):
    """
    This function verifies the domain constraint is present in the database
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param domain_constraint_name: domain_constraint_name to be verified
    :type domain_constraint_name: str
    :return domain_con_id: domain constraint's details
    :rtype event_trigger: tuple
    """
    try:
        connection = utils.get_db_connection(db_name, server['username'],
                                             server['db_password'],
                                             server['host'], server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_constraint WHERE"
                          " conname='%s'" %
                          domain_constraint_name)
        domain_con_id = pg_cursor.fetchone()
        connection.close()
        return domain_con_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_domain(server, db_name, schema_name,
                  schema_id, domain_name, domain_sql=None):
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
                    ' AS numeric(500,4) DEFAULT 1000'
        else:
            query = 'CREATE DOMAIN ' + schema_name + '.' +\
                    domain_name + ' ' + domain_sql

        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created domain
        pg_cursor.execute("SELECT d.oid, d.typname FROM pg_catalog.pg_type d "
                          "WHERE d.typname='%s' AND d.typnamespace='%s'" %
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
    pg_cursor.execute("SELECT d.oid, d.typname FROM pg_catalog.pg_type d WHERE"
                      " d.typname='%s' AND d.typnamespace='%s'" %
                      (domain_name, schema_id))
    domains = pg_cursor.fetchone()
    connection.close()
    return domains


def create_domain_constraints_invalid(server, db_name, schema_name,
                                      domain_name, domain_constraint_name,
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
                                             server['port'],
                                             server['sslmode'])
        pg_cursor = connection.cursor()

        if domain_sql is None:
            query = 'ALTER DOMAIN ' + schema_name + '.' + domain_name + \
                    ' ADD CONSTRAINT ' + domain_constraint_name + \
                    ' CHECK (VALUE > 0) NOT VALID'

        else:
            query = 'ALTER DOMAIN ' + schema_name + '.' + \
                    domain_name + ' ' + domain_sql

        pg_cursor.execute(query)
        connection.commit()
        # Get 'oid' from newly created domain
        pg_cursor.execute("SELECT oid FROM pg_catalog.pg_constraint WHERE"
                          " conname='%s'" %
                          domain_constraint_name)
        oid = pg_cursor.fetchone()
        domain_con_id = ''
        if oid:
            domain_con_id = oid[0]
        connection.close()
        return domain_con_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
