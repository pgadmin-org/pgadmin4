##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Add passexec_name to the server and sharedserver tables

In server mode the password exec command is chosen by name from the
administrator-defined SERVER_PASSEXEC_COMMANDS setting, rather than
being free text. This adds the column that holds the chosen name.
Existing passexec_cmd values are converted at application start up,
because that needs the configuration, which a migration cannot see.

Revision ID: server_passexec_name
Revises: normalize_locked_text_default
Create Date: 2026-10-06

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'server_passexec_name'
down_revision = 'normalize_locked_text_default'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    for table in ('server', 'sharedserver'):
        if not inspector.has_table(table):
            continue
        existing_cols = {c['name'] for c in inspector.get_columns(table)}
        if 'passexec_name' in existing_cols:
            continue
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(
                sa.Column('passexec_name', sa.Text(), nullable=True))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
