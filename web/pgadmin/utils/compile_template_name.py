##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import os


def compile_template_name(template_prefix, template_file_name, server_type, version):
    if server_type == 'gpdb':
        version_path = '#{0}#{1}#'.format(server_type, version)
    else:
        version_path = '#{0}#'.format(version)
    return os.path.join(template_prefix, version_path, template_file_name)
