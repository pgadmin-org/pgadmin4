##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import os
import json
import traceback

from regression.python_test_utils import test_utils as utils

# Load test data from json file.
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/constraints_test_data.json") as data_file:
    test_cases = json.load(data_file)


def api_get(self):
    return self.tester.get("{0}{1}/{2}/{3}/{4}/{5}/".
                           format(self.url, utils.SERVER_GROUP,
                                  self.server_id, self.db_id,
                                  self.schema_id, self.table_id),
                           content_type='html/json',
                           follow_redirects=True)


def api_delete(self):
    return self.tester.delete("{0}{1}/{2}/{3}/{4}/{5}/".
                              format(self.url, utils.SERVER_GROUP,
                                     self.server_id, self.db_id,
                                     self.schema_id, self.table_id),
                              content_type='html/json',
                              data=json.dumps(self.data),
                              follow_redirects=True)


def verify_constraint(server, db_name, constraint_name):
    """
    This function verifies check constraint constraint exist or not.
    :param server: server details
    :type server: dict
    :param db_name: database name
    :type db_name: str
    :param check_constraint_name: constraint name
    :type check_constraint_name: str
    :return chk_constraint_record: check constraint record from database
    :rtype: tuple
    """
    try:
        connection = utils.get_db_connection(db_name,
                                             server['username'],
                                             server['db_password'],
                                             server['host'],
                                             server['port'])
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            "SELECT oid FROM pg_catalog.pg_constraint where conname='%s'" %
            constraint_name)
        chk_constraint_record = pg_cursor.fetchone()
        connection.close()
        return chk_constraint_record
    except Exception:
        traceback.print_exc(file=sys.stderr)
