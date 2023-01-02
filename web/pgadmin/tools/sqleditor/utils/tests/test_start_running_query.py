##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask import Response
import simplejson as json

from pgadmin.tools.sqleditor.utils.start_running_query import StartRunningQuery
from pgadmin.utils.exception import ConnectionLost, SSHTunnelConnectionLost
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import patch, MagicMock

get_driver_exception = Exception('get_driver exception')
get_connection_lost_exception = Exception('Unable to connect to server')


class StartRunningQueryTest(BaseTestGenerator):
    """
    Check that the start_running_query method works as intended
    """

    scenarios = [
        ('When gridData is not present in the session, it returns an error',
         dict(
             function_parameters=dict(
                 sql=dict(sql='some sql', explain_plan=None),
                 trans_id=123,
                 http_session=dict()
             ),
             pickle_load_return=None,
             get_driver_exception=False,
             get_connection_lost_exception=False,
             manager_connection_exception=None,

             is_connected_to_server=False,
             connection_connect_return=None,
             execute_async_return_value=None,
             is_begin_required=False,
             is_rollback_required=False,
             apply_explain_plan_wrapper_if_needed_return_value='some sql',

             expect_make_json_response_to_have_been_called_with=dict(
                 success=0,
                 errormsg='Transaction ID not found in the session.',
                 info='DATAGRID_TRANSACTION_REQUIRED',
                 status=404,
             ),
             expect_internal_server_error_called_with=None,
             expected_logger_error=None,
             expect_execute_void_called_with='some sql',
         )),
        ('When transactionId is not present in the gridData, '
         'it returns an error',
         dict(
             function_parameters=dict(
                 sql=dict(sql='some sql', explain_plan=None),
                 trans_id=123,
                 http_session=dict(gridData=dict())
             ),
             pickle_load_return=None,
             get_driver_exception=False,
             get_connection_lost_exception=False,
             manager_connection_exception=None,

             is_connected_to_server=False,
             connection_connect_return=None,
             execute_async_return_value=None,
             is_begin_required=False,
             is_rollback_required=False,
             apply_explain_plan_wrapper_if_needed_return_value='some sql',

             expect_make_json_response_to_have_been_called_with=dict(
                 success=0,
                 errormsg='Transaction ID not found in the session.',
                 info='DATAGRID_TRANSACTION_REQUIRED',
                 status=404,
             ),
             expect_internal_server_error_called_with=None,
             expected_logger_error=None,
             expect_execute_void_called_with='some sql',
         )),
        ('When the command information for the transaction '
         'cannot be retrieved, '
         'it returns an error',
         dict(
             function_parameters=dict(
                 sql=dict(sql='some sql', explain_plan=None),
                 trans_id=123,
                 http_session=dict(gridData={'123': dict(command_obj='')})
             ),
             pickle_load_return=None,
             get_driver_exception=False,
             get_connection_lost_exception=False,
             manager_connection_exception=None,

             is_connected_to_server=False,
             connection_connect_return=None,
             execute_async_return_value=None,
             is_begin_required=False,
             is_rollback_required=False,
             apply_explain_plan_wrapper_if_needed_return_value='some sql',

             expect_make_json_response_to_have_been_called_with=dict(
                 data=dict(
                     status=False,
                     result='Either transaction object or session object '
                            'not found.',
                     can_edit=False,
                     can_filter=False,
                     notifies=None,
                     transaction_status=None
                 )
             ),
             expect_internal_server_error_called_with=None,
             expected_logger_error=None,
             expect_execute_void_called_with='some sql',
         )),
        ('When exception happens while retrieving the database driver, '
         'it returns an error',
         dict(
             function_parameters=dict(
                 sql=dict(sql='some sql', explain_plan=None),
                 trans_id=123,
                 http_session=dict(gridData={'123': dict(command_obj='')})
             ),
             pickle_load_return=MagicMock(conn_id=1,
                                          update_fetched_row_cnt=MagicMock()),
             get_driver_exception=True,
             get_connection_lost_exception=False,
             manager_connection_exception=None,

             is_connected_to_server=False,
             connection_connect_return=None,
             execute_async_return_value=None,
             is_begin_required=False,
             is_rollback_required=False,
             apply_explain_plan_wrapper_if_needed_return_value='some sql',

             expect_make_json_response_to_have_been_called_with=None,
             expect_internal_server_error_called_with=dict(
                 errormsg='get_driver exception'
             ),
             expected_logger_error=get_driver_exception,
             expect_execute_void_called_with='some sql',
         )),
        ('When ConnectionLost happens while retrieving the '
         'database connection, '
         'it returns an error',
         dict(
             function_parameters=dict(
                 sql=dict(sql='some sql', explain_plan=None),
                 trans_id=123,
                 http_session=dict(gridData={'123': dict(command_obj='')})
             ),
             pickle_load_return=MagicMock(
                 conn_id=1,
                 update_fetched_row_cnt=MagicMock()
             ),
             get_driver_exception=False,
             get_connection_lost_exception=False,
             manager_connection_exception=ConnectionLost('1', '2', '3'),

             is_connected_to_server=False,
             connection_connect_return=None,
             execute_async_return_value=None,
             is_begin_required=False,
             is_rollback_required=False,
             apply_explain_plan_wrapper_if_needed_return_value='some sql',

             expect_make_json_response_to_have_been_called_with=None,
             expect_internal_server_error_called_with=None,
             expected_logger_error=None,
             expect_execute_void_called_with='some sql',
         )),
        ('When SSHTunnelConnectionLost happens while retrieving the '
         'database connection, '
         'it returns an error',
         dict(
             function_parameters=dict(
                 sql=dict(sql='some sql', explain_plan=None),
                 trans_id=123,
                 http_session=dict(gridData={'123': dict(command_obj='')})
             ),
             pickle_load_return=MagicMock(
                 conn_id=1,
                 update_fetched_row_cnt=MagicMock()
             ),
             get_driver_exception=False,
             get_connection_lost_exception=False,
             manager_connection_exception=SSHTunnelConnectionLost('1.1.1.1'),

             is_connected_to_server=False,
             connection_connect_return=None,
             execute_async_return_value=None,
             is_begin_required=False,
             is_rollback_required=False,
             apply_explain_plan_wrapper_if_needed_return_value='some sql',

             expect_make_json_response_to_have_been_called_with=None,
             expect_internal_server_error_called_with=None,
             expected_logger_error=None,
             expect_execute_void_called_with='some sql',
         )),
        ('When is not connected to the server and fails to connect, '
         'it returns an error',
         dict(
             function_parameters=dict(
                 sql=dict(sql='some sql', explain_plan=None),
                 trans_id=123,
                 http_session=dict(gridData={'123': dict(command_obj='')})
             ),
             pickle_load_return=MagicMock(
                 conn_id=1,
                 update_fetched_row_cnt=MagicMock()
             ),
             get_driver_exception=False,
             get_connection_lost_exception=True,
             manager_connection_exception=None,

             is_connected_to_server=False,
             connection_connect_return=[False,
                                        'Unable to connect to server'],
             execute_async_return_value=None,
             is_begin_required=False,
             is_rollback_required=False,
             apply_explain_plan_wrapper_if_needed_return_value='some sql',

             expect_make_json_response_to_have_been_called_with=None,
             expect_internal_server_error_called_with=dict(
                 errormsg='Unable to connect to server'
             ),
             expected_logger_error=get_connection_lost_exception,
             expect_execute_void_called_with='some sql',
         )),
        ('When server is connected and start query async request, '
         'it returns an success message',
         dict(
             function_parameters=dict(
                 sql=dict(sql='some sql', explain_plan=None),
                 trans_id=123,
                 http_session=dict(gridData={'123': dict(command_obj='')})
             ),
             pickle_load_return=MagicMock(
                 conn_id=1,
                 update_fetched_row_cnt=MagicMock(),
                 set_connection_id=MagicMock(),
                 auto_commit=True,
                 auto_rollback=False,
                 can_edit=lambda: True,
                 can_filter=lambda: True
             ),
             get_driver_exception=False,
             get_connection_lost_exception=False,
             manager_connection_exception=None,

             is_connected_to_server=True,
             connection_connect_return=None,
             execute_async_return_value=[True,
                                         'async function result output'],
             is_begin_required=False,
             is_rollback_required=False,
             apply_explain_plan_wrapper_if_needed_return_value='some sql',

             expect_make_json_response_to_have_been_called_with=dict(
                 data=dict(
                     status=True,
                     result='async function result output',
                     can_edit=True,
                     can_filter=True,
                     notifies=None,
                     transaction_status=None
                 )
             ),
             expect_internal_server_error_called_with=None,
             expected_logger_error=None,
             expect_execute_void_called_with='some sql',
         )),
        ('When server is connected and start query async request and '
         'begin is required, '
         'it returns an success message',
         dict(
             function_parameters=dict(
                 sql=dict(sql='some sql', explain_plan=None),
                 trans_id=123,
                 http_session=dict(gridData={'123': dict(command_obj='')})
             ),
             pickle_load_return=MagicMock(
                 conn_id=1,
                 update_fetched_row_cnt=MagicMock(),
                 set_connection_id=MagicMock(),
                 auto_commit=True,
                 auto_rollback=False,
                 can_edit=lambda: True,
                 can_filter=lambda: True
             ),
             get_driver_exception=False,
             get_connection_lost_exception=False,
             manager_connection_exception=None,

             is_connected_to_server=True,
             connection_connect_return=None,
             execute_async_return_value=[True,
                                         'async function result output'],
             is_begin_required=True,
             is_rollback_required=False,
             apply_explain_plan_wrapper_if_needed_return_value='some sql',

             expect_make_json_response_to_have_been_called_with=dict(
                 data=dict(
                     status=True,
                     result='async function result output',
                     can_edit=True,
                     can_filter=True,
                     notifies=None,
                     transaction_status=None
                 )
             ),
             expect_internal_server_error_called_with=None,
             expected_logger_error=None,
             expect_execute_void_called_with='some sql',
         )),
        ('When server is connected and start query async request and '
         'rollback is required, '
         'it returns an success message',
         dict(
             function_parameters=dict(
                 sql=dict(sql='some sql', explain_plan=None),
                 trans_id=123,
                 http_session=dict(gridData={'123': dict(command_obj='')})
             ),
             pickle_load_return=MagicMock(
                 conn_id=1,
                 update_fetched_row_cnt=MagicMock(),
                 set_connection_id=MagicMock(),
                 auto_commit=True,
                 auto_rollback=False,
                 can_edit=lambda: True,
                 can_filter=lambda: True
             ),
             get_driver_exception=False,
             get_connection_lost_exception=False,
             manager_connection_exception=None,

             is_connected_to_server=True,
             connection_connect_return=None,
             execute_async_return_value=[True,
                                         'async function result output'],
             is_begin_required=False,
             is_rollback_required=True,
             apply_explain_plan_wrapper_if_needed_return_value='some sql',

             expect_make_json_response_to_have_been_called_with=dict(
                 data=dict(
                     status=True,
                     result='async function result output',
                     can_edit=True,
                     can_filter=True,
                     notifies=None,
                     transaction_status=None
                 )
             ),
             expect_internal_server_error_called_with=None,
             expected_logger_error=None,
             expect_execute_void_called_with='some sql',
         )),
        ('When server is connected and start query async request with '
         'explain plan wrapper, '
         'it returns an success message',
         dict(
             function_parameters=dict(
                 sql=dict(sql='some sql', explain_plan=None),
                 trans_id=123,
                 http_session=dict(gridData={'123': dict(command_obj='')})
             ),
             pickle_load_return=MagicMock(
                 conn_id=1,
                 update_fetched_row_cnt=MagicMock(),
                 set_connection_id=MagicMock(),
                 auto_commit=True,
                 auto_rollback=False,
                 can_edit=lambda: True,
                 can_filter=lambda: True
             ),
             get_driver_exception=False,
             get_connection_lost_exception=False,
             manager_connection_exception=None,

             is_connected_to_server=True,
             connection_connect_return=None,
             execute_async_return_value=[True,
                                         'async function result output'],
             is_begin_required=False,
             is_rollback_required=True,
             apply_explain_plan_wrapper_if_needed_return_value='EXPLAIN '
                                                               'PLAN some sql',

             expect_make_json_response_to_have_been_called_with=dict(
                 data=dict(
                     status=True,
                     result='async function result output',
                     can_edit=True,
                     can_filter=True,
                     notifies=None,
                     transaction_status=None
                 )
             ),
             expect_internal_server_error_called_with=None,
             expected_logger_error=None,
             expect_execute_void_called_with='EXPLAIN PLAN some sql',
         )),
    ]

    @patch('pgadmin.tools.sqleditor.utils.start_running_query'
           '.apply_explain_plan_wrapper_if_needed')
    @patch('pgadmin.tools.sqleditor.utils.start_running_query'
           '.make_json_response')
    @patch('pgadmin.tools.sqleditor.utils.start_running_query.pickle')
    @patch('pgadmin.tools.sqleditor.utils.start_running_query.get_driver')
    @patch('pgadmin.tools.sqleditor.utils.start_running_query'
           '.internal_server_error')
    @patch('pgadmin.tools.sqleditor.utils.start_running_query'
           '.update_session_grid_transaction')
    def runTest(self, update_session_grid_transaction_mock,
                internal_server_error_mock, get_driver_mock, pickle_mock,
                make_json_response_mock,
                apply_explain_plan_wrapper_if_needed_mock):
        """Check correct function is called to handle to run query."""
        self.connection = None

        self.loggerMock = MagicMock(error=MagicMock())
        expected_response = Response(
            response=json.dumps({'errormsg': 'some value'}))
        make_json_response_mock.return_value = expected_response
        if self.expect_internal_server_error_called_with is not None:
            internal_server_error_mock.return_value = expected_response
        pickle_mock.loads.return_value = self.pickle_load_return
        blueprint_mock = MagicMock()

        # Save value for the later use
        self.is_begin_required_for_sql_query = \
            StartRunningQuery.is_begin_required_for_sql_query
        self.is_rollback_statement_required = \
            StartRunningQuery.is_rollback_statement_required

        if self.is_begin_required:
            StartRunningQuery.is_begin_required_for_sql_query = MagicMock(
                return_value=True
            )
        else:
            StartRunningQuery.is_begin_required_for_sql_query = MagicMock(
                return_value=False
            )
        if self.is_rollback_required:
            StartRunningQuery.is_rollback_statement_required = MagicMock(
                return_value=True
            )
        else:
            StartRunningQuery.is_rollback_statement_required = MagicMock(
                return_value=False
            )

        apply_explain_plan_wrapper_if_needed_mock.return_value = \
            self.apply_explain_plan_wrapper_if_needed_return_value

        manager = self.__create_manager()
        if self.get_driver_exception:
            get_driver_mock.side_effect = get_driver_exception
        elif self.get_connection_lost_exception:
            get_driver_mock.side_effect = get_connection_lost_exception
        else:
            get_driver_mock.return_value = MagicMock(
                connection_manager=lambda session_id: manager)

        try:
            result = StartRunningQuery(
                blueprint_mock,
                self.loggerMock
            ).execute(
                **self.function_parameters
            )
            if self.manager_connection_exception is not None:
                self.fail(
                    'Exception: "' + str(
                        self.manager_connection_exception
                    ) +
                    '" excepted but not raised'
                )

            self.assertEqual(result, expected_response)

        except AssertionError:
            raise
        except Exception as exception:
            self.assertEqual(self.manager_connection_exception, exception)

        self.__mock_assertions(internal_server_error_mock,
                               make_json_response_mock)
        if self.is_connected_to_server:
            apply_explain_plan_wrapper_if_needed_mock.assert_called_with(
                manager, self.function_parameters['sql'])

    def __create_manager(self):
        self.connection = MagicMock(
            connected=lambda: self.is_connected_to_server,
            connect=MagicMock(),
            execute_async=MagicMock(),
            execute_void=MagicMock(),
            get_notifies=MagicMock(),
            transaction_status=MagicMock(),
        )
        self.connection.connect.return_value = self.connection_connect_return
        self.connection.get_notifies.return_value = None
        self.connection.transaction_status.return_value = None
        self.connection.execute_async.return_value = \
            self.execute_async_return_value
        if self.manager_connection_exception is None:
            def connection_function(
                did,
                conn_id,
                use_binary_placeholder,
                array_to_string,
                auto_reconnect
            ):
                return self.connection

            manager = MagicMock(
                connection=connection_function
            )

        else:
            manager = MagicMock()
            manager.connection.side_effect = self.manager_connection_exception

        return manager

    def __mock_assertions(self, internal_server_error_mock,
                          make_json_response_mock):
        if self.expect_make_json_response_to_have_been_called_with is not None:
            make_json_response_mock.assert_called_with(
                **self.expect_make_json_response_to_have_been_called_with)
        else:
            make_json_response_mock.assert_not_called()
        if self.expect_internal_server_error_called_with is not None:
            internal_server_error_mock.assert_called_with(
                **self.expect_internal_server_error_called_with)
        else:
            internal_server_error_mock.assert_not_called()
        if self.execute_async_return_value is not None:
            self.connection.execute_async.assert_called_with(
                self.expect_execute_void_called_with)
        else:
            self.connection.execute_async.assert_not_called()

        if self.expected_logger_error is not None:
            self.loggerMock.error.assert_called_with(
                self.expected_logger_error)
        else:
            self.loggerMock.error.assert_not_called()

        if self.is_begin_required:
            self.connection.execute_void.assert_called_with('BEGIN;')
        elif not self.is_rollback_required:
            self.connection.execute_void.assert_not_called()
        if self.is_rollback_required:
            self.connection.execute_void.assert_called_with('ROLLBACK;')
        elif not self.is_begin_required:
            self.connection.execute_void.assert_not_called()

    def tearDown(self):
        #  Reset methods to the original state
        StartRunningQuery.is_begin_required_for_sql_query = \
            staticmethod(self.is_begin_required_for_sql_query)
        StartRunningQuery.is_rollback_statement_required = \
            staticmethod(self.is_rollback_statement_required)
