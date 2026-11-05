##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgt_utils

NOT_AVAILABLE_MSG = (
    "The pg_timetable schema was not found in the maintenance database, "
    "or the current role does not have INSERT, SELECT and UPDATE "
    "privileges on timetable.chain."
)
ACCESS_CHECK = \
    'pgadmin.browser.server_groups.servers.pg_timetable.has_pgt_chain_access'


class PgtChainNotAvailableTestCase(BaseTestGenerator):
    """
    Test that the pgTimetable chain API returns a clear error, rather than a
    raw SQL error and HTTP 500, when pg_timetable is not usable in the
    server's maintenance database.
    """
    scenarios = [
        ('Create chain: pg_timetable not available', dict(
            api='create', mock_return=(True, False),
            expected_data={'status_code': 400,
                           'error_msg': NOT_AVAILABLE_MSG})),
        ('List chains: pg_timetable not available', dict(
            api='list', mock_return=(True, False),
            expected_data={'status_code': 400,
                           'error_msg': NOT_AVAILABLE_MSG})),
        ('List chains: access check fails', dict(
            api='list', mock_return=(False, 'Mocked Internal Server Error'),
            expected_data={'status_code': 500,
                           'error_msg': 'Mocked Internal Server Error'})),
        ('List chains: pg_timetable not installed (unmocked)', dict(
            api='list', mock_return=None,
            expected_data={'status_code': 400,
                           'error_msg': NOT_AVAILABLE_MSG})),
    ]

    def setUp(self):
        """Connect to the server and set up the request data"""
        super().setUp()
        self.url = '/browser/pgt_chain/obj/'
        self.data = {'chain_name': 'test_chain_not_available', 'live': False}

        flag, msg = pgt_utils.is_valid_server_to_run_pgtimetable(self)
        if not flag:
            self.skipTest(msg)

        if self.mock_return is None:
            installed, _ = pgt_utils.is_pgtimetable_installed_on_server(self)
            if installed:
                self.skipTest('pg_timetable is installed on the server.')

    def _call_api(self):
        """Call the chain API selected by the scenario"""
        if self.api == 'create':
            return pgt_utils.api_create(self)
        return pgt_utils.api_get(self, '')

    def runTest(self):
        """Check the error returned when pg_timetable is not available"""
        if self.mock_return is None:
            response = self._call_api()
        else:
            with patch(ACCESS_CHECK, return_value=self.mock_return):
                response = self._call_api()

        utils.assert_status_code(self, response)
        utils.assert_error_message(self, response)
