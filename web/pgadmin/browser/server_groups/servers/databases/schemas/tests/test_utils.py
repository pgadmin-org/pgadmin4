##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    DataTypeReader
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import patch, Mock

_default_database_response = [
    {
        'typname': 'type name',
        'elemoid': 1560,
        'is_collatable': True
    }
]
_default_expected_function_output = [
    {
        'label': 'type name',
        'value': 'type name',
        'typval': 'L',
        'precision': False,
        'length': True,
        'min_val': 1,
        'max_val': 2147483647,
        'is_collatable': True
    }
]
_default_manager = dict(
    server_type='ppas',
    version='456'
)


class DataTypeReaderTest(BaseTestGenerator):
    scenarios = [
        ('Schema Oid is passed to the SQL Renderer',
         dict(
             manager=_default_manager,
             execute_return_values=_default_database_response,
             data_type_template_path='someplate/where/templates/are',
             sql_condition='new condition',
             schema_oid='123',
             add_serials=False,
             expected_sql_template_path='someplate/where/templates/are',
             expected_function_output=_default_expected_function_output
         )),
        ('When no data_type_template_path is present in class, '
         'should create template path with version number',
         dict(
             manager=_default_manager,
             execute_return_values=_default_database_response,
             sql_condition='new condition',
             schema_oid='123',
             add_serials=False,
             expected_sql_template_path='datatype/sql/#456#',
             expected_function_output=_default_expected_function_output
         )),
        ('When no data_type_template_path is present in class for GreenPlum, '
         'should create template path with gpdb and the version number',
         dict(
             manager=dict(
                 server_type='gpdb',
                 version='456'
             ),
             execute_return_values=_default_database_response,
             sql_condition='new condition',
             schema_oid='123',
             add_serials=False,
             expected_sql_template_path='datatype/sql/#gpdb#456#',
             expected_function_output=_default_expected_function_output
         ))
    ]

    @patch('pgadmin.browser.server_groups.servers.databases.schemas.utils'
           '.render_template')
    def runTest(self, template_mock):
        template_mock.return_value = 'Some SQL'
        connection = Mock()
        connection.execute_2darray.return_value = [
            True,
            {
                'rows': self.execute_return_values

            }
        ]

        reader = DataTypeReader()
        reader.manager = Mock()
        reader.manager.server_type = self.manager['server_type']
        reader.manager.version = self.manager['version']
        try:
            reader.data_type_template_path = self.data_type_template_path
        except AttributeError:
            ''
        result = reader.get_types(connection, self.sql_condition,
                                  self.add_serials, self.schema_oid)
        self.assertEqual(result[1], self.expected_function_output)
        self.assertTrue(result[0])

        connection.execute_2darray.assert_called_with('Some SQL')
        template_mock.assert_called_with(
            self.expected_sql_template_path + '/get_types.sql',
            condition=self.sql_condition,
            add_serials=self.add_serials,
            schema_oid=self.schema_oid
        )
