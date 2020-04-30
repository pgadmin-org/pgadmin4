##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.browser.server_groups.servers.databases \
    .external_tables.reverse_engineer_ddl import \
    ReverseEngineerDDL, ReverseEngineerDDLException
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import MagicMock


class TestReverseEngineerDDL(BaseTestGenerator):
    scenarios = [
        ('#execute When retriving the DDL for the creation of external '
         'tables, '
         'it retrieves information of the columns and the tables '
         'and generate the SQL to create the table',
         dict(
             test_type='execute',
             function_parameters=dict(table_oid=14),
             find_columns_return_value=dict(somevalue='value'),
             table_information_return_value=dict(someother='bamm'),

             expect_find_columns_called_with=14,
             expect_table_information_called_with=14,
             expect_render_template_called_with=dict(
                 template_name_or_list='sql/#gpdb#80323#/create.sql',
                 table=dict(
                     someother='bamm',
                     columns=dict(somevalue='value')
                 )
             )
         )),
        ('#find_columns When an external table exists, '
         'and have 3 columns, '
         'it returns a list with 1 object that as the table name to inherit '
         'from',
         dict(
             test_type='find_columns',
             function_parameters={'table_oid': 123},
             execute_2darray_return_value=(True, dict(rows=[
                 {
                     'name': 'column_1',
                     'cltype': 'text',
                     'inheritedFrom': 'other_table',
                     'inheritedid': '1234',
                 }, {
                     'name': 'column_2',
                     'cltype': 'int',
                     'inheritedFrom': 'other_table',
                     'inheritedid': '1234',
                 }, {
                     'name': 'column_3',
                     'cltype': 'numeric',
                     'inheritedFrom': 'other_table',
                     'inheritedid': '1234',
                 }
             ])),

             expect_render_template_called_with=dict(
                 template_name_or_list='sql/#gpdb#80323#/get_columns.sql',
                 table_oid=123
             ),
             expected_result=[
                 {
                     'name': 'column_1',
                     'type': 'text'
                 },
                 {
                     'name': 'column_2',
                     'type': 'int'
                 },
                 {
                     'name': 'column_3',
                     'type': 'numeric'
                 },
             ],
         )),
        ('#find_columns When error happens while retrieving '
         'column information, '
         'it raise an exception',
         dict(
             test_type='find_columns',
             function_parameters={'table_oid': 123},
             execute_2darray_return_value=(False, 'Some error message'),

             expect_render_template_called_with=dict(
                 template_name_or_list='sql/#gpdb#80323#/get_columns.sql',
                 table_oid=123
             ),
             expected_exception=ReverseEngineerDDLException(
                 'Some error message'),
         )
         ),
        ('#table_information When error happens while retrieving '
         'table generic information, '
         'it raise an exception',
         dict(
             test_type='table_information',
             function_parameters={'table_oid': 123},
             execute_2darray_return_value=(False, 'Some error message'),

             expect_render_template_called_with=dict(
                 template_name_or_list='sql/#gpdb#80323#/'
                                       'get_table_information.sql',
                 table_oid=123
             ),
             expected_exception=ReverseEngineerDDLException(
                 'Some error message'),
         )
         ),
        ('#table_information When cannot find the table, '
         'it raise an exception',
         dict(
             test_type='table_information',
             function_parameters={'table_oid': 123},
             execute_2darray_return_value=(True, {'rows': []}),

             expect_render_template_called_with=dict(
                 template_name_or_list='sql/#gpdb#80323#/'
                                       'get_table_information.sql',
                 table_oid=123
             ),
             expected_exception=ReverseEngineerDDLException(
                 'Table not found'),
         )),
        ('#table_information When retrieving generic information '
         'about a Web table, '
         'it returns the table information',
         dict(
             test_type='table_information',
             function_parameters={'table_oid': 123},
             execute_2darray_return_value=(True, dict(rows=[
                 {
                     'urilocation': '{http://someurl.com}',
                     'execlocation': ['ALL_SEGMENTS'],
                     'fmttype': 'a',
                     'fmtopts': 'delimiter \',\' null \'\' '
                                'escape \'"\' quote \'"\'',
                     'command': None,
                     'rejectlimit': None,
                     'rejectlimittype': None,
                     'errtblname': None,
                     'errortofile': None,
                     'pg_encoding_to_char': 'UTF8',
                     'writable': False,
                     'options': None,
                     'distribution': None,
                     'name': 'some_table',
                     'namespace': 'public'
                 }
             ])),

             expect_render_template_called_with=dict(
                 template_name_or_list='sql/#gpdb#80323#/'
                                       'get_table_information.sql',
                 table_oid=123
             ),
             expected_result={
                 'uris': ['http://someurl.com'],
                 'isWeb': True,
                 'executionLocation': dict(type='all_segments', value=None),
                 'formatType': 'avro',
                 'formatOptions': 'delimiter = $$,$$,escape = $$"$$,'
                                  'null = $$$$,quote = $$"$$',
                 'command': None,
                 'rejectLimit': None,
                 'rejectLimitType': None,
                 'errorTableName': None,
                 'erroToFile': None,
                 'pgEncodingToChar': 'UTF8',
                 'writable': False,
                 'options': None,
                 'distribution': None,
                 'name': 'some_table',
                 'namespace': 'public'
             },
         )),
    ]

    def __init__(self, *args, **kwargs):
        super(TestReverseEngineerDDL, self).__init__(*args, **kwargs)
        self.connection = None
        self.subject = None
        self.render_template_mock = None

    def runTest(self):
        self.render_template_mock = MagicMock()
        self.connection = MagicMock(execute_2darray=MagicMock())
        if hasattr(self, 'execute_2darray_return_value'):
            self.connection.execute_2darray.return_value = \
                self.execute_2darray_return_value
        self.subject = ReverseEngineerDDL(
            'sql/#gpdb#80323#/',
            self.render_template_mock,
            self.connection,
            1, 2, 3)
        if self.test_type == 'find_columns':
            self.__test_find_columns()
        elif self.test_type == 'table_information':
            self.__test_table_information()
        elif self.test_type == 'execute':
            self.__test_execute()

    def __test_find_columns(self):
        if hasattr(self, 'expected_exception'):
            try:
                self.subject.find_columns(**self.function_parameters)
                self.fail('Exception not raise')
            except ReverseEngineerDDLException as exception:
                self.assertEqual(str(exception),
                                 str(self.expected_exception))
        else:
            result = self.subject.find_columns(**self.function_parameters)
            self.assertEqual(self.expected_result, result)

        self.render_template_mock.assert_called_with(
            **self.expect_render_template_called_with
        )

    def __test_table_information(self):
        if hasattr(self, 'expected_exception'):
            try:
                self.subject.table_information(**self.function_parameters)
                self.fail('Exception not raise')
            except ReverseEngineerDDLException as exception:
                self.assertEqual(str(exception),
                                 str(self.expected_exception))
        else:
            result = self.subject.table_information(**self.function_parameters)
            self.assertEqual(self.expected_result, result)

        self.render_template_mock.assert_called_with(
            **self.expect_render_template_called_with
        )

    def __test_execute(self):
        self.subject.find_columns = MagicMock(
            return_value=self.find_columns_return_value)
        self.subject.table_information = MagicMock(
            return_value=self.table_information_return_value)

        self.subject.execute(**self.function_parameters)

        self.subject.find_columns.assert_called_with(
            self.expect_find_columns_called_with)
        self.subject.table_information.assert_called_with(
            self.expect_table_information_called_with)
        self.render_template_mock.assert_called_with(
            **self.expect_render_template_called_with)
