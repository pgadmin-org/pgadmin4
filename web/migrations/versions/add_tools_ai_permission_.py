##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Add tools_ai permission to existing roles

Revision ID: add_tools_ai_perm
Revises: efbbe5d5862f
Create Date: 2025-12-01

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_tools_ai_perm'
down_revision = 'efbbe5d5862f'
branch_labels = None
depends_on = None


def upgrade():
    # Get metadata from current connection
    meta = sa.MetaData()
    meta.reflect(op.get_bind(), only=('role',))
    role_table = sa.Table('role', meta)

    # Get all roles with permissions
    conn = op.get_bind()
    result = conn.execute(
        sa.select(role_table.c.id, role_table.c.permissions)
        .where(role_table.c.permissions.isnot(None))
    )

    # Add tools_ai permission to each role that has permissions
    for row in result:
        role_id = row[0]
        permissions = row[1]
        if permissions:
            perms_list = permissions.split(',')
            if 'tools_ai' not in perms_list:
                perms_list.append('tools_ai')
                new_permissions = ','.join(perms_list)
                conn.execute(
                    role_table.update()
                    .where(role_table.c.id == role_id)
                    .values(permissions=new_permissions)
                )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
