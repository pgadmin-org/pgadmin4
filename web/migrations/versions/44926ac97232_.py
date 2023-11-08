##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Update DB to version 38

Removed max length from passexec_cmd column of server configuration.

Revision ID: 44926ac97232
Revises: 44b9ce549393
Create Date: 2023-11-03 19:56:51.277160

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '44926ac97232'
down_revision = '44b9ce549393'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("server") as batch_op:
        batch_op.alter_column('passexec_cmd',
                              existing_type=sa.String(length=256),
                              type_=sa.String())
    # ### end Alembic commands ###


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
