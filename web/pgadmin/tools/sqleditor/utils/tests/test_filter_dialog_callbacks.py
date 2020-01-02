#######################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Apply Explain plan wrapper to sql object."""
from pgadmin.utils.ajax import make_json_response, internal_server_error
from pgadmin.tools.sqleditor.utils.filter_dialog import FilterDialog
from pgadmin.utils.route import BaseTestGenerator

TX_ID_ERROR_MSG = 'Transaction ID not found in the session.'
FAILED_TX_MSG = 'Failed to update the data on server.'


class MockRequest(object):
    "To mock request object"
    def __init__(self):
        self.data = None
        self.args = "Test data",


class StartRunningDataSortingTest(BaseTestGenerator):
    """
    Check that the DataSorting methods works as
    intended
    """
    scenarios = [
        ('When we do not find Transaction ID in session in get', dict(
            input_parameters=(None, TX_ID_ERROR_MSG, None, None, None),
            expected_return_response={
                'success': 0,
                'errormsg': TX_ID_ERROR_MSG,
                'info': 'DATAGRID_TRANSACTION_REQUIRED',
                'status': 404
            },
            type='get'
        )),
        ('When we pass all the values as None in get', dict(
            input_parameters=(None, None, None, None, None),
            expected_return_response={
                'data': {
                    'status': False,
                    'msg': None,
                    'result': {
                        'data_sorting': None,
                        'column_list': []
                    }
                }
            },
            type='get'
        )),

        ('When we do not find Transaction ID in session in save', dict(
            input_arg_parameters=(None, TX_ID_ERROR_MSG, None, None, None),
            input_kwarg_parameters={
                'trans_id': None,
                'request': MockRequest()
            },
            expected_return_response={
                'success': 0,
                'errormsg': TX_ID_ERROR_MSG,
                'info': 'DATAGRID_TRANSACTION_REQUIRED',
                'status': 404
            },
            type='save'
        )),

        ('When we pass all the values as None in save', dict(
            input_arg_parameters=(None, None, None, None, None),
            input_kwarg_parameters={
                'trans_id': None,
                'request': MockRequest()
            },
            expected_return_response={
                'status': 500,
                'success': 0,
                'errormsg': FAILED_TX_MSG

            },
            type='save'
        ))
    ]

    def runTest(self):
        expected_response = make_json_response(
            **self.expected_return_response
        )
        if self.type == 'get':
            result = FilterDialog.get(*self.input_parameters)
            self.assertEquals(
                result.status_code, expected_response.status_code
            )
        else:
            result = FilterDialog.save(
                *self.input_arg_parameters, **self.input_kwarg_parameters
            )
            self.assertEquals(
                result.status_code, expected_response.status_code
            )
