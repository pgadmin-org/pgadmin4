# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
from __future__ import print_function
import sys
import traceback

from regression.test_utils import get_db_connection


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
                                       server['port'])
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
            "SELECT oid FROM pg_event_trigger WHERE evtname = '%s'"
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
                                       server['port'])
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT oid FROM pg_event_trigger WHERE evtname = '%s'"
            % trigger_name)
        event_trigger = pg_cursor.fetchone()
        connection.close()
        return event_trigger
    except Exception:
        traceback.print_exc(file=sys.stderr)
