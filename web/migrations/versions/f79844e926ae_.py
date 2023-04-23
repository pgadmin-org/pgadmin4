##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Update DB to version 32

Added passexec_cmd and passexec_expiration columns to server configuration.

Revision ID: f79844e926ae
Revises: 1586db67b98e
Create Date: 2022-10-11 11:25:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f79844e926ae'
down_revision = '1586db67b98e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('passexec_cmd', sa.String(length=256)))
    op.add_column('server', sa.Column('passexec_expiration', sa.Integer()))
    # ### end Alembic commands ###


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
