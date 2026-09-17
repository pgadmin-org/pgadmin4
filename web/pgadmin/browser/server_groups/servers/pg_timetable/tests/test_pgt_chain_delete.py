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
from . import utils as pgt_utils


class PgtChainDeleteTestCase(BaseTestGenerator):
    """This class will test the delete pgTimetable chain API"""
    scenarios = utils.generate_scenarios("pgt_chain_delete",
                                         pgt_utils.test_cases)

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

        if self.is_list:
            name2 = "test_chain2_delete%s" % str(uuid.uuid4())[1:8]
            self.chain_id2 = pgt_utils.create_pgtimetable_chain(self, name2)

    def runTest(self):
        """This function will delete pgTimetable chain"""
        if self.is_positive_test:
            if self.is_list:
                self.data['ids'] = [self.chain_id, self.chain_id2]
                response = pgt_utils.api_delete(self, '')
            else:
                response = pgt_utils.api_delete(self)

            utils.assert_status_code(self, response)

        is_present = pgt_utils.verify_pgtimetable_chain(self)
        self.assertFalse(
            is_present, "pgTimetable chain was not deleted successfully")

    def tearDown(self):
        """Clean up code"""
        pgt_utils.delete_pgtimetable_chain(self)
        if self.is_list:
            pgt_utils.delete_pgtimetable_chain(self, self.chain_id2)
