##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from regression.python_test_utils import test_utils as utils


class SearchObjectsApiTypes(BaseTestGenerator):
    """ This class will test types API of search objects. """
    scenarios = [
        # Fetching default URL for schema node.
        ('Types API URL', dict(url='/search_objects/types'))
    ]

    def runTest(self):
        database_info = parent_node_dict["database"][-1]
        server_id = database_info["server_id"]

        db_id = database_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 server_id,
                                                 db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database to add the schema.")

        url = self.url + '/' + str(server_id) + '/' + str(db_id)
        response = self.tester.get(url)
        self.assertEquals(response.status_code, 200)

        # repsonse data should be dict
        response_data = json.loads(response.data.decode('utf-8'))['data']
        self.assertEquals(type(response_data), dict)

        # response data key values should not be None
        for key, value in response_data.items():
            self.assertIsNotNone(value, 'Key {0} has value None'.format(key))
