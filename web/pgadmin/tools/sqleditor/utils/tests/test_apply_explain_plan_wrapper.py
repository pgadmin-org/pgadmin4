#######################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Apply Explain plan wrapper to sql object."""

from pgadmin.tools.sqleditor.utils import apply_explain_plan_wrapper_if_needed
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import patch, MagicMock


class StartRunningQueryTest(BaseTestGenerator):
    """
    Check that the StartRunningQueryTest method works as
    intended
    """
    scenarios = [
        ('When explain_plan is none, it should return unaltered SQL', dict(
            function_input_parameters={
                'manager': MagicMock(),
                'sql': {
                    'sql': 'some sql',
                    'explain_plan': None
                }
            },

            expect_render_template_mock_parameters=None,

            expected_return_value='some sql'
        )),
        ('When explain_plan is not present, it should return unaltered SQL',
         dict(
             function_input_parameters={
                 'manager': MagicMock(),
                 'sql': {
                     'sql': 'some sql'
                 }
             },

             expect_render_template_mock_parameters=None,

             expected_return_value='some sql'
         )),
        ('When explain_plan is present for a Postgres server version 10, '
         'it should return SQL with explain plan',
         dict(
             function_input_parameters={
                 'manager': MagicMock(version=10, server_type='pg'),
                 'sql': {
                     'sql': 'some sql',
                     'explain_plan': {
                         'format': 'json',
                         'analyze': False,
                         'verbose': True,
                         'buffers': False,
                         'timing': True
                     }
                 }
             },

             expect_render_template_mock_parameters=dict(
                 template_name_or_list='sqleditor/sql/#10#/explain_plan.sql',
                 named_parameters=dict(
                     format='json',
                     analyze=False,
                     verbose=True,
                     buffers=False,
                     timing=True
                 )),

             expected_return_value='EXPLAIN (FORMAT JSON, ANALYZE FALSE, '
                                   'VERBOSE TRUE, COSTS FALSE, BUFFERS FALSE, '
                                   'TIMING TRUE) some sql'
         )),
        ('When explain_plan is present for a GreenPlum server version 5, '
         'it should return SQL with explain plan',
         dict(
             function_input_parameters={
                 'manager': MagicMock(version=80323, server_type='gpdb'),
                 'sql': {
                     'sql': 'some sql',
                     'explain_plan': {
                         'format': 'json',
                         'analyze': False,
                         'verbose': True,
                         'buffers': False,
                         'timing': True
                     }
                 }
             },

             expect_render_template_mock_parameters=dict(
                 template_name_or_list='sqleditor/sql/#gpdb#80323#/'
                                       'explain_plan.sql',
                 named_parameters=dict(
                     format='json',
                     analyze=False,
                     verbose=True,
                     buffers=False,
                     timing=True
                 )),

             expected_return_value='EXPLAIN some sql'
         ))
    ]

    def runTest(self):
        with patch(
            'pgadmin.tools.sqleditor.utils.apply_explain_plan_wrapper'
            '.render_template'
        ) as render_template_mock:
            render_template_mock.return_value = self.expected_return_value
            result = apply_explain_plan_wrapper_if_needed(
                **self.function_input_parameters)
            self.assertEquals(result, self.expected_return_value)
            if self.expect_render_template_mock_parameters:
                render_template_mock.assert_called_with(
                    self.expect_render_template_mock_parameters[
                        'template_name_or_list'],
                    sql=self.function_input_parameters['sql']['sql'],
                    **self.expect_render_template_mock_parameters[
                        'named_parameters']
                )
            else:
                render_template_mock.assert_not_called()
