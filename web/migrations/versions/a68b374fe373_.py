##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Added columns for SSH tunneling

Revision ID: a68b374fe373
Revises: 50aad68f99c2
Create Date: 2018-04-05 13:59:57.588355

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a68b374fe373'
down_revision = '50aad68f99c2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('use_ssh_tunnel', sa.Integer(),
                                      server_default='0'))
    op.add_column('server', sa.Column('tunnel_host', sa.String()))
    op.add_column('server', sa.Column('tunnel_port', sa.String()))
    op.add_column('server', sa.Column('tunnel_username', sa.String()))
    op.add_column('server', sa.Column('tunnel_authentication', sa.Integer(),
                                      server_default='0'))
    op.add_column('server', sa.Column('tunnel_identity_file', sa.String()))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
