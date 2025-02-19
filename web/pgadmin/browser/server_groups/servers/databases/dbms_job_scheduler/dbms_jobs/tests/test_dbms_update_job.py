##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import json
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from ...tests import utils as job_scheduler_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils


# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/dbms_jobs_test_data.json") as data_file:
    test_cases = json.load(data_file)


class DBMSUpdateJobTestCase(BaseTestGenerator):
    """This class will test the add job in the DBMS Job API"""
    scenarios = utils.generate_scenarios("dbms_update_job",
                                         test_cases)

    def setUp(self):
        super().setUp()
        # Load test data
        self.data = self.test_data

        if not job_scheduler_utils.is_supported_version(self):
            self.skipTest(job_scheduler_utils.SKIP_MSG)

        # Create db
        self.db_name, self.db_id = job_scheduler_utils.create_test_database(
            self)
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if db_con["info"] != "Database connected.":
            raise Exception("Could not connect to database.")

        # Create extension required for job scheduler
        job_scheduler_utils.create_job_scheduler_extensions(self)

        if not job_scheduler_utils.is_dbms_job_scheduler_present(self):
            self.skipTest(job_scheduler_utils.SKIP_MSG_EXTENSION)

        # Create job schedule
        job_scheduler_utils.create_dbms_schedule(self, 'yearly_sch')
        job_scheduler_utils.create_dbms_program(
            self,'prg_with_proc_args', with_proc=True,
            proc_name='public.test_proc_with_args()',
            define_args=True)
        self.job_id = job_scheduler_utils.create_dbms_job(
            self, self.data['jsjobname'], True,
            'prg_with_proc_args','yearly_sch')

    def runTest(self):
        """ This function will update DBMS Job under test database. """
        response = job_scheduler_utils.api_put(self, self.job_id)

        # Assert response
        utils.assert_status_code(self, response)

    def tearDown(self):
        """This function will do the cleanup task."""
        job_scheduler_utils.clean_up(self)
