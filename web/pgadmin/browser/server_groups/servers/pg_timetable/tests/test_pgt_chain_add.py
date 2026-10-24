##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from unittest.mock import patch

import json
import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgt_utils


class PgtChainAddTestCase(BaseTestGenerator):
    """This class will test the add pgTimetable chain API"""
    scenarios = utils.generate_scenarios("pgt_chain_create",
                                         pgt_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.data = self.test_data

        flag, msg = pgt_utils.is_valid_server_to_run_pgtimetable(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgt_utils.is_pgtimetable_installed_on_server(self)
        if not flag:
            self.skipTest(msg)

    def runTest(self):
        """This function will add pgTimetable chain"""
        self.pgt_chain = "test_chain_add%s" % str(uuid.uuid4())[1:8]

        if "chain_name" in self.data:
            self.data["chain_name"] = self.pgt_chain

        if self.is_positive_test:
            response = pgt_utils.api_create(self)

            utils.assert_status_code(self, response)

            response_data = json.loads(response.data)
            self.chain_id = response_data['node']['_id']
            is_present = pgt_utils.verify_pgtimetable_chain(self)
            self.assertTrue(is_present,
                            "pgTimetable chain was not created successfully")
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = pgt_utils.api_create(self)

                    utils.assert_status_code(self, response)
                    utils.assert_error_message(self, response)
            else:
                response = pgt_utils.api_create(self)

                utils.assert_status_code(self, response)
                utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        if self.is_positive_test:
            pgt_utils.delete_pgtimetable_chain(self)
