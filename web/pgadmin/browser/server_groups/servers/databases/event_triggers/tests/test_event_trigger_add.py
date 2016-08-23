# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.schemas.functions.tests \
    import utils as func_utils
from . import utils as event_trigger_utils


class EventTriggerAddTestCase(BaseTestGenerator):
    """ This class will add new event trigger under schema node. """

    scenarios = [
        # Fetching default URL for event trigger node.
        ('Fetch Event Trigger Node URL',
         dict(url='/browser/event_trigger/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
              This function perform the following tasks:
              1. Add and connect to the test server(s)
              2. Add database(s) connected to server(s)
              3. Add schemas to connected database(s)
              4. Add trigger function(s) to schema(s)

             :return: None
        """

        # Add the server
        server_utils.add_server(cls.tester)

        # Connect to servers
        cls.server_connect_response, cls.server_group, cls.server_ids = \
            server_utils.connect_server(cls.tester)

        if len(cls.server_connect_response) == 0:
            raise Exception("No Server(s) connected to add the database!!!")

        # Add databases to connected servers
        database_utils.add_database(cls.tester, cls.server_connect_response,
                                    cls.server_ids)

        schema_utils.add_schemas(cls.tester)

        func_utils.add_trigger_function(cls.tester, cls.server_connect_response,
                                        cls.server_ids)

    def runTest(self):
        """ This function will add event trigger under database node. """
        event_trigger_utils.add_event_trigger(self.tester)

    @classmethod
    def tearDownClass(cls):
        """This function deletes the added schema, database, server and parent
        id file

        :return: None
        """

        event_trigger_utils.delete_event_trigger(cls.tester)
        func_utils.delete_trigger_function(cls.tester)
        schema_utils.delete_schema(cls.tester)
        database_utils.delete_database(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
