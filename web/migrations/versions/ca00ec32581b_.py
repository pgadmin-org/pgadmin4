##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""
Deleting old debug logs

Revision ID: ca00ec32581b
Revises: aa86fb60b73d
Create Date: 2018-08-29 15:33:57.855491

"""

from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = 'ca00ec32581b'
down_revision = 'aa86fb60b73d'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'DELETE FROM debugger_function_arguments'
    )


def downgrade():
    pass
