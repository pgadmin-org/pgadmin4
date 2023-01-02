##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: c6974f64df08
Revises: a39bd015b644
Create Date: 2021-04-22 10:06:21.282770

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c6974f64df08'
down_revision = 'a39bd015b644'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('sharedserver', sa.Column('osid', sa.Integer()))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
