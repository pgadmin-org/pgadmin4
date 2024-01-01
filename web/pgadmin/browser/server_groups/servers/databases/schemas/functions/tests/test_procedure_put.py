##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
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


class ProcedurePutTestCase(BaseTestGenerator):
    """ This class will update new procedure under schema node. """
    scenarios = [
        # Fetching default URL for procedure node.
        ('Fetch Procedure Node URL',
         dict(url='/browser/procedure/obj/'))
    ]

    def runTest(self):
        """ This function will update procedure under database node. """
        super().setUp()
        self = funcs_utils.set_up(self)

        if self.server_type == "pg" and\
                self.server_version < 110000:
            message = "Procedures are not supported by PG < 110000."
            self.skipTest(message)

        func_name = "test_procedure_put_%s" % str(uuid.uuid4())[1:8]
        proc_info = funcs_utils.create_procedure(
            self.server, self.db_name, self.schema_name, func_name,
            self.server_type, self.server_version)

        proc_id = proc_info[0]
        data = {
            "description": "This is procedure update comment",
            "id": proc_id
        }

        put_response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) +
            '/' + str(self.server_id) + '/' + str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(proc_id),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEqual(put_response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def tearDown(self):
        pass
