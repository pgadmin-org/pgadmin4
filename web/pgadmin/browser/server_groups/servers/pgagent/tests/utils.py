##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from __future__ import print_function
import sys
import traceback

from regression.python_test_utils import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils import server_utils as server_utils


def is_valid_server_to_run_pgagent(self):
    """
    This function checks if server is valid for the pgAgent job.
    """
    self.server_id = parent_node_dict["server"][-1]["server_id"]
    server_con = server_utils.connect_server(self, self.server_id)
    if not server_con["info"] == "Server connected.":
        raise Exception("Could not connect to server to add pgAgent job.")
    if "type" in server_con["data"]:
        if server_con["data"]["type"] == "gpdb":
            message = "pgAgent is not supported by Greenplum."
            return False, message
    return True, None


def is_pgagent_installed_on_server(self):
    """
    This function checks if the pgAgent is installed properly.
    """
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
              'pgagent.pga_job', 'INSERT, SELECT, UPDATE'
            ) has_priviledge
        WHERE EXISTS(
            SELECT has_schema_privilege('pgagent', 'USAGE')
            WHERE EXISTS(
                SELECT cl.oid FROM pg_class cl
                LEFT JOIN pg_namespace ns ON ns.oid=relnamespace
                WHERE relname='pga_job' AND nspname='pgagent'
            )
        )
        """
        pg_cursor.execute(SQL)
        result = pg_cursor.fetchone()
        if result is None:
            connection.close()
            message = "Make sure pgAgent is installed properly."
            return False, message

        SQL = """
        SELECT EXISTS(
                SELECT 1 FROM information_schema.columns
                WHERE
                    table_schema='pgagent' AND table_name='pga_jobstep' AND
                    column_name='jstconnstr'
            ) has_connstr
        """
        pg_cursor.execute(SQL)
        result = pg_cursor.fetchone()
        if result is None:
            connection.close()
            message = "Make sure pgAgent is installed properly."
            return False, message

        connection.close()
        return True, None
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_pgagent_job(self, name):
    """
    This function create the pgAgent job.
    """
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
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            """
            INSERT INTO pgagent.pga_job(
                jobjclid, jobname, jobdesc, jobhostagent, jobenabled
            ) VALUES (
                1::integer, '{0}'::text, ''::text, ''::text, true
            ) RETURNING jobid;
            """.format(name)
        )
        job_id = pg_cursor.fetchone()
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        connection.close()
        return job_id[0]
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_pgagent_job(self):
    """
    This function deletes the pgAgent job.
    """
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
        connection.set_isolation_level(0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "DELETE FROM pgagent.pga_job "
            "WHERE jobid = '%s'::integer;" % self.job_id
        )
        connection.set_isolation_level(old_isolation_level)
        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_pgagent_job(self):
    """
    This function deletes the pgAgent job.
    """
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
            "SELECT COUNT(*) FROM pgagent.pga_job "
            "WHERE jobid = '%s'::integer;" % self.job_id
        )
        result = pg_cursor.fetchone()
        count = result[0]
        connection.close()
        return count is not None and int(count) != 0
    except Exception:
        traceback.print_exc(file=sys.stderr)
