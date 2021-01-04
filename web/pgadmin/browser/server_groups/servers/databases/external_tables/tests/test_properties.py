##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.browser.server_groups.servers.databases \
    .external_tables import Properties
from pgadmin.browser.server_groups.servers.databases.external_tables \
    .properties import PropertiesException, PropertiesTableNotFoundException
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import MagicMock, patch


class TestProperties(BaseTestGenerator):
    scenarios = [
        ('#properties When retrieving the properties of a external table '
         'and the table exists, '
         'it return the properties ',
         dict(
             test_type='properties',
             function_parameters=dict(
                 table_oid=11
             ),

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
                 template_name_or_list='some/sql/location/'
                                       'get_table_information.sql',
                 table_oid=11
             ),
             expected_result=dict(
                 name="some_table",
                 type='readable',
                 format_type='UTF8',
                 format_options='delimiter \',\' null \'\' '
                                'escape \'"\' quote \'"\'',
                 external_options=None,
                 command=None,
                 execute_on='all segments',
             ),
         )),
        ('#properties When retrieving the properties of a external table '
         'and a SQL error happens, '
         'it raises exception with the error message',
         dict(
             test_type='properties',
             function_parameters=dict(
                 table_oid=11
             ),

             connection=MagicMock(execute_2darray=MagicMock()),
             execute_2darray_return_value=(False, 'Some error'),

             expect_render_template_called_with=dict(
                 template_name_or_list='some/sql/location/'
                                       'get_table_information.sql',
                 table_oid=11
             ),
             expected_raise_exception=PropertiesException,
             expected_internal_server_error_called_with=['Some error']
         )),
        ('#properties When retrieving the properties of a external table '
         'and table is not found, '
         'it raises exception ',
         dict(
             test_type='properties',
             function_parameters=dict(
                 table_oid=11
             ),

             connection=MagicMock(execute_2darray=MagicMock()),
             execute_2darray_return_value=(True, dict(rows=[])),

             expect_render_template_called_with=dict(
                 template_name_or_list='some/sql/location/'
                                       'get_table_information.sql',
                 table_oid=11
             ),
             expected_raise_exception=PropertiesTableNotFoundException
         )),
    ]

    def runTest(self):
        self.connection.execute_2darray.return_value = \
            self.execute_2darray_return_value
        self.__test_properties()

    @patch('pgadmin.browser.server_groups.servers.databases'
           '.external_tables.properties.internal_server_error')
    def __test_properties(self, internal_server_error_mock):
        self.maxDiff = None
        render_template_mock = MagicMock()

        external_tables_view = Properties(
            render_template_mock,
            self.connection,
            'some/sql/location/'
        )

        result = None

        try:
            result = external_tables_view.retrieve(**self.function_parameters)
            if hasattr(self, 'expected_raise_exception'):
                self.fail('No exception was raised')
        except PropertiesException as exception:
            if hasattr(self, 'expected_raise_exception'):
                if isinstance(exception, self.expected_raise_exception):
                    if hasattr(self,
                               'expected_internal_server_error_called_with'):
                        internal_server_error_mock.assert_called_with(
                            *self.expected_internal_server_error_called_with
                        )
                    else:
                        internal_server_error_mock.assert_not_called()
                else:
                    self.fail('Wrong exception type: ' + str(exception))
            else:
                raise exception

        if hasattr(self, 'expected_result'):
            self.assertEqual(result, self.expected_result)

        render_template_mock.assert_called_with(
            **self.expect_render_template_called_with
        )
