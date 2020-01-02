##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os

from flask import Flask
from jinja2 import FileSystemLoader
from jinja2 import TemplateNotFound

from pgadmin import VersionedTemplateLoader
from pgadmin.utils.route import BaseTestGenerator


class TestVersionedTemplateLoader(BaseTestGenerator):
    scenarios = [
        (
            "Render a template when called",
            dict(scenario=1)
        ),
        (
            "Render a version 9.1 template when it is present",
            dict(scenario=2)
        ),
        (
            "Render a version 9.2 template when request for a higher version",
            dict(scenario=3)
        ),
        (
            "Render default version when version 9.0 was requested and only "
            "9.1 and 9.2 are present",
            dict(scenario=4)
        ),
        (
            "Raise error when version is smaller than available templates",
            dict(scenario=5)
        ),
        (
            "Render a version GPDB 5.0 template when it is present",
            dict(scenario=6)
        ),
        (
            "Render a version GPDB 5.0 template when it is in default",
            dict(scenario=7)
        ),
        (
            "Raise error when version is gpdb but template does not exist",
            dict(scenario=8)
        )
    ]

    def setUp(self):
        self.loader = VersionedTemplateLoader(FakeApp())

    def runTest(self):
        if self.scenario == 1:
            self.test_get_source_returns_a_template()
        if self.scenario == 2:
            # test_get_source_when_the_version_is_9_1_returns_9_1_template
            self.test_get_source_when_the_version_is_9_1()
        if self.scenario == 3:
            # test_get_source_when_the_version_is_9_3_and_there_are_templates_
            # for_9_2_and_9_1_returns_9_2_template
            self.test_get_source_when_the_version_is_9_3()
        if self.scenario == 4:
            # test_get_source_when_the_version_is_9_0_and_there_are_templates_
            # for_9_1_and_9_2_returns_default_template
            self.test_get_source_when_the_version_is_9_0()
        if self.scenario == 5:
            # test_raise_not_found_exception_when_postgres_version_less_than_
            # all_available_sql_templates
            self.test_raise_not_found_exception()
        if self.scenario == 6:
            # test_get_source_when_the_version_is_gpdb_5_0_returns_gpdb_5_0_
            # template
            self.test_get_source_when_the_version_is_gpdb_5_0()
        if self.scenario == 7:
            # test_get_source_when_the_version_is_gpdb_5_0_returns_default_
            # template
            self.test_get_source_when_the_version_is_gpdb_5_0_returns_default()
        if self.scenario == 8:
            # test_raise_not_found_exception_when_the_version_is_gpdb_template
            # _not_exist
            self.test_raise_not_found_exception_when_the_version_is_gpdb()

    def test_get_source_returns_a_template(self):
        expected_content = "Some SQL" \
                           "\nsome more stuff on a new line\n"
        # For cross platform we join the SQL path
        # (This solves the slashes issue)
        sql_path = os.path.join(
            "some_feature", "sql", "9.1_plus", "some_action.sql"
        )
        content, filename, up_to_dateness = self.loader.get_source(
            None, "some_feature/sql/9.1_plus/some_action.sql"
        )
        self.assertEqual(
            expected_content, str(content).replace("\r", "")
        )
        self.assertIn(sql_path, filename)

    def test_get_source_when_the_version_is_9_1(self):
        """Render a version 9.1 template when it is present"""
        expected_content = "Some SQL" \
                           "\nsome more stuff on a new line\n"
        # For cross platform we join the SQL path
        # (This solves the slashes issue)
        sql_path = os.path.join(
            "some_feature", "sql", "9.1_plus", "some_action.sql"
        )
        content, filename, up_to_dateness = self.loader.get_source(
            None, "some_feature/sql/#90100#/some_action.sql"
        )

        self.assertEqual(
            expected_content, str(content).replace("\r", "")
        )
        self.assertIn(sql_path, filename)

    def test_get_source_when_the_version_is_9_3(self):
        """Render a version 9.2 template when request for a higher version"""
        # For cross platform we join the SQL path
        # (This solves the slashes issue)
        sql_path = os.path.join(
            "some_feature", "sql", "9.2_plus", "some_action.sql"
        )
        content, filename, up_to_dateness = self.loader.get_source(
            None, "some_feature/sql/#90300#/some_action.sql"
        )

        self.assertEqual(
            "Some 9.2 SQL", str(content).replace("\r", "")
        )
        self.assertIn(sql_path, filename)

    def test_get_source_when_the_version_is_9_0(self):
        """Render default version when version 9.0 was requested and only
        9.1 and 9.2 are present"""

        # For cross platform we join the SQL path
        # (This solves the slashes issue)
        sql_path = os.path.join("some_feature", "sql",
                                "default", "some_action_with_default.sql")
        content, filename, up_to_dateness = self.loader.get_source(
            None,
            "some_feature/sql/#90000#/some_action_with_default.sql")

        self.assertEqual("Some default SQL", str(content).replace("\r", ""))
        self.assertIn(sql_path, filename)

    def test_raise_not_found_exception(self):
        """Raise error when version is smaller than available templates"""
        try:
            self.loader.get_source(
                None, "some_feature/sql/#10100#/some_action.sql"
            )
            self.fail("No exception raised")
        except TemplateNotFound:
            return

    def test_get_source_when_the_version_is_gpdb_5_0(self):
        """Render a version GPDB 5.0 template when it is present"""
        expected_content = "Some default SQL for GPDB\n"
        # For cross platform we join the SQL path
        # (This solves the slashes issue)
        sql_path = os.path.join(
            "some_feature", "sql", "gpdb_5.0_plus",
            "some_action_with_gpdb_5_0.sql"
        )
        content, filename, up_to_dateness = self.loader.get_source(
            None,
            "some_feature/sql/#gpdb#80323#/some_action_with_gpdb_5_0.sql"
        )

        self.assertEqual(
            expected_content, str(content).replace("\r", "")
        )
        self.assertIn(sql_path, filename)

    def test_get_source_when_the_version_is_gpdb_5_0_returns_default(self):
        """Render a version GPDB 5.0 template when it is in default"""
        expected_content = "Some default SQL"
        # For cross platform we join the SQL path
        # (This solves the slashes issue)
        sql_path = os.path.join(
            "some_feature", "sql", "default", "some_action_with_default.sql"
        )
        content, filename, up_to_dateness = self.loader.get_source(
            None, "some_feature/sql/#gpdb#80323#/some_action_with_default.sql"
        )

        self.assertEqual(
            expected_content, str(content).replace("\r", "")
        )
        self.assertIn(sql_path, filename)

    def test_raise_not_found_exception_when_the_version_is_gpdb(self):
        """"Raise error when version is gpdb but template does not exist"""
        try:
            self.loader.get_source(
                None, "some_feature/sql/#gpdb#50100#/some_action.sql"
            )
            self.fail("No exception raised")
        except TemplateNotFound:
            return


class FakeApp(Flask):
    def __init__(self):
        super(FakeApp, self).__init__("")
        self.jinja_loader = FileSystemLoader(
            os.path.dirname(os.path.realpath(__file__)) + "/templates"
        )
