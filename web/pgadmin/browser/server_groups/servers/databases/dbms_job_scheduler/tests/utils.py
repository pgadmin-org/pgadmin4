##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import sys
import json
import traceback
from urllib.parse import urlencode
from regression.python_test_utils import test_utils as utils
from pgadmin.utils.constants import DBMS_JOB_SCHEDULER_ID
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils

CONTENT_TYPE = 'html/json'
FORMAT_STRING = '{0}{1}/{2}/{3}/{4}/{5}'
TEST_DATABASE = "test_dbms_job_scheduler"
SKIP_MSG = ("The DBMS Job Scheduler is supported exclusively on EPAS servers "
            "version 16 or higher.")
SKIP_MSG_EXTENSION = ("The DBMS Job Scheduler requires the presence of "
                      "'edb_job_scheduler' and 'dbms_scheduler' extensions in "
                      "the test database and that database must be listed in "
                      "the 'edb_job_scheduler.database_list' GUC parameter")


# api methods
def api_create(self):
    return self.tester.post('{0}{1}/{2}/{3}/{4}/'.
                            format(self.url, utils.SERVER_GROUP,
                                   self.server_id, self.db_id,
                                   DBMS_JOB_SCHEDULER_ID),
                            data=json.dumps(self.data),
                            content_type=CONTENT_TYPE)


def api_delete(self, delete_id=None):
    if delete_id is None and hasattr(self, 'schedule_id'):
        delete_id = self.schedule_id
    elif delete_id is None and hasattr(self, 'program_id'):
        delete_id = self.program_id
    elif delete_id is None and hasattr(self, 'job_id'):
        delete_id = self.job_id
    return self.tester.delete(FORMAT_STRING.
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id,
                                     DBMS_JOB_SCHEDULER_ID, delete_id),
                              data=json.dumps(self.data),
                              content_type=CONTENT_TYPE)


def api_put(self, update_id):
    return self.tester.put(FORMAT_STRING.
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  DBMS_JOB_SCHEDULER_ID, update_id),
                           data=json.dumps(self.data),
                           content_type=CONTENT_TYPE)


def api_get(self, get_id=None):
    if get_id is None and hasattr(self, 'schedule_id'):
        get_id = self.schedule_id
    elif get_id is None and hasattr(self, 'program_id'):
        get_id = self.program_id
    elif get_id is None and hasattr(self, 'job_id'):
        get_id = self.job_id

    return self.tester.get(FORMAT_STRING.
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  DBMS_JOB_SCHEDULER_ID, get_id),
                           content_type=CONTENT_TYPE)


def api_get_msql(self, url_encode_data):
    return self.tester.get("{0}{1}/{2}/{3}/{4}/?{5}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  DBMS_JOB_SCHEDULER_ID,
                                  urlencode(url_encode_data)),
                           data=json.dumps(self.data),
                           follow_redirects=True)


def create_test_database(self):
    """
    This function is used to create a separate database to test DBMS Scheduler
    """
    # Drop database if already exists
    connection = utils.get_db_connection(self.server['db'],
                                         self.server['username'],
                                         self.server['db_password'],
                                         self.server['host'],
                                         self.server['port'])
    utils.drop_database(connection, TEST_DATABASE)

    # Create a new database to test DBMS Scheduler
    did = utils.create_database(self.server, TEST_DATABASE)
    return TEST_DATABASE, did


def is_supported_version(self):
    """
    This function is used to check whether version is supported to run tests.
    """
    return (self.server_information['type'] == 'ppas' and
            self.server_information['server_version'] >= 160000)


