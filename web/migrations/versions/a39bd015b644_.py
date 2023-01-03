##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: a39bd015b644
Revises: 81c7ffeffeee
Create Date: 2021-01-12 15:46:49.283021

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a39bd015b644'
down_revision = '81c7ffeffeee'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("sharedserver") as batch_op:
        batch_op.drop_constraint('ck_shared_server_port')
        batch_op.alter_column('port', nullable=True)
        batch_op.alter_column('maintenance_db', nullable=True)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
