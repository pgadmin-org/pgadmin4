##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""

Revision ID: e982c040d9b5
Revises: 255e2842e4d7
Create Date: 2025-03-13 16:55:26.893395

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e982c040d9b5'
down_revision = '255e2842e4d7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('post_connection_sql', sa.String()))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
