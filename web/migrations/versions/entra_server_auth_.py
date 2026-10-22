##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Add the authentication method for registered PostgreSQL servers.

Revision ID: entra_server_auth
Revises: server_passexec_name
"""
from alembic import op
import sqlalchemy as sa

revision = 'entra_server_auth'
down_revision = 'server_passexec_name'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('server') as batch_op:
        batch_op.add_column(sa.Column('auth_method', sa.String(16),
                                      nullable=False,
                                      server_default='password'))


def downgrade():
    pass
