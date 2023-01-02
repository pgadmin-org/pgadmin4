##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Added service field option in server table (RM#3140)

Revision ID: 50aad68f99c2
Revises: 02b9dccdcfcb
Create Date: 2018-03-07 11:53:57.584280

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '50aad68f99c2'
down_revision = '02b9dccdcfcb'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('service', sa.String()))
    with op.batch_alter_table("server") as batch_op:
        batch_op.alter_column('host', nullable=True)
        batch_op.alter_column('maintenance_db', nullable=True)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
