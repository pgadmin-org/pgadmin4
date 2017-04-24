##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.model import Version
import config
import sys


def get_version():
    try:
        version = Version.query.filter_by(name='ConfigDB').first()
    except Exception:
        return -1

    if int(version.value) > int(config.SETTINGS_SCHEMA_VERSION):
        print(u"""
    The database schema version is {0}, whilst the version required by the \
    software is {1}.
    Exiting...""".format(version.value, config.SETTINGS_SCHEMA_VERSION))
        sys.exit(1)

    return version.value
