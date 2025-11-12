##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Revision ID: efbbe5d5862f
Revises: e6ed5dac37c2
Create Date: 2025-09-29 18:40:30.248908

"""
from alembic import op, context
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'efbbe5d5862f'
down_revision = 'e6ed5dac37c2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table(
            "server",
            table_kwargs={'sqlite_autoincrement': True}) as batch_op:
        batch_op.add_column(sa.Column('tunnel_prompt_password',
                                      sa.Integer(), server_default='0'))
    with op.batch_alter_table(
        "sharedserver",
            table_kwargs={'sqlite_autoincrement': True}) as batch_op:
        batch_op.add_column(sa.Column('tunnel_prompt_password',
                                      sa.Integer(), server_default='0'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
