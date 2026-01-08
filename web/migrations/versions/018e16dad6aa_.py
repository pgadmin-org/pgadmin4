##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Updated id column type to BIGINT.

Revision ID: 018e16dad6aa
Revises: efbbe5d5862f
Create Date: 2026-01-08 14:37:33.257002

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '018e16dad6aa'
down_revision = 'efbbe5d5862f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("database") as batch_op:
        batch_op.alter_column('id',
                              existing_type=sa.Integer(),
                              type_=sa.BigInteger(),
                              nullable=False)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
