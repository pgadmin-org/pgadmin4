##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import flask_migrate
from flask import g


def db_upgrade(app):
    from pgadmin.utils import u_encode, fs_encoding
    with app.app_context():
        migration_folder = os.path.join(
            os.path.dirname(os.path.realpath(u_encode(__file__, fs_encoding))),
            os.pardir, os.pardir,
            'migrations'
        )
        # Below line is a workaround to make Flask-Migrate>=4.0.6 work.
        g.x_arg = []
        flask_migrate.upgrade(migration_folder)
