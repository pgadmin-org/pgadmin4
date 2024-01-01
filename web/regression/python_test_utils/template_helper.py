##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from jinja2 import BaseLoader
from jinja2 import Environment


class SimpleTemplateLoader(BaseLoader):
    """ This class pretends to load whatever file content it is initialized
    with"""

    def __init__(self, file_content):
        self.file_content = file_content

    def get_source(self, *args):
        return self.file_content, "fake-file-name", True


def file_as_template(file_path):
    """This method returns a jinja template for the given filepath """
    file_content = open(file_path, 'r').read()
    env = Environment(loader=SimpleTemplateLoader(file_content),
                      autoescape=True)
    template = env.get_template("")
    return template
