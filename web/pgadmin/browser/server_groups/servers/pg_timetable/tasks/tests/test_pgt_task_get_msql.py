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


class PgtTaskGetMsqlTestCase(BaseTestGenerator):
    """This class will test the msql pgTimetable chain task API"""
    scenarios = utils.generate_scenarios("pgt_task_msql",
                                         tasks_utils.test_cases)

    def setUp(self):
        flag, msg = pgt_utils.is_valid_server_to_run_pgtimetable(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgt_utils.is_pgtimetable_installed_on_server(self)
        if not flag:
            self.skipTest(msg)

        self.data = self.test_data

        name = "test_chain_msql%s" % str(uuid.uuid4())[1:8]
        self.chain_id = pgt_utils.create_pgtimetable_chain(self, name)

        task_name = "test_task_msql%s" % str(uuid.uuid4())[1:8]
        self.task_id = pgt_utils.create_pgtimetable_task(
            self, task_name, self.chain_id)

    def runTest(self):
        """This function will get pgTimetable msql chain task"""
        if self.is_positive_test:
            url_encode_data = self.data
            response = tasks_utils.api_get_msql(self, url_encode_data)

            utils.assert_status_code(self, response)

    def tearDown(self):
        """Clean up code"""
        pgt_utils.delete_pgtimetable_chain(self)
