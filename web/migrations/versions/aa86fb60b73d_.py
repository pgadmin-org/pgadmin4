##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Added new column 'tunnel_password' to save the password of SSH Tunnel.

Revision ID: aa86fb60b73d
Revises: 493cd3e39c0c
Create Date: 2018-07-26 11:19:50.879849

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'aa86fb60b73d'
down_revision = '493cd3e39c0c'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('tunnel_password', sa.String(length=64)))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
