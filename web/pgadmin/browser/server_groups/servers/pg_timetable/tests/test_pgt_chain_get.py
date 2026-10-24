##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgt_utils


class PgtChainGetTestCase(BaseTestGenerator):
    """This class will test the get pgTimetable chain API"""
    scenarios = utils.generate_scenarios("pgt_chain_get",
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

        name = "test_chain_get%s" % str(uuid.uuid4())[1:8]
        self.chain_id = pgt_utils.create_pgtimetable_chain(self, name)

        if self.is_list:
            name_2 = "test_chain_get%s" % str(uuid.uuid4())[1:8]
            self.chain_id_2 = pgt_utils.create_pgtimetable_chain(self, name_2)

    def runTest(self):
        """This function will get pgTimetable chain"""

        if self.is_positive_test:
            if self.is_list:
                response = pgt_utils.api_get(self, '')
            else:
                response = pgt_utils.api_get(self)

            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = pgt_utils.api_get(self)
            elif 'chain_id' in self.data:
                existing_chain_id = self.chain_id
                self.chain_id = self.data["chain_id"]
                response = pgt_utils.api_get(self)
                self.chain_id = existing_chain_id

            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        pgt_utils.delete_pgtimetable_chain(self)
        if self.is_list:
            pgt_utils.delete_pgtimetable_chain(self, self.chain_id_2)
