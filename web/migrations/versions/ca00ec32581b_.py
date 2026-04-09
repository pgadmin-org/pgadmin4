##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""
Deleting old debug logs

Revision ID: ca00ec32581b
Revises: aa86fb60b73d
Create Date: 2018-08-29 15:33:57.855491

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'ca00ec32581b'
down_revision = 'aa86fb60b73d'
branch_labels = None
depends_on = None


def upgrade():
    # Use raw SQL instead of importing the model class, because
    # model changes in later migrations (e.g. adding user_id) would
    # cause this migration to fail on fresh databases.
    op.execute('DELETE FROM debugger_function_arguments')


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
