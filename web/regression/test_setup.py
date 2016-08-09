#############################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################

import json
import os

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))

# with open(CURRENT_PATH + '/test_config.json') as data_file:
#     config_data = json.load(data_file)
#
# with open(CURRENT_PATH + '/test_advanced_config.json') as data_file:
#     advanced_config_data = json.load(data_file)

try:
    with open(CURRENT_PATH + '/test_config.json') as data_file:
        config_data = json.load(data_file)
except:
    with open(CURRENT_PATH + '/test_config.json.in') as data_file:
        config_data = json.load(data_file)

try:
    with open(CURRENT_PATH + '/test_advanced_config.json') as data_file:
        advanced_config_data = json.load(data_file)
except:
    with open(CURRENT_PATH + '/test_advanced_config.json.in') as data_file:
        advanced_config_data = json.load(data_file)

pickle_path = os.path.join(CURRENT_PATH, 'parent_id.pkl')
