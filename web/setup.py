#########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Perform the initial setup of the application, by creating the auth
and settings database."""

import os
import sys

from flask import Flask

# We need to include the root directory in sys.path to ensure that we can
# find everything we need when running in the standalone runtime.
root = os.path.dirname(os.path.realpath(__file__))
if sys.path[0] != root:
    sys.path.insert(0, root)

if __name__ == '__main__':
    # Configuration settings
    import config
    from pgadmin.model import db, SCHEMA_VERSION
    from pgadmin.setup import db_upgrade, create_app_data_directory

    config.SETTINGS_SCHEMA_VERSION = SCHEMA_VERSION

    app = Flask(__name__)

    app.config.from_object(config)

    if config.TESTING_MODE:
        config.SQLITE_PATH = config.TEST_SQLITE_PATH

    create_app_data_directory(config)

    app.config['SQLALCHEMY_DATABASE_URI'] = \
        'sqlite:///' + config.SQLITE_PATH.replace('\\', '/')
    db.init_app(app)

    print(u"pgAdmin 4 - Application Initialisation")
    print(u"======================================\n")

    db_upgrade(app)
