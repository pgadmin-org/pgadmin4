##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import json
from urllib.parse import urlencode

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from regression.python_test_utils import test_utils as utils


class SearchObjectsApiSearch(BaseTestGenerator):
    """ This class will test search API of search objects. """
    scenarios = [
        ('Search with all types', dict(text='emp', type='all', singles=False)),
        ('Search with None types', dict(text='emp', type=None, singles=False)),
        ('Search for all single types',
         dict(text='emp', type=None, singles=True)),
    ]

    def runFor(self, text=None, type=None):
        url_params = dict(
            text=text
        )
        if type is not None:
            url_params['type'] = type

        url_params = urlencode(url_params)
        response = self.tester.get(self.base_url + '?' + url_params)

        self.assertEqual(response.status_code, 200)

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

        self.base_url = '/search_objects/search/' \
                        + str(server_id) + '/' + str(db_id)

        if not self.singles:
            self.runFor(text=self.text, type=self.type)
        else:
            # test for all the node types individually
            types_url = '/search_objects/types/' +\
                        str(server_id) + '/' + str(db_id)
            response = self.tester.get(types_url)
            self.assertEqual(response.status_code, 200)
            types_data = json.loads(response.data.decode('utf-8'))['data']

            for a_type in types_data:
                print('Running search for type {0}'.format(a_type),
                      file=sys.stderr)
                self.runFor(text=self.text, type=a_type)
