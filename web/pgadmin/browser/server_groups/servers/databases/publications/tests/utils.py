##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import os
import json
import traceback
import uuid

from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/publication_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_table_for_publication(self):
    self.table_name = "table_column_%s" % (str(uuid.uuid4())[1:8])
    self.table_id = tables_utils.create_table(self.server,
                                              self.db_name,
                                              self.schema_name,
                                              self.table_name)


def get_tables(self):
    tables = self.tester.get(
        '/browser/publication/get_tables/' + str(
            utils.SERVER_GROUP) + '/' + str(
            self.server_id) + '/' +
        str(self.db_id) + '/',
        content_type='html/json')
    if self.server_version >= 150000:
        columns = get_all_columns(self)
        if hasattr(self, 'with_columns'):
            return [{"table_name": tables.json['data'][0]['value'],
                     "columns": [columns[0]['value'],
                                 columns[1]['value']]
                     }]
        elif hasattr(self, 'with_where'):
            return [{"table_name": tables.json['data'][0]['value'],
                     "where": 'id=5'
                     }]
        elif hasattr(self, 'with_columns') and hasattr(self, 'with_where'):
            return [{"table_name": tables.json['data'][0]['value'],
                     "columns": [columns[0]['value'],
                                 columns[1]['value']],
                     "where": 'id=5'
                     }]
        else:
            return [{"table_name": i['value']} for i in tables.json['data']]
    else:

        return [i['value'] for i in tables.json['data']]


def get_all_columns(self):
    columns = self.tester.get(
        '/browser/publication/get_all_columns/' + str(
            utils.SERVER_GROUP) + '/' + str(
            self.server_id) + '/' +
        str(self.db_id) + '/' + '?tid=' + str(self.table_id),
        content_type='html/json')
    return columns.json['data']


def get_schemas(self):
    schemas = self.tester.get(
        '/browser/publication/get_schemas/' + str(
            utils.SERVER_GROUP) + '/' + str(
            self.server_id) + '/' +
        str(self.db_id) + '/',
        content_type='html/json')
    return [i['value'] for i in schemas.json['data']]


def create_publication_api(self):
    return self.tester.post(
        self.url + str(utils.SERVER_GROUP) + '/' +
        str(self.server_id) + '/' + str(
            self.db_id) + '/',
        data=json.dumps(self.test_data),
        content_type='html/json')


def create_publication(self, publication_name=None):
    """
    This function creates a publication under provided table.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param publication_name: publication name
    :type publication_name: str
    :return publication_id: publication id
    :rtype: int
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        if not hasattr(self, "test_data"):
            if publication_name:
                query = "CREATE publication %s FOR ALL TABLES" % \
                        (publication_name)
            else:
                query = "CREATE publication %s FOR ALL TABLES" % \
                        (self.publication_name)
            pg_cursor.execute(query)
        else:
            self.tester.post(
                self.url + str(utils.SERVER_GROUP) + '/' +
                str(self.server_id) + '/' + str(
                    self.db_id) + '/',
                data=json.dumps(self.test_data),
                content_type='html/json')

        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        # Get role oid of newly added publication
        if not hasattr(self, "test_data"):
            if publication_name:
                pg_cursor.execute(
                    "select oid from pg_catalog.pg_publication pub "
                    "where pub.pubname='%s'" % publication_name)
            else:
                pg_cursor.execute(
                    "select oid from pg_catalog.pg_publication pub "
                    "where pub.pubname='%s'" % self.publication_name)
        else:
            pg_cursor.execute("select oid from pg_catalog.pg_publication pub "
                              "where pub.pubname='%s'"
                              % self.test_data['name'])
        publication = pg_cursor.fetchone()
        publication_id = ''
        if publication:
            publication_id = publication[0]
        connection.close()
        return publication_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_publication(server, db_name, publication_name):
    """
    This function verifies publication exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param publication_name: publication name
    :type publication_name: str
    :return publication: publication record from database
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
        pg_cursor.execute("select * from pg_catalog.pg_publication pub "
                          "where pub.pubname='%s'" %
                          publication_name)
        publication = pg_cursor.fetchone()
        connection.close()
        return publication
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def delete_publication(server, db_name, publication_name):
    """
    This function use to delete the existing roles in the servers

    :param db_name:  db_name
    :type db_name: db_name object
    :param server: server
    :type server: server object
    :param publication_name: publication name
    :type publication_name: str
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

        pg_cursor.execute("select * from pg_catalog.pg_publication pub where "
                          "pub.pubname='%s'" %
                          publication_name)
        publication_count = pg_cursor.fetchone()
        if publication_count:
            old_isolation_level = connection.isolation_level
            utils.set_isolation_level(connection, 0)
            pg_cursor = connection.cursor()
            query = "DROP publication %s" % publication_name
            pg_cursor.execute(query)
            utils.set_isolation_level(connection, old_isolation_level)
            connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
