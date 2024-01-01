##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: 35f29b1701bd
Revises: ec1cac3399c9
Create Date: 2019-04-26 16:38:08.368471

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '35f29b1701bd'
down_revision = 'ec1cac3399c9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user', sa.Column('masterpass_check', sa.String(length=256)))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
