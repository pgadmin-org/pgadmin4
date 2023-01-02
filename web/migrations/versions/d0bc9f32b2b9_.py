##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: d0bc9f32b2b9
Revises: c6974f64df08
Create Date: 2021-04-27 12:40:08.899712

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd0bc9f32b2b9'
down_revision = 'c6974f64df08'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('kerberos_conn', sa.Boolean(),
                                      server_default='false'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
