##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as funcs_utils


class procedureDeleteTestCase(BaseTestGenerator):
    """ This class will delete the procedure under schema node. """
    scenarios = [
        # Fetching default URL for procedure node.
        ('Fetch Procedure Node URL',
         dict(url='/browser/procedure/obj/'))
    ]

    def runTest(self):
        """ This function will delete procedure under database node. """
        super().setUp()
        self = funcs_utils.set_up(self)

        if self.server_type == "pg" and\
                self.server_version < 110000:
            message = "Procedures are not supported by PG < 110000."
            self.skipTest(message)

        func_name = "test_procedure_delete_%s" % str(uuid.uuid4())[1:8]
        proc_info = funcs_utils.create_procedure(
            self.server, self.db_name, self.schema_name, func_name,
            self.server_type, self.server_version)

        proc_id = proc_info[0]
        response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' + str(proc_id),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def tearDown(self):
        pass