def is_dbms_job_scheduler_present(self):
    """
    This function is used to check the DBMS Job Scheduler is installed.
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()

        query = """SELECT COUNT(*) FROM pg_extension WHERE extname IN
        ('edb_job_scheduler', 'dbms_scheduler')"""
        pg_cursor.execute(query)
        res = pg_cursor.fetchone()

        if res and len(res) > 0 and int(res[0]) == 2:
            # Get the list of databases specified for the edb_job_scheduler
            pg_cursor.execute("""SHOW edb_job_scheduler.database_list""")
            res = pg_cursor.fetchone()
            # If database is available in the specified list than return
            # True.
            if res and len(res) > 0 and self.db_name in res[0]:
                return True
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)

    return False


def create_job_scheduler_extensions(self):
    """
    This function is used to create the extension for DBMS Job Scheduler.
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()

        # Create edb_job_scheduler extension if not exist.
        pg_cursor.execute('''CREATE EXTENSION IF NOT EXISTS
                    "edb_job_scheduler"''')

        # Create dbms_scheduler extension if not exist.
        pg_cursor.execute('''CREATE EXTENSION IF NOT EXISTS
                    "dbms_scheduler"''')

        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)

    return False


def delete_job_scheduler_extensions(self):
    """
    This function is used to create the extension for DBMS Job Scheduler.
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()

        # Drop edb_job_scheduler extension if exist.
        pg_cursor.execute('''DROP EXTENSION IF EXISTS
                    "edb_job_scheduler" CASCADE''')

        # Drop dbms_scheduler extension if exist.
        pg_cursor.execute('''DROP EXTENSION IF EXISTS
                    "dbms_scheduler" CASCADE''')

        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_dbms_schedule(self, sch_name):
    """
    This function is used to verify the DBMS schedule is created or not
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()
        sql = """SELECT
            COUNT(*) FROM sys.scheduler_0300_schedule
            WHERE dss_schedule_name = '{0}'""".format(sch_name)

        pg_cursor.execute(sql)
        res = pg_cursor.fetchone()
        connection.close()

        if res and len(res) > 0 and int(res[0]) >= 1:
            return True
    except Exception:
        traceback.print_exc(file=sys.stderr)

    return False


def create_dbms_schedule(self, sch_name):
    """
    This function is used to create the dbms schedule.
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()
        sql = """EXEC dbms_scheduler.CREATE_SCHEDULE(
            schedule_name    => '{0}',
            start_date       => '01-JUN-13 09:00:00.000000',
            repeat_interval  => 'FREQ=DAILY;BYDAY=MON,TUE,WED,THU,FRI;',
            comments         => 'This schedule executes weeknight at 5');
        """.format(sch_name)
        pg_cursor.execute(sql)
        connection.commit()

        pg_cursor.execute("""SELECT
            dss_schedule_id FROM sys.scheduler_0300_schedule
            WHERE dss_schedule_name = '{0}'""".format(sch_name))
        res = pg_cursor.fetchone()
        connection.close()

        if res and len(res) > 0 and int(res[0]) >= 1:
            return int(res[0])
    except Exception:
        traceback.print_exc(file=sys.stderr)

    return 0


def delete_dbms_schedule(self, sch_name):
    """
    This function is used to delete the dbms schedule.
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()
        sql = """EXEC dbms_scheduler.DROP_SCHEDULE('{0}')""".format(
            sch_name)
        pg_cursor.execute(sql)

        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_dbms_program(self, prg_name):
    """
    This function is used to verify the DBMS program is created or not
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()
        sql = """SELECT
            COUNT(*) FROM sys.scheduler_0200_program
            WHERE dsp_program_name = '{0}'""".format(prg_name)

        pg_cursor.execute(sql)
        res = pg_cursor.fetchone()
        connection.close()

        if res and len(res) > 0 and int(res[0]) >= 1:
            return True
    except Exception:
        traceback.print_exc(file=sys.stderr)

    return False


def create_dbms_program(self, prg_name, enabled=True,
                        with_proc=False, proc_name=None, define_args=False):
    """
    This function is used to create the dbms program.
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()
        if with_proc:
            sql = """EXEC dbms_scheduler.CREATE_PROGRAM(
                program_name    => '{0}',
                program_type    => 'STORED_PROCEDURE',
                program_action  => '{1}',
                enabled         => {2},
                comments        => 'This is a program with procedure');
            """.format(prg_name, proc_name, enabled)

            if define_args:
                sql += """ EXEC dbms_scheduler.DEFINE_PROGRAM_ARGUMENT(
                    program_name => '{0}',
                    argument_position => 0,
                    argument_name => 'salary',
                    argument_type => 'bigint',
                    default_value => '10000');
                """.format(prg_name)
        else:
            sql = """EXEC dbms_scheduler.CREATE_PROGRAM(
                program_name    => '{0}',
                program_type    => 'PLSQL_BLOCK',
                program_action  => 'BEGIN SELECT 1; END;',
                enabled         => {1},
                comments        => 'This is a test program with plsql');
            """.format(prg_name, enabled)
        pg_cursor.execute(sql)
        connection.commit()

        pg_cursor.execute("""SELECT
            dsp_program_id FROM sys.scheduler_0200_program
            WHERE dsp_program_name = '{0}'""".format(prg_name))
        res = pg_cursor.fetchone()
        connection.close()

        if res and len(res) > 0 and int(res[0]) >= 1:
            return int(res[0])
    except Exception:
        traceback.print_exc(file=sys.stderr)

    return 0


