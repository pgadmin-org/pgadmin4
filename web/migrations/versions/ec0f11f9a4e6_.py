##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""

Revision ID: ec0f11f9a4e6
Revises: 44926ac97232
Create Date: 2023-12-18 17:09:34.499652

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ec0f11f9a4e6'
down_revision = '44926ac97232'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('tunnel_keep_alive', sa.Integer(),
                                      server_default='0'))
    op.add_column('sharedserver', sa.Column('tunnel_keep_alive', sa.Integer(),
                                            server_default='0'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
