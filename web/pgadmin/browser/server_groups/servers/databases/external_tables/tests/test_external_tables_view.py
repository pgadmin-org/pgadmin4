##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os

from pgadmin.browser.server_groups.servers.databases.external_tables import \
    ExternalTablesView
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import MagicMock, patch


class TestExternalTablesView(BaseTestGenerator):
    scenarios = [
        ('#check_precondition When executing any http call, '
         'it saves stores the connection and the manager in the class object',
         dict(
             test_type='check-precondition',
             function_parameters=dict(
                 server_group_id=0,
                 server_id=1,
                 database_id=2,
             ),
             manager=MagicMock(),
             connection=MagicMock(execute_2darray=MagicMock()),
             execute_2darray_return_value=(True, dict(rows=[])),
             expected_manager_connection_to_be_called_with=dict(
                 did=2
             ),
         )),
        ('#nodes When retrieving the children of external tables, '
         'it return no child '
         'and status 200',
         dict(
             test_type='children',
             function_parameters=dict(
                 server_group_id=0,
                 server_id=1,
                 database_id=2,
             ),
             manager=MagicMock(server_type='gpdb', sversion=80323),
             connection=MagicMock(execute_2darray=MagicMock()),
             execute_2darray_return_value=(True, dict(rows=[])),

             expected_make_json_response_called_with=dict(data=[]),
         )),
        ('#nodes When retrieving the nodes '
         'and the database does not have external tables, '
         'it return no child nodes '
         'and status 200',
         dict(
             test_type='nodes',
             function_parameters=dict(
                 server_group_id=0,
                 server_id=1,
                 database_id=2,
             ),
             manager=MagicMock(server_type='gpdb', sversion=80323),
             connection=MagicMock(execute_2darray=MagicMock()),
             execute_2darray_return_value=(True, dict(rows=[])),

             expect_render_template_called_with=os.path.join(
                 'sql/#gpdb#80323#', 'list.sql'),
             expected_make_json_response_called_with=dict(
                 data=[],
                 status=200
             ),
         )),
        ('#nodes When retrieving the nodes '
         'and an error happens while executing the query, '
         'it return an internal server error '
         'and status 500',
         dict(
             test_type='nodes',
             function_parameters=dict(
                 server_group_id=0,
                 server_id=1,
                 database_id=2,
             ),

             manager=MagicMock(server_type='gpdb', sversion=80323),
             connection=MagicMock(execute_2darray=MagicMock()),
             execute_2darray_return_value=(False, 'Some error message'),

             expect_render_template_called_with=os.path.join(
                 'sql/#gpdb#80323#', 'list.sql'),
             expected_internal_server_error_called_with=dict(
                 errormsg='Some error message'
             ),
         )),
        ('#nodes When retrieving the nodes '
         'and the database has 2 external tables, '
         'it return 2 child nodes '
         'and status 200',
         dict(
             test_type='nodes',
             function_parameters=dict(
                 server_group_id=0,
                 server_id=1,
                 database_id=2,
             ),

             manager=MagicMock(server_type='gpdb', sversion=80323),
             connection=MagicMock(execute_2darray=MagicMock()),
             execute_2darray_return_value=(True, dict(
                 rows=[
                     dict(
                         oid='oid1',
                         name='table_one'
                     ),
                     dict(
                         oid='oid2',
                         name='table_two'
                     ),
                 ]
             )),

             expect_render_template_called_with=os.path.join(
                 'sql/#gpdb#80323#', 'list.sql'),
             expected_make_json_response_called_with=dict(
                 data=[
                     {
                         'id': "external_table/oid1",
                         'label': 'table_one',
                         'icon': 'icon-external_table',
                         'inode': False,
                         '_type': 'external_table',
                         '_id': 'oid1',
                         '_pid': 2,
                         'module': 'pgadmin.node.external_table'
                     },
                     {
                         'id': "external_table/oid2",
                         'label': 'table_two',
                         'icon': 'icon-external_table',
                         'inode': False,
                         '_type': 'external_table',
                         '_id': 'oid2',
                         '_pid': 2,
                         'module': 'pgadmin.node.external_table'
                     }
                 ],
                 status=200
             ),
         )),
        ('#node When retrieving the information about 1 external table '
         'and an error happens while executing the query, '
         'it return an internal server error '
         'and status 500',
         dict(
             test_type='node',
             function_parameters=dict(
                 server_group_id=0,
                 server_id=1,
                 database_id=2,
                 external_table_id=11
             ),

             manager=MagicMock(server_type='gpdb', sversion=80323),
             connection=MagicMock(execute_2darray=MagicMock()),
             execute_2darray_return_value=(False, 'Some error message'),

             expect_render_template_called_with=dict(
                 template_name_or_list=os.path.join(
                     'sql/#gpdb#80323#', 'node.sql'),
                 external_table_id=11
             ),
             expected_internal_server_error_called_with=dict(
                 errormsg='Some error message'
             ),
         )),
        ('#node When retrieving the information about 1 external table '
         'and table does not exist, '
         'it return an error message '
         'and status 404',
         dict(
             test_type='node',
             function_parameters=dict(
                 server_group_id=0,
                 server_id=1,
                 database_id=2,
                 external_table_id=11
             ),

             manager=MagicMock(server_type='gpdb', sversion=80323),
             connection=MagicMock(execute_2darray=MagicMock()),
             execute_2darray_return_value=(True, dict(rows=[])),

             expect_render_template_called_with=dict(
                 template_name_or_list=os.path.join(
                     'sql/#gpdb#80323#', 'node.sql'),
                 external_table_id=11
             ),
             expected_make_json_response_called_with=dict(
                 data='Could not find the external table.',
                 status=404
             ),
         )),
        ('#nodes When retrieving the information about 1 external table '
         'and the table exists, '
         'it return external node information '
         'and status 200',
         dict(
             test_type='node',
             function_parameters=dict(
                 server_group_id=0,
                 server_id=1,
                 database_id=2,
                 external_table_id=11
             ),

             manager=MagicMock(server_type='gpdb', sversion=80323),
             connection=MagicMock(execute_2darray=MagicMock()),
             execute_2darray_return_value=(True, dict(
                 rows=[
                     dict(
                         oid='oid1',
                         name='table_one'
                     ),
                     dict(
                         oid='oid2',
                         name='table_two'
                     ),
                 ]
             )),

             expect_render_template_called_with=dict(
                 template_name_or_list=os.path.join(
                     'sql/#gpdb#80323#', 'node.sql'),
                 external_table_id=11
             ),
             expected_make_json_response_called_with=dict(
                 data={
                     'id': "external_table/oid1",
                     'label': 'table_one',
                     'icon': 'icon-external_table',
                     'inode': False,
                     '_type': 'external_table',
                     '_id': 'oid1',
                     '_pid': 2,
                     'module': 'pgadmin.node.external_table'
                 },
                 status=200
             ),
         )),
        ('#properties When retrieving the properties of a external table '
         'and the table exists, '
         'it return the properties '
         'and status 200',
         dict(
             test_type='properties',
             function_parameters=dict(
                 server_group_id=0,
                 server_id=1,
                 database_id=2,
                 external_table_id=11
             ),

             manager=MagicMock(server_type='gpdb', sversion=80323),
             connection=MagicMock(execute_2darray=MagicMock()),
             execute_2darray_return_value=(True, dict(
                 rows=[dict(
                     urilocation='{http://someurl.com}',
                     execlocation=['ALL_SEGMENTS'],
                     fmttype='a',
                     fmtopts='delimiter \',\' null \'\' '
                             'escape \'"\' quote \'"\'',
                     command=None,
                     rejectlimit=None,
                     rejectlimittype=None,
                     errtblname=None,
                     errortofile=None,
                     pg_encoding_to_char='UTF8',
                     writable=False,
                     options=None,
                     distribution=None,
                     name='some_table',
                     namespace='public'
                 )]
             )),

             expect_render_template_called_with=dict(
                 template_name_or_list=os.path.join(
                     'sql/#gpdb#80323#', 'get_table_information.sql'),
                 table_oid=11
             ),
             expected_make_response_called_with=dict(
                 response=dict(
                     name="some_table",
                     type='readable',
                     format_type='UTF8',
                     format_options='delimiter \',\' null \'\' '
                                    'escape \'"\' quote \'"\'',
                     external_options=None,
                     command=None,
                     execute_on='all segments',
                 ),
                 status=200
             ),
         )),
    ]

    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.get_driver')
    def runTest(self, get_driver_mock):
        self.__before_all(get_driver_mock)

        if self.test_type == 'check-precondition':
            self.__test_backend_support()
        elif self.test_type == 'nodes':
            self.__test_nodes()
        elif self.test_type == 'node':
            self.__test_node()
        elif self.test_type == 'children':
            self.__test_children()
        elif self.test_type == 'properties':
            self.__test_properties()

    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.make_json_response')
    def __test_children(self, make_json_response_mock):
        self.manager.connection = MagicMock(return_value=self.connection)
        external_tables_view = ExternalTablesView(cmd='')
        external_tables_view.children(**self.function_parameters)
        make_json_response_mock.assert_called_with(
            **self.expected_make_json_response_called_with
        )

    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.render_template')
    def __test_backend_support(self, _):
        self.manager.connection = MagicMock(return_value=self.connection)
        external_tables_view = ExternalTablesView(cmd='')
        external_tables_view.nodes(**self.function_parameters)
        self.manager.connection.assert_called_with(
            **self.expected_manager_connection_to_be_called_with
        )
        self.assertEquals(self.manager, external_tables_view.manager)
        self.assertEquals(self.connection, external_tables_view.connection)

    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.render_template')
    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.make_json_response')
    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.internal_server_error')
    def __test_nodes(self, internal_server_error_mock,
                     make_json_response_mock, render_template_mock):
        external_tables_view = ExternalTablesView(cmd='')
        external_tables_view.nodes(**self.function_parameters)
        if hasattr(self, 'expected_internal_server_error_called_with'):
            internal_server_error_mock.assert_called_with(
                **self.expected_internal_server_error_called_with
            )
        else:
            internal_server_error_mock.assert_not_called()
        if hasattr(self, 'expected_make_json_response_called_with'):
            make_json_response_mock.assert_called_with(
                **self.expected_make_json_response_called_with
            )
        else:
            make_json_response_mock.assert_not_called()
        render_template_mock.assert_called_with(
            self.expect_render_template_called_with
        )

    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.render_template')
    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.make_json_response')
    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.internal_server_error')
    def __test_node(self, internal_server_error_mock,
                    make_json_response_mock, render_template_mock):
        external_tables_view = ExternalTablesView(cmd='')
        external_tables_view.node(**self.function_parameters)
        if hasattr(self, 'expected_internal_server_error_called_with'):
            internal_server_error_mock.assert_called_with(
                **self.expected_internal_server_error_called_with
            )
        else:
            internal_server_error_mock.assert_not_called()
        if hasattr(self, 'expected_make_json_response_called_with'):
            make_json_response_mock.assert_called_with(
                **self.expected_make_json_response_called_with
            )
        else:
            make_json_response_mock.assert_not_called()
        render_template_mock.assert_called_with(
            **self.expect_render_template_called_with
        )

    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.render_template')
    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.make_response')
    @patch('pgadmin.browser.server_groups.servers.databases.external_tables'
           '.internal_server_error')
    def __test_properties(self, internal_server_error_mock,
                          make_response_mock, render_template_mock):
        external_tables_view = ExternalTablesView(cmd='')
        external_tables_view.properties(**self.function_parameters)
        if hasattr(self, 'expected_internal_server_error_called_with'):
            internal_server_error_mock.assert_called_with(
                **self.expected_internal_server_error_called_with
            )
        else:
            internal_server_error_mock.assert_not_called()
        if hasattr(self, 'expected_make_response_called_with'):
            make_response_mock.assert_called_with(
                **self.expected_make_response_called_with
            )
        else:
            make_response_mock.assert_not_called()
        render_template_mock.assert_called_with(
            **self.expect_render_template_called_with
        )

    def __before_all(self, get_driver_mock):
        self.connection.execute_2darray.return_value = \
            self.execute_2darray_return_value
        self.manager.connection = MagicMock(return_value=self.connection)
        get_driver_mock.return_value = MagicMock(
            connection_manager=MagicMock(return_value=self.manager)
        )
