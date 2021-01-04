##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as funcs_utils


class TriggerFuncDeleteTestCase(BaseTestGenerator):
    """ This class will delete the trigger function under schema node. """
    skip_on_database = ['gpdb']
    scenarios = [
        # Fetching default URL for trigger function node.
        ('Fetch Trigger Function Node URL',
         dict(url='/browser/trigger_function/obj/'))
    ]

    def runTest(self):
        """ This function will delete trigger function under database node. """
        super(TriggerFuncDeleteTestCase, self).setUp()
        self = funcs_utils.set_up(self)

        func_name = "test_event_delete_%s" % str(uuid.uuid4())[1:8]
        function_info = funcs_utils.create_trigger_function(
            self.server, self.db_name, self.schema_name, func_name,
            self.server_version)

        trigger_func_id = function_info[0]
        response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' + str(trigger_func_id),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def tearDown(self):
        pass
