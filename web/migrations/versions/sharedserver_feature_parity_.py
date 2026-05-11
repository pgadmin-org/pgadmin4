##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""SharedServer feature parity columns, orphan cleanup, and db_res removal

Adds passexec_cmd, passexec_expiration, kerberos_conn, tags, and
post_connection_sql to the sharedserver table so non-owners get their
own per-user values instead of inheriting the owner's.  Drops db_res
which was never overlaid or writable by non-owners.  Also cleans up
orphaned records whose parent server was deleted.

Revision ID: sharedserver_feature_parity
Revises: add_user_id_dbg_args
Create Date: 2026-04-13

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'sharedserver_feature_parity'
down_revision = 'add_user_id_dbg_args'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if not inspector.has_table('sharedserver'):
        return

    # Clean up orphaned SharedServer records whose osid
    # references a Server that no longer exists.
    op.execute(
        "DELETE FROM sharedserver WHERE osid NOT IN "
        "(SELECT id FROM server)"
    )

    # Add missing columns (idempotent — guard against re-runs).
    existing_cols = {
        c['name'] for c in inspector.get_columns('sharedserver')
    }
    new_columns = [
        ('passexec_cmd',
         sa.Column('passexec_cmd', sa.Text(),
                   nullable=True)),
        ('passexec_expiration',
         sa.Column('passexec_expiration', sa.Integer(),
                   nullable=True)),
        ('kerberos_conn',
         sa.Column('kerberos_conn', sa.Boolean(),
                   nullable=False,
                   server_default=sa.false())),
        ('tags',
         sa.Column('tags', sa.JSON(), nullable=True)),
        ('post_connection_sql',
         sa.Column('post_connection_sql', sa.String(),
                   nullable=True)),
    ]
    cols_to_add = [
        col for name, col in new_columns
        if name not in existing_cols
    ]
    if cols_to_add:
        with op.batch_alter_table('sharedserver') as batch_op:
            for col in cols_to_add:
                batch_op.add_column(col)

    # Drop db_res — database restrictions are an owner-level
    # concept; the column was never overlaid or writable by
    # non-owners and its presence invites accidental leakage.
    if 'db_res' in existing_cols:
        with op.batch_alter_table('sharedserver') as batch_op:
            batch_op.drop_column('db_res')


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
