##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: c465fee44968
Revises: d0bc9f32b2b9
Create Date: 2021-06-04 14:42:12.843116

"""
from alembic import op
import sqlalchemy as sa
import uuid


# revision identifiers, used by Alembic.
revision = 'c465fee44968'
down_revision = 'd0bc9f32b2b9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user', sa.Column('fs_uniquifier', sa.String(),
                                    nullable=True))

    meta = sa.MetaData()
    # define table representation
    meta.reflect(op.get_bind(), only=('user',))
    user_table = sa.Table('user', meta)

    op.execute(
        user_table.update().values(fs_uniquifier=uuid.uuid4().hex)
    )
    with op.batch_alter_table("user") as batch_op:
        batch_op.alter_column('fs_uniquifier', nullable=False)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
