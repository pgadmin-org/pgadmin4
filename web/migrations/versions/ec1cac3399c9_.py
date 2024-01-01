##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""

Revision ID: ec1cac3399c9
Revises: b5b87fdfcb30
Create Date: 2019-03-07 16:05:28.874203

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ec1cac3399c9'
down_revision = 'b5b87fdfcb30'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'query_history',
        sa.Column('srno', sa.Integer(), nullable=False),
        sa.Column('uid', sa.Integer(), nullable=False),
        sa.Column('sid', sa.Integer(), nullable=False),
        sa.Column('dbname', sa.String(), nullable=False),
        sa.Column('query_info', sa.String(), nullable=False),
        sa.Column('last_updated_flag', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['sid'], ['server.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uid'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('srno', 'uid', 'sid', 'dbname'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
