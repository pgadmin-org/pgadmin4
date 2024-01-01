##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: 84700139beb0
Revises: d39482714a2e
Create Date: 2020-06-24 15:53:56.489518

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '84700139beb0'
down_revision = 'd39482714a2e'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'database',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('schema_res', sa.String()),
        sa.Column('server', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['server'], ['server.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', 'server'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
