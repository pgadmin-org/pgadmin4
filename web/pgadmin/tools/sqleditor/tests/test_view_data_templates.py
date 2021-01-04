##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import re

from flask import Flask, render_template
from jinja2 import FileSystemLoader
from collections import OrderedDict

from pgadmin import VersionedTemplateLoader
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER


class TestViewDataTemplates(BaseTestGenerator):
    """
    This class validates the template query for
    inserting and selecting table data.
    """
    data_to_be_saved = OrderedDict()
    data_to_be_saved['id'] = '1'
    data_to_be_saved['text'] = 'just test'
    pgadmin_alias = {k: k for k in data_to_be_saved}
    scenarios = [
        (
            'When inserting and selecting table data with only PK',
            dict(
                insert_template_path='sqleditor/sql/default/insert.sql',
                insert_parameters=dict(
                    data_to_be_saved=data_to_be_saved,
                    pgadmin_alias=pgadmin_alias,
                    primary_keys=None,
                    object_name='test_table',
                    nsp_name='test_schema',
                    data_type={'text': 'text', 'id': 'integer'},
                    pk_names='id',
                    has_oids=False,
                    type_cast_required={'text': 'True', 'id': 'True'}
                ),
                insert_expected_return_value='INSERT INTO'
                                             ' test_schema.test_table'
                                             ' (id, text) VALUES'
                                             ' (%(id)s::integer, '
                                             '%(text)s::text)'
                                             ' returning id;',
                select_template_path='sqleditor/sql/default/select.sql',
                select_parameters=dict(
                    object_name='test_table',
                    pgadmin_alias=pgadmin_alias,
                    nsp_name='test_schema',
                    primary_keys=OrderedDict([('id', 'int4')]),
                    has_oids=False
                ),
                select_expected_return_value='SELECT * FROM '
                                             'test_schema.test_table'
                                             'WHERE id = %(id)s;'
            )),
        (
            'When inserting and selecting table data with multiple PK',
            dict(
                insert_template_path='sqleditor/sql/default/insert.sql',
                insert_parameters=dict(
                    data_to_be_saved=data_to_be_saved,
                    pgadmin_alias=pgadmin_alias,
                    primary_keys=None,
                    object_name='test_table',
                    nsp_name='test_schema',
                    data_type={'text': 'text', 'id': 'integer'},
                    pk_names='id, text',
                    has_oids=False,
                    type_cast_required={'text': 'True', 'id': 'True'}
                ),
                insert_expected_return_value='INSERT INTO'
                                             ' test_schema.test_table'
                                             ' (id, text)'
                                             ' VALUES (%(id)s::integer,'
                                             ' %(text)s::text)'
                                             ' returning id, text;',
                select_template_path='sqleditor/sql/default/select.sql',
                select_parameters=dict(
                    object_name='test_table',
                    nsp_name='test_schema',
                    pgadmin_alias=pgadmin_alias,
                    primary_keys=OrderedDict([('id', 'int4'),
                                              ('text', 'text')]),
                    has_oids=False
                ),
                select_expected_return_value='SELECT * FROM'
                                             ' test_schema.test_table'
                                             'WHERE id = %(id)s AND'
                                             ' text = %(text)s;'
            )),
        (
            'When inserting and selecting table data with PK and OID',
            dict(
                insert_template_path='sqleditor/sql/default/insert.sql',
                insert_parameters=dict(
                    data_to_be_saved=data_to_be_saved,
                    pgadmin_alias=pgadmin_alias,
                    primary_keys=None,
                    object_name='test_table',
                    nsp_name='test_schema',
                    data_type={'text': 'text', 'id': 'integer'},
                    pk_names='id',
                    has_oids=True,
                    type_cast_required={'text': 'True', 'id': 'True'}
                ),
                insert_expected_return_value='INSERT INTO'
                                             ' test_schema.test_table'
                                             ' (id, text) VALUES'
                                             ' (%(id)s::integer, '
                                             '%(text)s::text) '
                                             'returning oid;',
                select_template_path='sqleditor/sql/default/select.sql',
                select_parameters=dict(
                    object_name='test_table',
                    nsp_name='test_schema',
                    primary_keys=OrderedDict([('id', 'int4')]),
                    has_oids=True
                ),
                select_expected_return_value='SELECT oid, * '
                                             'FROM test_schema.test_table'
                                             'WHERE oid = %(oid)s;'
            )),
        (
            'When inserting and selecting table data with only OID',
            dict(
                insert_template_path='sqleditor/sql/default/insert.sql',
                insert_parameters=dict(
                    data_to_be_saved=data_to_be_saved,
                    pgadmin_alias=pgadmin_alias,
                    primary_keys=None,
                    object_name='test_table',
                    nsp_name='test_schema',
                    data_type={'text': 'text', 'id': 'integer'},
                    pk_names=None,
                    has_oids=True,
                    type_cast_required={'text': 'True', 'id': 'True'}
                ),
                insert_expected_return_value='INSERT INTO'
                                             ' test_schema.test_table'
                                             ' (id, text) VALUES'
                                             ' (%(id)s::integer,'
                                             ' %(text)s::text)'
                                             ' returning oid;',
                select_template_path='sqleditor/sql/default/select.sql',
                select_parameters=dict(
                    object_name='test_table',
                    nsp_name='test_schema',
                    primary_keys=None,
                    has_oids=True
                ),
                select_expected_return_value='SELECT oid, * FROM'
                                             ' test_schema.test_table'
                                             'WHERE oid = %(oid)s;'
            )
        )
    ]

    def setUp(self):
        self.loader = VersionedTemplateLoader(FakeApp())

    def runTest(self):
        with FakeApp().app_context():
            result = render_template(self.insert_template_path,
                                     **self.insert_parameters)
            self.assertEqual(
                re.sub(' +', ' ', str(result).replace("\n", "")),
                re.sub(' +', ' ',
                       self.insert_expected_return_value.replace("\n", "")))

            result = render_template(self.select_template_path,
                                     **self.select_parameters)
            self.assertEqual(
                re.sub(' +', ' ', str(result).replace("\n", "")),
                re.sub(' +', ' ',
                       self.select_expected_return_value.replace("\n", "")))


class FakeApp(Flask):
    def __init__(self):
        super(FakeApp, self).__init__("")
        driver = get_driver(PG_DEFAULT_DRIVER, self)
        self.jinja_env.filters['qtLiteral'] = driver.qtLiteral
        self.jinja_env.filters['qtIdent'] = driver.qtIdent
        self.jinja_env.filters['qtTypeIdent'] = driver.qtTypeIdent
        self.jinja_loader = FileSystemLoader(
            os.path.join(
                os.path.dirname(os.path.realpath(__file__)),
                os.pardir,
                'templates'
            )
        )
