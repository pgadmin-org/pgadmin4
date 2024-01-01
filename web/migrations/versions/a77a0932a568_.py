##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Change the not null constraints for port, username as it should not
    compulsory when service is provided. RM #4642

Revision ID: a77a0932a568
Revises: 35f29b1701bd
Create Date: 2019-09-09 15:41:30.084753

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a77a0932a568'
down_revision = '35f29b1701bd'
branch_labels = None
depends_on = None


def upgrade():
    # Port and Username can be null if service is provided.
    with op.batch_alter_table("server") as batch_op:
        batch_op.drop_constraint('ck_port_range')
        batch_op.alter_column('port', nullable=True)
        batch_op.alter_column('username', nullable=True)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
