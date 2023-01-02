##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as funcs_utils


class TriggerFuncPutTestCase(BaseTestGenerator):
    """ This class will update new trigger function under schema node. """
    scenarios = [
        # Fetching default URL for trigger function node.
        ('Fetch Trigger Function Node URL',
         dict(url='/browser/trigger_function/obj/'))
    ]

    def runTest(self):
        """ This function will update trigger function under database node. """
        super().setUp()
        self = funcs_utils.set_up(self)

        func_name = "test_event_delete_%s" % str(uuid.uuid4())[1:8]
        function_info = funcs_utils.create_trigger_function(
            self.server, self.db_name, self.schema_name, func_name,
            self.server_version)

        trigger_func_id = function_info[0]

        data = {
            "description": "This is a trigger function update comment",
            "id": trigger_func_id
        }

        put_response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) +
            '/' + str(self.server_id) + '/' + str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(trigger_func_id),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEqual(put_response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def tearDown(self):
        pass
