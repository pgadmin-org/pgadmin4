##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: 7fedf8531802
Revises: aff1436e3c8c
Create Date: 2020-02-26 11:24:54.353288

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '7fedf8531802'
down_revision = 'aff1436e3c8c'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user', sa.Column('username', sa.String(length=256),
                                    nullable=False, server_default=''))
    op.add_column('user', sa.Column('auth_source', sa.String(length=256),
                                    nullable=False, server_default='internal'))
    with op.batch_alter_table("user") as batch_op:
        batch_op.alter_column('email', nullable=True)
        batch_op.drop_constraint('user_unique_constraint')
        batch_op.create_unique_constraint('user_unique_constraint',
                                          ['username', 'auth_source'])

    # For internal email is a user name, so update the existing records.
    meta = sa.MetaData(bind=op.get_bind())
    # define table representation
    meta.reflect(only=('user',))
    user_table = sa.Table('user', meta)

    op.execute(
        user_table.update().values(username=user_table.c.email)
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
