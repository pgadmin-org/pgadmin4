import os

from flask import Flask
from jinja2 import FileSystemLoader

from pgadmin import VersionedTemplateLoader
from pgadmin.utils.route import BaseTestGenerator


class TestVersionedTemplateLoader(BaseTestGenerator):
    def setUp(self):
        self.loader = VersionedTemplateLoader(FakeApp())

    def runTest(self):
        self.test_get_source_returns_a_template()
        self.test_get_source_when_the_version_is_9_1_returns_9_1_template()
        self.test_get_source_when_the_version_is_9_3_and_there_are_templates_for_9_2_and_9_1_returns_9_2_template()

    def test_get_source_returns_a_template(self):
        expected_content = "Some SQL" \
                           "\nsome more stuff on a new line\n"

        content, filename, up_to_dateness = self.loader.get_source(None, "some_feature/sql/9.1_plus/some_action.sql")

        self.assertEqual(expected_content, content)
        self.assertIn("some_feature/sql/9.1_plus/some_action.sql", filename)

    def test_get_source_when_the_version_is_9_1_returns_9_1_template(self):
        expected_content = "Some SQL" \
                           "\nsome more stuff on a new line\n"

        content, filename, up_to_dateness = self.loader.get_source(None, "some_feature/sql/#90100#/some_action.sql")

        self.assertEqual(expected_content, content)
        self.assertIn("some_feature/sql/9.1_plus/some_action.sql", filename)

    def test_get_source_when_the_version_is_9_3_and_there_are_templates_for_9_2_and_9_1_returns_9_2_template(self):
        content, filename, up_to_dateness = self.loader.get_source(None, "some_feature/sql/#90300#/some_action.sql")

        self.assertEqual("Some 9.2 SQL", content)
        self.assertIn("some_feature/sql/9.2_plus/some_action.sql", filename)


class FakeApp(Flask):
    def __init__(self):
        super(FakeApp, self).__init__("")
        self.jinja_loader = FileSystemLoader(os.path.dirname(os.path.realpath(__file__)) + "/templates")
