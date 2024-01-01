##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Added server id for cloud deployment

Revision ID: 1586db67b98e
Revises: 15c88f765bc8
Create Date: 2022-01-04 13:08:05.484598

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '1586db67b98e'
down_revision = '15c88f765bc8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('process', sa.Column('server_id', sa.Integer(),
                                       server_default='0'))
    op.add_column('server', sa.Column('cloud_status', sa.Integer(),
                                      server_default='0'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
