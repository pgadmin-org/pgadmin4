##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""
Adding new columns to store background & foreground (Feature: RM#1383)

Revision ID: 02b9dccdcfcb
Revises: ef590e979b0d
Create Date: 2017-11-14 19:09:04.674575

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '02b9dccdcfcb'
down_revision = 'ef590e979b0d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('bgcolor', sa.String(length=10)))
    op.add_column('server', sa.Column('fgcolor', sa.String(length=10)))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
