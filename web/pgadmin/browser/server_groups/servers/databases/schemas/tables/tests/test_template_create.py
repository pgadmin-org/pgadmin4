##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import re

from flask import Flask, render_template
from jinja2 import FileSystemLoader, ChoiceLoader

from config import PG_DEFAULT_DRIVER
from pgadmin import VersionedTemplateLoader
from pgadmin.utils.driver import get_driver
from pgadmin.utils.route import BaseTestGenerator


class TestTemplateCreate(BaseTestGenerator):
    scenarios = [
        (
            'When rendering GreenPlum 5.3 template, '
            'when no distribution is present, '
            'when no primary key is present, '
            'it returns "DISTRIBUTED RANDOMLY"',
            dict(
                template_path='tables/sql/gpdb_5.0_plus/create.sql',
                input_parameters=dict(
                    data=dict()
                ),
                expected_in_return_value='DISTRIBUTED RANDOMLY',
                expected_not_in_return_value='DISTRIBUTED BY '
            )
        ),
        (
            'When rendering GreenPlum 5.3 template, '
            'when no distribution is present, '
            'when primary key is present, '
            'it returns "DISTRIBUTED BY (attr_primary_key)"',
            dict(
                template_path='tables/sql/gpdb_5.0_plus/create.sql',
                input_parameters=dict(
                    data=dict(
                        primary_key=[
                            dict(
                                columns=[dict(
                                    column='attr_primary_key_column_1'
                                ), dict(
                                    column='attr_primary_key_column_2'
                                )]
                            )
                        ]
                    )
                ),
                expected_in_return_value='DISTRIBUTED BY '
                                         '(attr_primary_key_column_1, '
                                         'attr_primary_key_column_2)',
                expected_not_in_return_value='DISTRIBUTED RANDOMLY'
            )
        ),
        (
            'When rendering GreenPlum 5.3 template, '
            'when distribution is present, '
            'it returns "DISTRIBUTED BY (attr1, attr2, attr4)"',
            dict(
                template_path='tables/sql/gpdb_5.0_plus/create.sql',
                input_parameters=dict(
                    data=dict(
                        distribution=[1, 2, 4],
                        columns=[
                            {'name': 'attr1'},
                            {'name': 'attr2'},
                            {'name': 'attr3'},
                            {'name': 'attr4'},
                            {'name': 'attr5'},
                        ]
                    )
                ),
                expected_in_return_value='DISTRIBUTED BY '
                                         '(attr1, attr2, attr4)',
                expected_not_in_return_value='DISTRIBUTED RANDOMLY'
            )
        ),
    ]

    def setUp(self):
        self.loader = VersionedTemplateLoader(FakeApp())

    def runTest(self):
        with FakeApp().app_context():
            result = render_template(
                self.template_path, **self.input_parameters)
            result_beautified = re.sub(
                ' +', ' ', str(result).replace("\n", " ").strip())
            if hasattr(self, 'expected_return_value'):
                self.assertEqual(result_beautified, self.expected_return_value)
            if hasattr(self, 'expected_in_return_value'):
                self.assertIn(self.expected_in_return_value, result_beautified)
            if hasattr(self, 'expected_not_in_return_value'):
                self.assertNotIn(
                    self.expected_not_in_return_value, result_beautified)


class FakeApp(Flask):
    def __init__(self):
        super(FakeApp, self).__init__('')
        driver = get_driver(PG_DEFAULT_DRIVER, self)
        self.jinja_env.filters['qtLiteral'] = driver.qtLiteral
        self.jinja_env.filters['qtIdent'] = driver.qtIdent
        self.jinja_env.filters['qtTypeIdent'] = driver.qtTypeIdent
        self.jinja_loader = ChoiceLoader([
            FileSystemLoader(
                os.path.join(os.path.dirname(
                    os.path.realpath(__file__)
                ), os.pardir, 'templates')
            ),
            FileSystemLoader(
                os.path.join(
                    os.path.dirname(
                        os.path.realpath(__file__)
                    ), os.pardir, os.pardir, 'templates')
            ),
            FileSystemLoader(
                os.path.join(os.path.dirname(
                    os.path.realpath(__file__)),
                    os.pardir, os.pardir, 'types', 'templates')
            ),
            FileSystemLoader(
                os.path.join(os.path.dirname(
                    os.path.realpath(__file__)),
                    os.pardir, os.pardir, os.pardir, os.pardir,
                    'templates')
            ),
        ]
        )
