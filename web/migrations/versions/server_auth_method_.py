##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Add auth_method to the server and sharedserver tables

The server authentication method says how pgAdmin proves a database
username's identity to a server: password, oauth_direct, oauth_exchange
or entra.
Every existing server keeps authenticating with a password. The allowed
values are checked by the application, not by the database.

Revision ID: server_auth_method
Revises: server_passexec_name
Create Date: 2026-11-13

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'server_auth_method'
down_revision = 'server_passexec_name'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    for table in ('server', 'sharedserver'):
        if not inspector.has_table(table):
            continue
        existing_cols = {c['name'] for c in inspector.get_columns(table)}
        if 'auth_method' in existing_cols:
            continue
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(
                sa.Column('auth_method', sa.String(length=32),
                          nullable=False, server_default='password'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
