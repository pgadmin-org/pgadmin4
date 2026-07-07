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


class PgtChainSqlTestCase(BaseTestGenerator):
    """This class will test the get pgTimetable chain sql API"""
    scenarios = utils.generate_scenarios("pgt_chain_sql",
                                         pgt_utils.test_cases)

    def setUp(self):
        flag, msg = pgt_utils.is_valid_server_to_run_pgtimetable(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgt_utils.is_pgtimetable_installed_on_server(self)
        if not flag:
            self.skipTest(msg)

        self.data = self.test_data

        name = "test_chain_sql%s" % str(uuid.uuid4())[1:8]
        self.chain_id = pgt_utils.create_pgtimetable_chain(self, name)

    def runTest(self):
        """This function will get pgTimetable chain sql"""

        if self.is_positive_test:
            response = pgt_utils.api_get_sql(self)

            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = pgt_utils.api_get_sql(self)
            elif 'chain_id' in self.data:
                existing_chain_id = self.chain_id
                self.chain_id = self.data["chain_id"]
                response = pgt_utils.api_get_sql(self)
                self.chain_id = existing_chain_id

            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        """Clean up code"""
        pgt_utils.delete_pgtimetable_chain(self)
