##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""

Revision ID: 1f0eddc8fc79
Revises: e982c040d9b5
Create Date: 2025-03-26 15:58:24.131719

"""
from alembic import op
import sqlalchemy as sa
from pgadmin.utils.constants import RESTRICTION_TYPE_DATABASES

# revision identifiers, used by Alembic.
revision = '1f0eddc8fc79'
down_revision = 'e982c040d9b5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server',
                  sa.Column('db_res_type', sa.String(length=32),
                            server_default=RESTRICTION_TYPE_DATABASES))

    # For adding custom role permissions
    op.add_column('role', sa.Column('permissions', sa.Text()))

    # get metadata from current connection
    meta = sa.MetaData()
    # define table representation
    meta.reflect(op.get_bind(), only=('role',))
    role_table = sa.Table('role', meta)

    from pgadmin.tools.user_management.PgAdminPermissions import AllPermissionTypes
    op.execute(
        role_table.update().where(role_table.c.name == 'User')
        .values(permissions=",".join(AllPermissionTypes.list())))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
