##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


def compile_template_name(
        template_prefix, template_file_name, version):

    # Template path concatenation should be same as
    # Ref: ../pgadmin4/web/pgadmin/utils/versioned_template_loader.py +54
    # to avoid path mismatch in windows
    return compile_template_path(template_prefix, version) + \
        '/' + template_file_name


def compile_template_path(template_prefix, version):

    version_path = '#{0}#'.format(version)

    # Template path concatenation should be same as
    # Ref: ../pgadmin4/web/pgadmin/utils/versioned_template_loader.py +54
    # to avoid path mismatch in windows
    return template_prefix + '/' + version_path
