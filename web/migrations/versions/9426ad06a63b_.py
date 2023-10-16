##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Add the new column for shared server username and change
autoincrement in server table
Revision ID: 9426ad06a63b
Revises: f656e56dfdc8
Create Date: 2023-10-09 15:09:50.773035
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9426ad06a63b'
down_revision = 'f656e56dfdc8'
branch_labels = None
depends_on = None


def upgrade():
    # Added sqlite_autoincrement to force sqlite use auto increment instead of
    # last row id for next record. For future server table changes, we need to
    # add table_kwargs={'sqlite_autoincrement': True} as a param to
    # batch_alter_table
    with op.batch_alter_table(
            "server", table_kwargs={'sqlite_autoincrement': True}) as batch_op:
        batch_op.alter_column('id', autoincrement=True)
        batch_op.add_column(sa.Column('shared_username', sa.String(64), nullable=True))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