def delete_dbms_program(self, prg_name):
    """
    This function is used to delete the dbms program.
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()
        sql = """EXEC dbms_scheduler.DROP_PROGRAM('{0}')""".format(
            prg_name)
        pg_cursor.execute(sql)

        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def verify_dbms_job(self, job_name):
    """
    This function is used to verify the DBMS job is created or not
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()
        sql = """SELECT
            COUNT(*) FROM sys.scheduler_0400_job
            WHERE dsj_job_name = '{0}'""".format(job_name)

        pg_cursor.execute(sql)
        res = pg_cursor.fetchone()
        connection.close()

        if res and len(res) > 0 and int(res[0]) >= 1:
            return True
    except Exception:
        traceback.print_exc(file=sys.stderr)

    return False


def create_dbms_job(self, job_name, with_proc=False, prg_name=None,
                    sch_name=None):
    """
    This function is used to create the dbms program.
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()
        if with_proc:
            sql = """EXEC dbms_scheduler.CREATE_JOB(
                job_name      => '{0}',
                program_name  => '{1}',
                schedule_name => '{2}');
            """.format(job_name, prg_name, sch_name)
        else:
            sql = """EXEC dbms_scheduler.CREATE_JOB(
                job_name        => '{0}',
                job_type        => 'PLSQL_BLOCK',
                job_action      => 'BEGIN PERFORM 1; END;',
                repeat_interval => 'FREQ=YEARLY;',
                start_date      => '2024-02-27 00:00:00 +05:30');
            """.format(job_name)
        pg_cursor.execute(sql)
        connection.commit()

        pg_cursor.execute("""SELECT
            dsj_job_id FROM sys.scheduler_0400_job
            WHERE dsj_job_name = '{0}'""".format(job_name))
        res = pg_cursor.fetchone()
        connection.close()

        if res and len(res) > 0 and int(res[0]) >= 1:
            return int(res[0])
    except Exception:
        traceback.print_exc(file=sys.stderr)

    return 0


def delete_dbms_job(self, job_name):
    """
    This function is used to delete the dbms job.
    """
    try:
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        pg_cursor = connection.cursor()
        sql = """EXEC dbms_scheduler.DROP_JOB('{0}')""".format(
            job_name)
        pg_cursor.execute(sql)

        connection.commit()
        connection.close()
    except Exception:
        traceback.print_exc(file=sys.stderr)


def clean_up(self):
    # Delete extension required for job scheduler
    delete_job_scheduler_extensions(self)
    database_utils.disconnect_database(self, self.server_id, self.db_id)

    # Drop database if already exists
    connection = utils.get_db_connection(self.server['db'],
                                         self.server['username'],
                                         self.server['db_password'],
                                         self.server['host'],
                                         self.server['port'])
    utils.drop_database(connection, self.db_name)
