##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Update DB to version 30

Revision ID: 6650c52670c2
Revises: c465fee44968
Create Date: 2021-07-10 18:12:38.821602

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '6650c52670c2'
down_revision = 'c465fee44968'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user', sa.Column('locked', sa.Boolean(),
                                    server_default='false'))
    op.add_column('user', sa.Column('login_attempts', sa.Integer(),
                                    server_default='0'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
