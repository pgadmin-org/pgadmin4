##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask.templating import DispatchingJinjaLoader
from jinja2 import TemplateNotFound


class VersionedTemplateLoader(DispatchingJinjaLoader):
    def get_source(self, environment, template):
        template_path_parts = template.split("#", 2)

        server_versions = (
            {'name': "10_plus", 'number': 100000},
            {'name': "9.6_plus", 'number': 90600},
            {'name': "9.5_plus", 'number': 90500},
            {'name': "9.4_plus", 'number': 90400},
            {'name': "9.3_plus", 'number': 90300},
            {'name': "9.2_plus", 'number': 90200},
            {'name': "9.1_plus", 'number': 90100},
            {'name': "9.0_plus", 'number': 90000},
            {'name': "default", 'number': 0}
        )

        if len(template_path_parts) == 1:
            return super(VersionedTemplateLoader, self).get_source(environment, template)
        else:
            for server_version in server_versions:
                path_start, specified_version_number, file_name = template_path_parts

                if server_version['number'] > int(specified_version_number):
                    continue

                template_path = path_start + '/' + server_version['name'] + '/' + file_name
                try:
                    return super(VersionedTemplateLoader, self).get_source(environment, template_path)
                except TemplateNotFound:
                    continue
            raise TemplateNotFound(template)