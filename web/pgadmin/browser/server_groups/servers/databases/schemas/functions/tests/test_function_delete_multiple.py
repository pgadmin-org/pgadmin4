##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as funcs_utils


class FunctionDeleteTestCase(BaseTestGenerator):
    """ This class will delete the function under schema node. """
    scenarios = [
        # Fetching default URL for function node.
        ('Fetch Function Node URL',
         dict(url='/browser/function/obj/'))
    ]

    def runTest(self):
        """ This function will delete function under database node. """
        super(FunctionDeleteTestCase, self).setUp()
        self = funcs_utils.set_up(self)

        func_name = "test_function_delete_%s" % str(uuid.uuid4())[1:8]
        function_info = funcs_utils.create_function(
            self.server, self.db_name, self.schema_name, func_name)

        func_name_1 = "test_function_delete_%s" % str(uuid.uuid4())[1:8]
        function_info_1 = funcs_utils.create_function(
            self.server, self.db_name, self.schema_name, func_name_1)

        data = {'ids': [function_info[0], function_info_1[0]]}
        response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/',
            data=json.dumps(data),
            follow_redirects=True,
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def tearDown(self):
        pass
