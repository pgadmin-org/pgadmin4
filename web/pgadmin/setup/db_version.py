##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.model import Version


def get_version():
    try:
        version = Version.query.filter_by(name='ConfigDB').first()
    except Exception:
        return -1

    return version.value


def set_version(new_version):
    version = Version.query.filter_by(name='ConfigDB').first()
    version.value = new_version
