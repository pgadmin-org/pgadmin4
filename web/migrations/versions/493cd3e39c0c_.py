##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: 493cd3e39c0c
Revises: 7c56ea250085
Create Date: 2018-06-18 11:26:33.285037

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '493cd3e39c0c'
down_revision = '7c56ea250085'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('connect_timeout', sa.Integer(),
                                      server_default='0'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
