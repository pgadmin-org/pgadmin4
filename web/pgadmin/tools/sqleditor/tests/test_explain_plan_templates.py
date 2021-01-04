##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os

from flask import Flask, render_template
from jinja2 import FileSystemLoader, ChoiceLoader

from pgadmin import VersionedTemplateLoader
from pgadmin.utils.route import BaseTestGenerator
from pgadmin import tools


class TestExplainPlanTemplates(BaseTestGenerator):
    scenarios = [
        (
            'When rendering Postgres 9.0 template, '
            'when passing all parameters,'
            'it returns the explain plan with all parameters',
            dict(
                template_path='sqleditor/sql/default/explain_plan.sql',
                input_parameters=dict(
                    sql='SELECT * FROM places',
                    format='xml',
                    analyze=True,
                    verbose=True,
                    costs=False,
                    buffers=True
                ),
                sql_statement='SELECT * FROM places',
                expected_return_value='EXPLAIN '
                                      '(FORMAT XML, ANALYZE true, '
                                      'VERBOSE true, COSTS false, '
                                      'BUFFERS true) SELECT * FROM places'
            )
        ),
        (
            'When rendering Postgres 9.0 template, '
            'when not all parameters are present,'
            'it returns the explain plan with the present parameters',
            dict(
                template_path='sqleditor/sql/default/explain_plan.sql',
                input_parameters=dict(
                    sql='SELECT * FROM places',
                    format='json',
                    buffers=True
                ),
                sql_statement='SELECT * FROM places',
                expected_return_value='EXPLAIN '
                                      '(FORMAT JSON, BUFFERS true) '
                                      'SELECT * FROM places'
            )
        ),
        (
            'When rendering Postgres 9.2 template, '
            'when timing is present,'
            'it returns the explain plan with timing',
            dict(
                template_path='sqleditor/sql/9.2_plus/explain_plan.sql',
                input_parameters=dict(
                    sql='SELECT * FROM places',
                    format='json',
                    buffers=True,
                    timing=False
                ),
                sql_statement='SELECT * FROM places',
                expected_return_value='EXPLAIN '
                                      '(FORMAT JSON, TIMING false, '
                                      'BUFFERS true) SELECT * FROM places'
            )
        ),
        (
            'When rendering Postgres 10 template, '
            'when summary is present,'
            'it returns the explain plan with summary',
            dict(
                template_path='sqleditor/sql/10_plus/explain_plan.sql',
                input_parameters=dict(
                    sql='SELECT * FROM places',
                    format='yaml',
                    buffers=True,
                    timing=False,
                    summary=True
                ),
                sql_statement='SELECT * FROM places',
                expected_return_value='EXPLAIN '
                                      '(FORMAT YAML, TIMING false, '
                                      'BUFFERS true, SUMMARY true) '
                                      'SELECT * FROM places'
            )
        ),
        (
            'When rendering Postgres 12 template, '
            'when settings is present,'
            'it returns the explain plan with settings',
            dict(
                template_path='sqleditor/sql/12_plus/explain_plan.sql',
                input_parameters=dict(
                    sql='SELECT * FROM places',
                    format='json',
                    buffers=False,
                    timing=False,
                    summary=False,
                    settings=True
                ),
                sql_statement='SELECT * FROM places',
                expected_return_value='EXPLAIN '
                                      '(FORMAT JSON, TIMING false, '
                                      'BUFFERS false, SUMMARY false, '
                                      'SETTINGS true) '
                                      'SELECT * FROM places'
            )
        ),
        (
            'When rendering GreenPlum 5.3 template, '
            'when all parameters are present,'
            'it returns the explain without parameters',
            dict(
                template_path='sqleditor/sql/gpdb_5.0_plus/explain_plan.sql',
                input_parameters=dict(
                    sql='SELECT * FROM places',
                    format='json',
                    buffers=True
                ),
                sql_statement='SELECT * FROM places',
                expected_return_value='EXPLAIN SELECT * FROM places'
            )
        ),
        (
            'When rendering GreenPlum 5.3 template, '
            'when analyze is true,'
            'it returns the explain analyze',
            dict(
                template_path='sqleditor/sql/gpdb_5.0_plus/explain_plan.sql',
                input_parameters=dict(
                    sql='SELECT * FROM places',
                    analyze=True
                ),
                sql_statement='SELECT * FROM places',
                expected_return_value='EXPLAIN ANALYZE SELECT * FROM places'
            )
        ),
        (
            'When rendering GreenPlum 5.3 template, '
            'when analyze is false,'
            'it returns the only explain',
            dict(
                template_path='sqleditor/sql/gpdb_5.0_plus/explain_plan.sql',
                input_parameters=dict(
                    sql='SELECT * FROM places',
                    analyze=False
                ),
                sql_statement='SELECT * FROM places',
                expected_return_value='EXPLAIN SELECT * FROM places'
            )
        ),
    ]

    def setUp(self):
        self.loader = VersionedTemplateLoader(FakeApp())

    def runTest(self):
        with FakeApp().app_context():
            result = render_template(self.template_path,
                                     **self.input_parameters)
            self.assertEqual(
                str(result).replace("\n", ""), self.expected_return_value)


class FakeApp(Flask):
    def __init__(self):
        super(FakeApp, self).__init__("")
        self.jinja_loader = ChoiceLoader([
            FileSystemLoader(
                os.path.dirname(os.path.realpath(__file__)) + "/../templates"
            ),
            FileSystemLoader(
                os.path.join(os.path.dirname(tools.__file__), 'templates')
            )
        ])
