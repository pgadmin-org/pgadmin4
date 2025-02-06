##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""

Revision ID: 255e2842e4d7
Revises: f28be870d5ec
Create Date: 2024-12-05 13:14:53.602974

"""
from alembic import op, context
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '255e2842e4d7'
down_revision = 'f28be870d5ec'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("server",
                               table_kwargs={'sqlite_autoincrement': True}) as batch_op:
        if context.get_impl().bind.dialect.name == "sqlite":
            batch_op.alter_column('id', autoincrement=True)
        batch_op.add_column(sa.Column('is_adhoc', sa.Integer(),
                                      server_default='0'))
        batch_op.alter_column('tunnel_password',
                              existing_type=sa.String(length=64),
                              type_=sa.String())


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
