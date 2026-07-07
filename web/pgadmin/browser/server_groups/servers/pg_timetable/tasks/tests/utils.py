##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import json
from urllib.parse import urlencode

from regression.python_test_utils import test_utils as utils

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/tasks_test_data.json") as data_file:
    test_cases = json.load(data_file)


def api_create(self):
    return self.tester.post('{0}{1}/{2}/{3}/'.
                            format(self.url, utils.SERVER_GROUP,
                                   self.server_id, self.chain_id),
                            data=json.dumps(self.data),
                            content_type='html/json')


def api_delete(self, task_id=None):
    if task_id is None:
        task_id = self.task_id
    return self.tester.delete('{0}{1}/{2}/{3}/{4}'.
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.chain_id,
                                     task_id),
                              data=json.dumps(self.data),
                              content_type='html/json')


def api_put(self):
    return self.tester.put('{0}{1}/{2}/{3}/{4}'.
                           format(self.url, utils.SERVER_GROUP, self.server_id,
                                  self.chain_id, self.task_id),
                           data=json.dumps(self.data),
                           content_type='html/json')


def api_get(self, task_id=None):
    if task_id is None:
        task_id = self.task_id
    return self.tester.get('{0}{1}/{2}/{3}/{4}'.
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.chain_id,
                                  task_id),
                           content_type='html/json')


def api_get_msql(self, url_encode_data, task_id=None):
    if task_id is None:
        task_id = '/' + str(self.task_id)
    return self.tester.get("{0}{1}/{2}/{3}{4}?{5}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.chain_id,
                                  task_id,
                                  urlencode(url_encode_data)),
                           data=json.dumps(self.data),
                           follow_redirects=True)


def api_get_sql(self):
    return self.tester.get('{0}{1}/{2}/{3}/{4}'.
                           format(self.url.replace('/obj/', '/sql/'),
                                  utils.SERVER_GROUP,
                                  self.server_id, self.chain_id,
                                  self.task_id),
                           content_type='html/json')


def api_get_stats(self):
    return self.tester.get('{0}{1}/{2}/{3}/{4}'.
                           format(self.url.replace('/obj/', '/stats/'),
                                  utils.SERVER_GROUP,
                                  self.server_id, self.chain_id,
                                  self.task_id),
                           content_type='html/json')
