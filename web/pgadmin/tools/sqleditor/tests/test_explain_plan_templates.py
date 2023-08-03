##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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
            'When rendering Postgres 10 template, '
            'when summary is present,'
            'it returns the explain plan with summary',
            dict(
                template_path='sqleditor/sql/default/explain_plan.sql',
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
            'When rendering Postgres 13 template, '
            'when wal is present,'
            'it returns the explain plan with wal',
            dict(
                template_path='sqleditor/sql/13_plus/explain_plan.sql',
                input_parameters=dict(
                    sql='SELECT * FROM places',
                    format='json',
                    buffers=False,
                    timing=False,
                    summary=False,
                    wal=True
                ),
                sql_statement='SELECT * FROM places',
                expected_return_value='EXPLAIN '
                                      '(FORMAT JSON, TIMING false, '
                                      'BUFFERS false, SUMMARY false, '
                                      'WAL true) '
                                      'SELECT * FROM places'
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
        super().__init__("")
        self.jinja_loader = ChoiceLoader([
            FileSystemLoader(
                os.path.dirname(os.path.realpath(__file__)) + "/../templates"
            ),
            FileSystemLoader(
                os.path.join(os.path.dirname(tools.__file__), 'templates')
            )
        ])
