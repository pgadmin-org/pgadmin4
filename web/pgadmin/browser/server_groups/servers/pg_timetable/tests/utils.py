##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import traceback
import os
import json
from urllib.parse import urlencode

from regression.python_test_utils import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils import server_utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/pgt_timetable_test_data.json") as data_file:
    test_cases = json.load(data_file)


def api_create(self):
    return self.tester.post('{0}{1}/{2}/'.
                            format(self.url, str(utils.SERVER_GROUP),
                                   str(self.server_id)),
                            data=json.dumps(self.data),
                            content_type='html/json')


def api_get(self, chain_id=None):
    if chain_id is None:
        chain_id = self.chain_id
    return self.tester.get('{0}{1}/{2}/{3}'.
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, chain_id),
                           content_type='html/json')


def api_put(self):
    return self.tester.put('{0}{1}/{2}/{3}'.
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.chain_id),
                           data=json.dumps(self.data),
                           follow_redirects=True,
                           content_type='html/json')


def api_delete(self, chain_id=None):
    if chain_id is None:
        chain_id = self.chain_id
    return self.tester.delete('{0}{1}/{2}/{3}'.
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, chain_id),
                              data=json.dumps(self.data),
                              content_type='html/json')


def api_get_msql(self, url_encode_data):
    return self.tester.get("{0}{1}/{2}/{3}?{4}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.chain_id,
                                  urlencode(url_encode_data)),
                           follow_redirects=True)


def api_get_sql(self):
    return self.tester.get('{0}{1}/{2}/{3}'.
                           format(self.url.replace('/obj/', '/sql/'),
                                  utils.SERVER_GROUP,
                                  self.server_id, self.chain_id),
                           content_type='html/json')


def api_get_stats(self):
    return self.tester.get('{0}{1}/{2}/{3}'.
                           format(self.url.replace('/obj/', '/stats/'),
                                  utils.SERVER_GROUP,
                                  self.server_id, self.chain_id),
                           content_type='html/json')


def api_run_now(self):
    return self.tester.put('{0}{1}/{2}/{3}'.
                           format(self.url.replace('/obj/', '/run_now/'),
                                  utils.SERVER_GROUP,
                                  self.server_id, self.chain_id),
                           data=json.dumps(self.data),
                           content_type='html/json')


def is_valid_server_to_run_pgtimetable(self):
    self.server_id = parent_node_dict["server"][-1]["server_id"]
    server_con = server_utils.connect_server(self, self.server_id)
    if not server_con["info"] == "Server connected.":
        raise Exception("Could not connect to server to add pgTimetable chain.")
    return True, None


def is_pgtimetable_installed_on_server(self):
    try:
        connection = utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        pg_cursor = connection.cursor()

        SQL = """
        SELECT
            has_table_privilege(
              'timetable.chain', 'INSERT, SELECT, UPDATE'
            ) has_priviledge
        WHERE EXISTS(
            SELECT has_schema_privilege('timetable', 'USAGE')
            WHERE EXISTS(
                SELECT cl.oid FROM pg_catalog.pg_class cl
                LEFT JOIN pg_catalog.pg_namespace ns ON ns.oid=relnamespace
                WHERE relname='chain' AND nspname='timetable'
            )
        )
        """
        pg_cursor.execute(SQL)
        result = pg_cursor.fetchone()
        if result is None:
            connection.close()
            message = "Make sure pgTimetable is installed properly."
            return False, message

        SQL = """
        SELECT EXISTS(
                SELECT 1 FROM information_schema.columns
                WHERE
                    table_schema='timetable' AND table_name='task' AND
                    column_name='database_connection'
            ) has_connstr
        """
        pg_cursor.execute(SQL)
        result = pg_cursor.fetchone()
        if result is None:
            connection.close()
            message = "Make sure pgTimetable is installed properly."
            return False, message

        connection.close()
        return True, None
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_pgtimetable_chain(self, name):
    connection = None
    try:
        connection = utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            """
            INSERT INTO timetable.chain(
                chain_name, live
            ) VALUES (
                '{0}'::text, true
            ) RETURNING chain_id;
            """.format(name)
        )
        chain_id = pg_cursor.fetchone()
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        return chain_id[0]
    except Exception:
        traceback.print_exc(file=sys.stderr)
    finally:
        if connection:
            connection.close()


def delete_pgtimetable_chain(self, chain_id=None):
    if chain_id is None:
        chain_id = self.chain_id
    connection = None
    try:
        connection = utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "DELETE FROM timetable.task "
            "WHERE chain_id = '%s'::integer;" % chain_id
        )
        pg_cursor.execute(
            "DELETE FROM timetable.chain "
            "WHERE chain_id = '%s'::integer;" % chain_id
        )
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
    except Exception:
        traceback.print_exc(file=sys.stderr)
    finally:
        if connection:
            connection.close()


def verify_pgtimetable_chain(self):
    connection = None
    try:
        connection = utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT COUNT(*) FROM timetable.chain "
            "WHERE chain_id = '%s'::integer;" % self.chain_id
        )
        result = pg_cursor.fetchone()
        count = result[0]
        return count is not None and int(count) != 0
    except Exception:
        traceback.print_exc(file=sys.stderr)
    finally:
        if connection:
            connection.close()


def create_pgtimetable_task(self, task_name, chain_id):
    connection = None
    try:
        connection = utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        query = """
            INSERT INTO timetable.task(
                chain_id, task_name, task_order, command, kind
            ) VALUES (
                {0}::integer, '{1}'::text, 10, 'SELECT 1', 'SQL'
            ) RETURNING task_id;
            """.format(chain_id, task_name)
        pg_cursor.execute(query)
        task_id = pg_cursor.fetchone()
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        return task_id[0]
    except Exception:
        traceback.print_exc(file=sys.stderr)
    finally:
        if connection:
            connection.close()


def delete_pgtimetable_task(self, task_id=None):
    if task_id is None:
        task_id = self.task_id
    connection = None
    try:
        connection = utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "DELETE FROM timetable.parameter "
            "WHERE task_id = '%s'::integer;" % task_id
        )
        pg_cursor.execute(
            "DELETE FROM timetable.task "
            "WHERE task_id = '%s'::integer;" % task_id
        )
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
    except Exception:
        traceback.print_exc(file=sys.stderr)
    finally:
        if connection:
            connection.close()


def verify_pgtimetable_task(self):
    connection = None
    try:
        connection = utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT COUNT(*) FROM timetable.task "
            "WHERE task_id = '%s'::integer;" % self.task_id
        )
        result = pg_cursor.fetchone()
        count = result[0]
        return count is not None and int(count) != 0
    except Exception:
        traceback.print_exc(file=sys.stderr)
    finally:
        if connection:
            connection.close()
