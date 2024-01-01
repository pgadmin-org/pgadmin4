##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Update DB to version 31

Added a table `user_mfa` for saving the options on MFA for different sources.

Revision ID: 15c88f765bc8
Revises: 6650c52670c2
Create Date: 2021-11-24 17:33:12.533825

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '15c88f765bc8'
down_revision = '3ce25f562f3b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_mfa', sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('mfa_auth', sa.String(length=256), nullable=False),
        sa.Column('options', sa.String()),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'mfa_auth'))

    # ### end Alembic commands ###


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
