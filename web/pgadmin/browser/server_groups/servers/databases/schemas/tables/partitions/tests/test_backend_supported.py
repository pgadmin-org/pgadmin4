##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    partitions import PartitionsModule
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import patch, Mock, call


class TestBackendSupport(BaseTestGenerator):
    scenarios = [
        ('when tid is not present in arguments, but server version'
         'is supported then return True',
         dict(
             manager=dict(
                 server_type="pg",
                 version="100000"
             ),
             input_arguments=dict(did=432),

             collection_node_active=True,
             connection_execution_return_value=[],

             expected_return_value=True,
             expect_error_response=False,
             expected_number_calls_on_render_template=0
         )),
        ('when tid is present in arguments and CollectionNodeModule does '
         'not support, should return None and no query should be done',
         dict(
             manager=dict(
                 server_type="",
                 version=""
             ),
             input_arguments=dict(did=432, tid=123),

             collection_node_active=False,
             connection_execution_return_value=[],

             expected_return_value=None,
             expect_error_response=False,
             expected_number_calls_on_render_template=0
         )),
        ('when error happens while querying the database, '
         'should return an internal server error',
         dict(
             manager=dict(
                 server_type="pg",
                 version="10"
             ),
             input_arguments=dict(did=432, tid=123),

             collection_node_active=True,
             connection_execution_return_value=[False, "Some ugly error"],

             expected_return_value=None,
             expect_error_response=True,
             expected_number_calls_on_render_template=1,
             expect_render_template_to_be_called_with=call(
                 'partitions/sql/pg/#pg#10#/backend_support.sql', tid=123
             )
         ))
    ]

    @patch(
        'pgadmin.browser.server_groups.servers.databases.schemas.tables.'
        'partitions.internal_server_error'
    )
    @patch(
        'pgadmin.browser.server_groups.servers.databases.schemas.tables.'
        'partitions.CollectionNodeModule'
    )
    @patch(
        'pgadmin.browser.server_groups.servers.databases.schemas.tables.'
        'partitions.render_template'
    )
    def runTest(
        self, render_template_mock, CollectionNodeModule_mock,
        internal_server_error_mock
    ):
        module = PartitionsModule("partition")
        module.manager = Mock()
        module.manager.server_type = self.manager['server_type']
        module.manager.version = self.manager['version']
        connection_mock = Mock()
        connection_mock.execute_scalar.return_value = \
            self.connection_execution_return_value
        module.manager.connection.return_value = connection_mock
        CollectionNodeModule_mock.backend_supported.return_value = \
            self.collection_node_active

        result = module.backend_supported(
            module.manager, **self.input_arguments
        )

        if self.expected_number_calls_on_render_template == 0:
            render_template_mock.assert_not_called()
        else:
            render_template_mock.assert_has_calls(
                [self.expect_render_template_to_be_called_with]
            )

        if self.expect_error_response:
            internal_server_error_mock.assert_called_with(
                errormsg=self.connection_execution_return_value[1]
            )
        else:
            self.assertEqual(result, self.expected_return_value)
