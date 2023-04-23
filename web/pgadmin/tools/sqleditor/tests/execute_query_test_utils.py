##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

# Utility functions used by tests


# Executes a query and polls for the results, then returns them
def execute_query(tester, query, start_query_tool_url, poll_url):
    # Start query tool and execute sql
    response = tester.post(start_query_tool_url,
                           data=json.dumps({"sql": query}),
                           content_type='html/json')

    if response.status_code != 200:
        return False, None

    # Poll for results
    return poll_for_query_results(tester=tester, poll_url=poll_url)


# Polls for the result of an executed query
def poll_for_query_results(tester, poll_url):
    # Poll for results until they are successful
    while True:
        response = tester.get(poll_url)
        if response.status_code != 200:
            return False, None
        response_data = json.loads(response.data.decode('utf-8'))
        status = response_data['data']['status']
        if status == 'Success':
            return True, response_data
        elif status == 'NotConnected' or status == 'Cancel':
            return False, None
