##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Added utility pid to stop process

Revision ID: ece2e76bf60e
Revises: ca00ec32581b
Create Date: 2018-10-18 14:45:13.483068

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ece2e76bf60e'
down_revision = 'ca00ec32581b'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('process', sa.Column('utility_pid', sa.Integer()))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
