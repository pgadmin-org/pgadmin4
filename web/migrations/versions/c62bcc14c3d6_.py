##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: c62bcc14c3d6
Revises: 1f0eddc8fc79
Create Date: 2025-06-02 21:45:20.653669

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'c62bcc14c3d6'
down_revision = '1f0eddc8fc79'
branch_labels = None
depends_on = None


def upgrade():
    # Add 'change_password' permission to all roles except 'Administrator'.
    meta = sa.MetaData()
    meta.reflect(op.get_bind(), only=('role',))
    role_table = sa.Table('role', meta)

    perm = role_table.c.permissions
    op.execute(role_table.update().where(
        (role_table.c.name != 'Administrator')
    ).values(
        permissions=sa.case(
            (perm.is_(None), 'change_password'),
            (perm == '', 'change_password'),
            else_=perm + ',change_password'
        ))
    )

    op.create_table(
        'application_state',
        sa.Column('uid', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer()),
        sa.Column('connection_info', sa.JSON()),
        sa.Column('tool_name', sa.String(length=64)),
        sa.Column('tool_data', sa.String()),
        sa.ForeignKeyConstraint(['uid'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', 'uid'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
