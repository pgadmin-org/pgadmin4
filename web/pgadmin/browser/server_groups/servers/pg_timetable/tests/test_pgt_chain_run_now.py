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


class PgtChainRunNowTestCase(BaseTestGenerator):
    """This class will test the run now pgTimetable chain API"""
    scenarios = utils.generate_scenarios("pgt_chain_run_now",
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

        name = "test_chain_run_now%s" % str(uuid.uuid4())[1:8]
        self.chain_id = pgt_utils.create_pgtimetable_chain(self, name)

        designated = self.test_data.get("designated_client")
        if designated:
            self.set_chain_client_name(designated)

    def set_chain_client_name(self, client_name):
        connection = None
        try:
            connection = utils.get_db_connection(
                self.server['db'],
                self.server['username'],
                self.server['db_password'],
                self.server['host'],
                self.server['port'],
                self.server['sslmode']
            )
            old_isolation_level = connection.isolation_level
            utils.set_isolation_level(connection, 0)
            pg_cursor = connection.cursor()
            pg_cursor.execute(
                "UPDATE timetable.chain SET client_name = '%s'::text "
                "WHERE chain_id = '%s'::integer;"
                % (client_name, self.chain_id)
            )
            utils.set_isolation_level(connection, old_isolation_level)
            connection.commit()
        except Exception:
            import traceback
            traceback.print_exc()
        finally:
            if connection:
                connection.close()

    def runTest(self):
        """This function will notify pgTimetable to run the chain now"""

        response = pgt_utils.api_run_now(self)

        utils.assert_status_code(self, response)

        res = response.json
        if self.is_positive_test:
            self.assertTrue(res["data"]["notification"])
        else:
            self.assertFalse(res["data"]["notification"])
            self.assertIn("is not active", res["info"])

    def tearDown(self):
        """Clean up code"""
        pgt_utils.delete_pgtimetable_chain(self)
