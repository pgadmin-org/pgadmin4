##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/pgagent_test_data.json") as data_file:
    test_cases = json.load(data_file)


# api methods
def api_create(self):
    return self.tester.post('{0}{1}/{2}/'.
                            format(self.url, str(utils.SERVER_GROUP),
                                   str(self.server_id)),
                            data=json.dumps(self.data),
                            content_type='html/json')


def api_get(self, job_id=None):
    if job_id is None:
        job_id = self.job_id
    return self.tester.get('{0}{1}/{2}/{3}'.
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, job_id),
                           content_type='html/json')


def api_put(self):
    return self.tester.put('{0}{1}/{2}/{3}'.
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.job_id),
                           data=json.dumps(self.data),
                           follow_redirects=True,
                           content_type='html/json')


def api_get_msql(self, url_encode_data):
    return self.tester.get("{0}{1}/{2}/{3}?{4}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.job_id,
                                  urlencode(url_encode_data)),
                           follow_redirects=True)


def api_delete(self, job_id=None):
    if job_id is None:
        job_id = self.job_id
    return self.tester.delete('{0}{1}/{2}/{3}'.
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, job_id),
                              data=json.dumps(self.data),
                              content_type='html/json')


def is_valid_server_to_run_pgagent(self):
    """
    This function checks if server is valid for the pgAgent job.
    """
    self.server_id = parent_node_dict["server"][-1]["server_id"]
    server_con = server_utils.connect_server(self, self.server_id)
    if not server_con["info"] == "Server connected.":
        raise Exception("Could not connect to server to add pgAgent job.")
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
                SELECT cl.oid FROM pg_catalog.pg_class cl
                LEFT JOIN pg_catalog.pg_namespace ns ON ns.oid=relnamespace
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
        utils.set_isolation_level(connection, 0)
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
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        connection.close()
        return job_id[0]
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_pgagent_job(self, job_id=None):
    """
    This function deletes the pgAgent job.
    """
    if job_id is None:
        job_id = self.job_id
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
            "DELETE FROM pgagent.pga_job "
            "WHERE jobid = '%s'::integer;" % job_id
        )
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_pgagent_job(self):
    """
    This function verifies the pgAgent job.
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


def create_pgagent_schedule(self, sch_name, jobid):
    """
    This function create the pgAgent schedule.
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
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        query = """
            INSERT INTO pgagent.pga_schedule(
                jscname, jscjobid, jscenabled, jscdesc, jscstart, jscend
            ) VALUES (
                '{0}'::text, {1}::int, true, '',
                '2050-01-01 12:14:21 +05:30'::timestamp with time zone,
                '2050-01-30 12:14:21 +05:30'::timestamp with time zone
            ) RETURNING jscid;
            """.format(sch_name, jobid)
        pg_cursor.execute(query)
        sch_id = pg_cursor.fetchone()
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        connection.close()
        return sch_id[0]
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_pgagent_schedule(self):
    """
    This function deletes the pgAgent schedule.
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
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "DELETE FROM pgagent.pga_schedule "
            "WHERE jscid = '%s'::integer;" % self.schedule_id
        )
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_pgagent_schedule(self):
    """
    This function verifies the pgAgent schedule.
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
            "SELECT COUNT(*) FROM pgagent.pga_schedule "
            "WHERE jscid = '%s'::integer;" % self.schedule_id
        )
        result = pg_cursor.fetchone()
        count = result[0]
        connection.close()
        return count is not None and int(count) != 0
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_pgagent_exception(self, date, time):
    """
    This function deletes the pgAgent exception.
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
        query = "DELETE FROM pgagent.pga_exception " \
                "WHERE jexdate = to_date('{0}', 'YYYY-MM-DD') AND " \
                "jextime = '{1}'::time without time zone;".format(date, time)
        pg_cursor.execute(query)
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_pgagent_exception(self, schid, date, time):
    """
    This function create the pgAgent exception.
    """
    try:
        # Delete existing exception if already exists
        delete_pgagent_exception(self, date, time)

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
            INSERT INTO pgagent.pga_exception(jexscid, jexdate, jextime
            ) VALUES ({0},
                to_date('{1}', 'YYYY-MM-DD'), '{2}'::time without time zone
            ) RETURNING jexid;
            """.format(schid, date, time)
        pg_cursor.execute(query)
        excep_id = pg_cursor.fetchone()
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        connection.close()
        return excep_id[0]
    except Exception:
        traceback.print_exc(file=sys.stderr)


def create_pgagent_step(self, step_name, jobid):
    """
    This function create the pgAgent step.
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
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        query = """
            INSERT INTO pgagent.pga_jobstep(
                jstname, jstjobid, jstenabled, jstkind,
                jstcode, jstdbname
            ) VALUES (
                '{0}'::text, {1}::int, true, 's', 'SELECT 1', 'postgres'
            ) RETURNING jstid;
            """.format(step_name, jobid)
        pg_cursor.execute(query)
        step_id = pg_cursor.fetchone()
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        connection.close()
        return step_id[0]
    except Exception:
        traceback.print_exc(file=sys.stderr)


def delete_pgagent_step(self):
    """
    This function deletes the pgAgent step.
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
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "DELETE FROM pgagent.pga_jobstep "
            "WHERE jstid = '%s'::integer;" % self.step_id
        )
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_pgagent_step(self):
    """
    This function verifies the pgAgent step .
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
            "SELECT COUNT(*) FROM pgagent.pga_jobstep "
            "WHERE jstid = '%s'::integer;" % self.step_id
        )
        result = pg_cursor.fetchone()
        count = result[0]
        connection.close()
        return count is not None and int(count) != 0
    except Exception:
        traceback.print_exc(file=sys.stderr)
