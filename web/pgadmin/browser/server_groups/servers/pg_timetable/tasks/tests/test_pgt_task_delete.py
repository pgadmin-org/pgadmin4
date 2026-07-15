##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.pg_timetable.tests import \
    utils as pgt_utils
from . import utils as tasks_utils


class PgtTaskDeleteTestCase(BaseTestGenerator):
    """This class will test the delete pgTimetable chain task API"""
    scenarios = utils.generate_scenarios("pgt_task_delete",
                                         tasks_utils.test_cases)

    def setUp(self):
        super().setUp()
        flag, msg = pgt_utils.is_valid_server_to_run_pgtimetable(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgt_utils.is_pgtimetable_installed_on_server(self)
        if not flag:
            self.skipTest(msg)

        self.data = self.test_data

        name = "test_chain_delete%s" % str(uuid.uuid4())[1:8]
        self.chain_id = pgt_utils.create_pgtimetable_chain(self, name)

        task_name = "test_task_delete%s" % str(uuid.uuid4())[1:8]
        self.task_id = pgt_utils.create_pgtimetable_task(
            self, task_name, self.chain_id)

        if self.is_list:
            task_name2 = "test_task2_delete%s" % str(uuid.uuid4())[1:8]
            self.task_id_2 = pgt_utils.create_pgtimetable_task(
                self, task_name2, self.chain_id)

    def runTest(self):
        """This function will delete pgTimetable chain task"""
        if self.is_positive_test:
            if self.is_list:
                self.data['ids'] = [self.task_id, self.task_id_2]
                response = tasks_utils.api_delete(self, '')
            else:
                response = tasks_utils.api_delete(self)

            utils.assert_status_code(self, response)

        is_present = pgt_utils.verify_pgtimetable_task(self)
        self.assertFalse(
            is_present,
            "pgTimetable task was not deleted successfully")

    def tearDown(self):
        """Clean up code"""
        pgt_utils.delete_pgtimetable_chain(self)
