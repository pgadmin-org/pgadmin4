##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression.test_setup import config_data
import json
import config

test_user_details = None
if config.SERVER_MODE:
    test_user_details = config_data['pgAdmin4_test_non_admin_credentials']

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/preferences_test_data.json") as data_file:
    test_cases = json.load(data_file)


class GetPreferencesTest(BaseTestGenerator):
    """
    This class will fetch all Preferences
    """

    scenarios = utils.generate_scenarios('get_preferences', test_cases)

    def runTest(self):
        self.get_preferences()

    def get_preferences(self):
        response = self.tester.get(self.url,
                                   content_type='html/json')
        self.assertTrue(response.status_code, 200)
