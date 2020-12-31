import sys
import traceback
import os
import json
from urllib.parse import urlencode

from regression.python_test_utils import test_utils as utils

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/schedules_test_data.json") as data_file:
    test_cases = json.load(data_file)


# api methods
def api_create(self):
    return self.tester.post('{0}{1}/{2}/{3}/'.
                            format(self.url, utils.SERVER_GROUP,
                                   self.server_id, self.job_id),
                            data=json.dumps(self.data),
                            content_type='html/json')


def api_delete(self, schedule_id=None):
    if schedule_id is None:
        schedule_id = self.schedule_id
    return self.tester.delete('{0}{1}/{2}/{3}/{4}'.
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.job_id,
                                     schedule_id),
                              data=json.dumps(self.data),
                              content_type='html/json')


def api_put(self):
    return self.tester.put('{0}{1}/{2}/{3}/{4}'.
                           format(self.url, utils.SERVER_GROUP, self.server_id,
                                  self.job_id, self.schedule_id),
                           data=json.dumps(self.data),
                           content_type='html/json')


def api_get(self, schedule_id=None):
    if schedule_id is None:
        schedule_id = self.schedule_id
    return self.tester.get('{0}{1}/{2}/{3}/{4}'.
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.job_id,
                                  schedule_id),
                           content_type='html/json')


def api_get_msql(self, url_encode_data, schedule_id=None):
    if schedule_id is None:
        schedule_id = '/' + str(self.schedule_id)
    return self.tester.get("{0}{1}/{2}/{3}{4}?{5}".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.job_id,
                                  schedule_id,
                                  urlencode(url_encode_data)),
                           data=json.dumps(self.data),
                           follow_redirects=True)
