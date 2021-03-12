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

from regression.python_test_utils.test_utils import get_db_connection
from regression.python_test_utils import test_utils as utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/event_triggers_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_event_trigger(server, db_name, schema_name, func_name,
                         trigger_name):
    """
    This function creates the event trigger into test database.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param schema_name: schema name
    :type schema_name: str
    :param func_name: function name
    :type func_name: str
    :param trigger_name: trigger name
    :type trigger_name: str
    :return trigger_id: trigger id
    :rtype: int
    """
    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'],
                                       server['sslmode'])
        old_isolation_level = connection.isolation_level
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute('''CREATE EVENT TRIGGER "%s" ON DDL_COMMAND_END
         EXECUTE PROCEDURE "%s"."%s"()''' % (trigger_name, schema_name,
                                             func_name))
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        # Get 'oid' from newly created event trigger
        pg_cursor.execute(
            "SELECT oid FROM pg_catalog.pg_event_trigger WHERE evtname = '%s'"
            % trigger_name)
        oid = pg_cursor.fetchone()
        trigger_id = ''
        if oid:
            trigger_id = oid[0]
        connection.close()
        return trigger_id
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_event_trigger(server, db_name, trigger_name):
    """
    This function verifies the event trigger is present in the database
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param trigger_name: trigger name to be verified
    :type trigger_name: str
    :return event_trigger: event trigger's details
    :rtype event_trigger: tuple
    """
    try:
        connection = get_db_connection(db_name,
                                       server['username'],
                                       server['db_password'],
                                       server['host'],
                                       server['port'],
                                       server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT oid FROM pg_catalog.pg_event_trigger WHERE evtname = '%s'"
            % trigger_name)
        event_trigger = pg_cursor.fetchone()
        connection.close()
        return event_trigger
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_event_trigger_node(self):
    """
    This function verifies the event trigger is present in the database
    :param self: server details
    :return event_trigger: event trigger's expected details
    :rtype event_trigger: dict
    """
    try:
        connection = get_db_connection(self.db_name,
                                       self.server['username'],
                                       self.server['db_password'],
                                       self.server['host'],
                                       self.server['port'],
                                       self.server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SELECT evtenabled,"
                          "evtevent, "
                          "(select rolname from pg_authid where oid "
                          "= pl.evtowner) as evtowner,"
                          " evtname from pg_catalog.pg_event_trigger pl "
                          "WHERE evtname = '%s'" % self.test_data['name'])

        event_trigger = pg_cursor.fetchone()
        expected_output = utils.create_expected_output(
            self.parameters_to_compare, list(event_trigger))
        connection.close()
        return expected_output
    except Exception:
        traceback.print_exc(file=sys.stderr)
