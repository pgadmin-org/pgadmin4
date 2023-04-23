##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Added state of the utility process

Revision ID: b5b87fdfcb30
Revises: ece2e76bf60e
Create Date: 2018-10-24 12:37:59.487969

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b5b87fdfcb30'
down_revision = 'ece2e76bf60e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('process', sa.Column('process_state', sa.Integer(),
                                       server_default='0'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
