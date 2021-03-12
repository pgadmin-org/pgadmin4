##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys
import os
import json
import traceback

from regression.python_test_utils import test_utils as utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/subscription_test_data.json") as data_file:
    test_cases = json.load(data_file)


def get_tables(self):
    tables = self.tester.get(
        '/browser/subscription/get_tables/' + str(
            utils.SERVER_GROUP) + '/' + str(
            self.server_id) + '/' +
        str(self.db_id) + '/',
        content_type='html/json')
    return json.dumps([tables.json['data'][1]['value']])


def create_subscription_api(self):
    return self.tester.post(
        self.url + str(utils.SERVER_GROUP) + '/' +
        str(self.server_id) + '/' + str(
            self.db_id) + '/',
        data=json.dumps(self.test_data),
        content_type='html/json')


def create_subscription(server, db_name, subscription_name):
    """
    This function creates a subscription.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param subscription_name: subscription name
    :type subscription_name: str
    :return subscription_id: subscription id
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
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        query = """CREATE SUBSCRIPTION "%s" """ \
                """CONNECTION 'host=192.168.1.50 port=5432 user=foo """ \
                """dbname=foodb' """ \
                """PUBLICATION insert_only WITH (create_slot = false, """ \
                """enabled = false, slot_name=NONE, connect=false);""" % (
                    subscription_name)
        pg_cursor.execute(query)
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get role oid of newly added subscription
        pg_cursor.execute("select oid from pg_catalog.pg_subscription sub "
                          "where sub.subname='%s'" % subscription_name)
        subscription = pg_cursor.fetchone()
        subscription_id = ''
        if subscription:
            subscription_id = subscription[0]
        connection.close()
        return subscription_id
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def verify_subscription(server, db_name, subscription_name):
    """
    This function verifies subscription exist in database or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param subscription_name: subscription name
    :type subscription_name: str
    :return subscription: subscription record from database
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
        pg_cursor.execute("select * from pg_catalog.pg_subscription sub "
                          "where sub.subname='%s'" %
                          subscription_name)
        subscription = pg_cursor.fetchone()
        connection.close()
        return subscription
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise


def delete_subscription(server, db_name, subscription_name):
    """
    This function use to delete the existing subscription

    :param db_name:  db_name
    :type db_name: db_name object
    :param server: server
    :type server: server object
    :param subscription_name: subscription name
    :type subscription_name: str
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

        pg_cursor.execute("select * from pg_catalog.pg_subscription sub where "
                          "sub.subname='%s'" %
                          subscription_name)
        subscription_count = pg_cursor.fetchone()
        if subscription_count:
            old_isolation_level = connection.isolation_level
            connection.set_isolation_level(0)
            pg_cursor = connection.cursor()
            query = "DROP subscription %s" % \
                    (subscription_name)
            pg_cursor.execute(query)
            connection.set_isolation_level(old_isolation_level)
            connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
