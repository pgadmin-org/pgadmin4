#########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Perform the initial setup of the application, by creating the auth
and settings database."""

import os
import sys
from pgadmin.model import db, Version, SCHEMA_VERSION as CURRENT_SCHEMA_VERSION

if sys.version_info[0] >= 3:
    import builtins
else:
    import __builtin__ as builtins

# Grab the SERVER_MODE if it's been set by the runtime
if 'SERVER_MODE' in globals():
    builtins.SERVER_MODE = globals()['SERVER_MODE']
else:
    builtins.SERVER_MODE = None

# We need to include the root directory in sys.path to ensure that we can
# find everything we need when running in the standalone runtime.
root = os.path.dirname(os.path.realpath(__file__))
if sys.path[0] != root:
    sys.path.insert(0, root)

from pgadmin import create_app

if __name__ == '__main__':
    # Configuration settings
    import config
    from pgadmin.model import SCHEMA_VERSION
    from pgadmin.setup import db_upgrade, create_app_data_directory

    config.SETTINGS_SCHEMA_VERSION = SCHEMA_VERSION
    if "PGADMIN_TESTING_MODE" in os. environ and \
            os.environ["PGADMIN_TESTING_MODE"] == "1":
        config.SQLITE_PATH = config.TEST_SQLITE_PATH

    create_app_data_directory(config)

    app = create_app()

    print(u"pgAdmin 4 - Application Initialisation")
    print(u"======================================\n")

    with app.app_context():
        # Run migration for the first time i.e. create database
        from config import SQLITE_PATH
        if not os.path.exists(SQLITE_PATH):
            db_upgrade(app)
        else:
            version = Version.query.filter_by(name='ConfigDB').first()
            schema_version = version.value

            # Run migration if current schema version is greater than the
            # schema version stored in version table
            if CURRENT_SCHEMA_VERSION >= schema_version:
                db_upgrade(app)

            # Update schema version to the latest
            if CURRENT_SCHEMA_VERSION > schema_version:
                version = Version.query.filter_by(name='ConfigDB').first()
                version.value = CURRENT_SCHEMA_VERSION
                db.session.commit()
