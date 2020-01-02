##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as pgagent_utils


class PgAgentStatsTestCase(BaseTestGenerator):
    """This class will test the stats pgAgent job API"""
    scenarios = [
        ('Check the stats of pgAgent job', dict(url='/browser/pga_job/stats/'))
    ]

    def setUp(self):
        flag, msg = pgagent_utils.is_valid_server_to_run_pgagent(self)
        if not flag:
            self.skipTest(msg)
        flag, msg = pgagent_utils.is_pgagent_installed_on_server(self)
        if not flag:
            self.skipTest(msg)
        name = "test_job_get%s" % str(uuid.uuid4())[1:8]
        self.job_id = pgagent_utils.create_pgagent_job(self, name)

    def runTest(self):
        """This function will check stats of pgAgent job"""
        response = self.tester.get(
            '{0}{1}/{2}/{3}'.format(
                self.url, str(utils.SERVER_GROUP), str(self.server_id),
                str(self.job_id)
            ),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """Clean up code"""
        pgagent_utils.delete_pgagent_job(self)
