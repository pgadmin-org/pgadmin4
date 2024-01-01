##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Change server port constraint to allow port below 1024 RM#3307

Revision ID: 7c56ea250085
Revises: a68b374fe373
Create Date: 2018-06-04 14:23:31.472645

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '7c56ea250085'
down_revision = 'a68b374fe373'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("server") as batch_op:
        batch_op.drop_constraint('ck_port_range')
        batch_op.create_check_constraint(
            "ck_port_range",
            "port >= 1 AND port <= 65535"
        )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
