##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
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


class DBMSDeleteJobTestCase(BaseTestGenerator):
    """This class will test the delete job in the DBMS job API"""
    scenarios = utils.generate_scenarios("dbms_delete_job",
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

        self.job_name = "test_job_delete%s" % str(uuid.uuid4())[1:8]
        self.job_id = job_scheduler_utils.create_dbms_job(
            self, self.job_name)

        # multiple jobs
        if self.is_list:
            self.job_name2 = "test_job_delete%s" % str(uuid.uuid4())[1:8]
            self.job_id_2 = job_scheduler_utils.create_dbms_job(
                self, self.job_name2)

    def runTest(self):
        """
            This function will test delete DBMS job under test database.
        """
        if self.is_list:
            self.data['ids'] = [self.job_id, self.job_id_2]
            response = job_scheduler_utils.api_delete(self, '')

            # Assert response
            utils.assert_status_code(self, response)

            is_present = job_scheduler_utils.verify_dbms_job(
                self, self.job_name)
            self.assertFalse(
                is_present, "DBMS job was not deleted successfully")

            is_present = job_scheduler_utils.verify_dbms_job(
                self, self.job_name2)
            self.assertFalse(
                is_present, "DBMS job was not deleted successfully")
        else:
            response = job_scheduler_utils.api_delete(self)

            # Assert response
            utils.assert_status_code(self, response)

            is_present = job_scheduler_utils.verify_dbms_job(
                self, self.job_name)
            self.assertFalse(
                is_present, "DBMS job was not deleted successfully")

    def tearDown(self):
        """This function will do the cleanup task."""
        job_scheduler_utils.clean_up(self)
