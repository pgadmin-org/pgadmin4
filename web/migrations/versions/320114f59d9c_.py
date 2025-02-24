##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Update DB to version 43

Add new column 'db_alias' to server table.

Revision ID: 320114f59d9c
Revises: 255e2842e4d7
Create Date: 2025-02-21 16:25:50.934530

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '320114f59d9c'
down_revision = '255e2842e4d7'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table(
            "server", table_kwargs={'sqlite_autoincrement': True}) as batch_op:
        batch_op.add_column(sa.Column('db_alias', sa.String(length=256), nullable=True))

def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
