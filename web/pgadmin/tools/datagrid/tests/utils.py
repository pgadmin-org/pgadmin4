##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import os
import json

file_name = os.path.basename(__file__)
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/datagrid_test_data.json") as data_file:
    test_cases = json.load(data_file)


def _init_query_tool(self, trans_id, server_group, server_id, db_id):
    QUERY_TOOL_INIT_URL = '/datagrid/initialize/query_tool'

    qt_init = self.tester.post(
        '{0}/{1}/{2}/{3}/{4}'.format(
            QUERY_TOOL_INIT_URL,
            trans_id,
            server_group,
            server_id,
            db_id
        ),
        follow_redirects=True
    )
    assert qt_init.status_code == 200
    qt_init = json.loads(qt_init.data.decode('utf-8'))
    return qt_init
