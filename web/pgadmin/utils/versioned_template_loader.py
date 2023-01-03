##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from flask.templating import DispatchingJinjaLoader
from jinja2 import TemplateNotFound


class VersionedTemplateLoader(DispatchingJinjaLoader):
    def get_source(self, environment, template):
        specified_version_number, exists = parse_version(template)
        if not exists:
            return super().get_source(
                environment, template
            )

        template_dir, file_name = parse_template(template)

        for version_mapping in get_version_mapping(template):
            if version_mapping['number'] > specified_version_number:
                continue

            template_path = '/'.join([
                template_dir,
                version_mapping['name'],
                file_name
            ])

            try:
                return super().get_source(
                    environment, template_path
                )
            except TemplateNotFound:
                continue
        raise TemplateNotFound(template)


def parse_version(template):
    template_path_parts = template.split("#", 3)
    if len(template_path_parts) == 1:
        return "", False

    if len(template_path_parts) == 3:
        _, version, _ = template_path_parts
        return int(version), True

    if len(template_path_parts) == 4:
        _, _, version, _ = template_path_parts
        return int(version), True

    raise TemplateNotFound(template)


def parse_template(template):
    template_path_parts = template.split("#", 3)
    return template_path_parts[0].strip('\\').strip('/'), \
        template_path_parts[-1].strip('\\').strip('/')


def get_version_mapping(template):
    template_path_parts = template.split("#", 3)

    if len(template_path_parts) == 4:
        _, server_type, _, _ = template_path_parts

    return get_version_mapping_directories()


def get_version_mapping_directories():
    """
    This function will return all the version mapping directories
    :param server_type:
    :return:
    """
    return ({'name': "15_plus", 'number': 150000},
            {'name': "14_plus", 'number': 140000},
            {'name': "13_plus", 'number': 130000},
            {'name': "12_plus", 'number': 120000},
            {'name': "11_plus", 'number': 110000},
            {'name': "10_plus", 'number': 100000},
            {'name': "9.6_plus", 'number': 90600},
            {'name': "9.5_plus", 'number': 90500},
            {'name': "9.4_plus", 'number': 90400},
            {'name': "9.3_plus", 'number': 90300},
            {'name': "9.2_plus", 'number': 90200},
            {'name': "9.1_plus", 'number': 90100},
            {'name': "9.0_plus", 'number': 90000},
            {'name': "default", 'number': 0})
