# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################
from __future__ import print_function
import traceback
import sys

from regression import test_utils as utils


def create_domain(server, db_name, schema_name, schema_id, domain_name):
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
        query = 'CREATE DOMAIN '+schema_name+'.'+domain_name+' AS' \
                ' character(10) COLLATE pg_catalog."POSIX" DEFAULT 1'
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
