##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Revision ID: f28be870d5ec
Revises: ac2c2e27dc2d
Create Date: 2024-11-29 14:59:30.882464

"""
from alembic import op, context
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f28be870d5ec'
down_revision = 'ac2c2e27dc2d'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table(
            "server", table_kwargs={'sqlite_autoincrement': True}) as batch_op:
        batch_op.add_column(sa.Column('tags', sa.JSON(), nullable=True))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
