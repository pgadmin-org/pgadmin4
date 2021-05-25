import os
import json

CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/psql_test_data.json") as data_file:
    test_cases = json.load(data_file)
