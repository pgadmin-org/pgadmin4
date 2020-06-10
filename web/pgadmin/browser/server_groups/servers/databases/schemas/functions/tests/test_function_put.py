##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
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


class FunctionPutTestCase(BaseTestGenerator):
    """ This class will update new function under schema node. """
    skip_on_database = ['gpdb']
    scenarios = [
        # Fetching default URL for function node.
        ('Fetch Function Node URL',
         dict(url='/browser/function/obj/'))
    ]

    def runTest(self):
        """ This function will update function under database node. """
        super(FunctionPutTestCase, self).setUp()
        self = funcs_utils.set_up(self)

        func_name = "test_event_delete_%s" % str(uuid.uuid4())[1:8]
        function_info = funcs_utils.create_function(
            self.server, self.db_name, self.schema_name, func_name)

        func_id = function_info[0]

        data = {
            "description": "This is a procedure update comment",
            "id": func_id
        }

        if self.server_version >= 120000:
            support_function_name = 'supportfunc_%s' % str(uuid.uuid4())[1:8]
            funcs_utils.create_support_internal_function(
                self.server,
                self.db_name,
                self.schema_name,
                support_function_name
            )

            data['prosupportfuc'] = support_function_name

        put_response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) +
            '/' + str(self.server_id) + '/' + str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(func_id),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEquals(put_response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def tearDown(self):
        pass
