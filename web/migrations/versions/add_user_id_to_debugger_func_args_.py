##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Add user_id to debugger_function_arguments and indexes for data isolation

Revision ID: add_user_id_dbg_args
Revises: add_tools_ai_perm
Create Date: 2026-04-08

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_user_id_dbg_args'
down_revision = 'add_tools_ai_perm'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    # --- DebuggerFunctionArguments: add user_id to composite PK ---
    if dialect == 'sqlite':
        # SQLite cannot ALTER composite PKs. Recreate the table.
        # Existing debugger argument data is ephemeral (cached function
        # args) so dropping is acceptable.
        op.execute(
            'DROP TABLE IF EXISTS debugger_function_arguments'
        )
        op.create_table(
            'debugger_function_arguments',
            sa.Column('user_id', sa.Integer(),
                      sa.ForeignKey('user.id'), nullable=False),
            sa.Column('server_id', sa.Integer(), nullable=False),
            sa.Column('database_id', sa.Integer(), nullable=False),
            sa.Column('schema_id', sa.Integer(), nullable=False),
            sa.Column('function_id', sa.Integer(), nullable=False),
            sa.Column('arg_id', sa.Integer(), nullable=False),
            sa.Column('is_null', sa.Integer(), nullable=False),
            sa.Column('is_expression', sa.Integer(), nullable=False),
            sa.Column('use_default', sa.Integer(), nullable=False),
            sa.Column('value', sa.String(), nullable=True),
            sa.PrimaryKeyConstraint(
                'user_id', 'server_id', 'database_id',
                'schema_id', 'function_id', 'arg_id'
            ),
            sa.CheckConstraint('is_null >= 0 AND is_null <= 1'),
            sa.CheckConstraint(
                'is_expression >= 0 AND is_expression <= 1'),
            sa.CheckConstraint(
                'use_default >= 0 AND use_default <= 1'),
        )
    else:
        # PostgreSQL: add column, backfill from server owner, recreate
        # PK using batch_alter_table for portability.
        op.add_column(
            'debugger_function_arguments',
            sa.Column('user_id', sa.Integer(),
                      sa.ForeignKey('user.id'), nullable=True)
        )
        # Backfill: assign user_id from the server's owner
        op.execute(
            'UPDATE debugger_function_arguments '
            'SET user_id = s.user_id '
            'FROM server s '
            'WHERE debugger_function_arguments.server_id = s.id'
        )
        # Delete orphans (rows with no matching server)
        op.execute(
            'DELETE FROM debugger_function_arguments '
            'WHERE user_id IS NULL'
        )
        op.alter_column(
            'debugger_function_arguments', 'user_id', nullable=False
        )
        # Recreate PK with user_id using batch_alter_table
        with op.batch_alter_table(
            'debugger_function_arguments'
        ) as batch:
            batch.drop_constraint(
                'debugger_function_arguments_pkey', type_='primary'
            )
            batch.create_primary_key(
                'debugger_function_arguments_pkey',
                ['user_id', 'server_id', 'database_id',
                 'schema_id', 'function_id', 'arg_id']
            )

    # --- Indexes for data isolation query performance ---
    # Only create indexes on tables that exist (sharedserver may be
    # absent in older schemas that haven't run all prior migrations).
    inspector = sa.inspect(conn)
    index_stmts = [
        ('server',
         'CREATE INDEX IF NOT EXISTS ix_server_user_id '
         'ON server (user_id)'),
        ('server',
         'CREATE INDEX IF NOT EXISTS ix_server_servergroup_id '
         'ON server (servergroup_id)'),
        ('sharedserver',
         'CREATE INDEX IF NOT EXISTS ix_sharedserver_user_id '
         'ON sharedserver (user_id)'),
        ('sharedserver',
         'CREATE INDEX IF NOT EXISTS ix_sharedserver_osid '
         'ON sharedserver (osid)'),
        ('servergroup',
         'CREATE INDEX IF NOT EXISTS ix_servergroup_user_id '
         'ON servergroup (user_id)'),
    ]
    for table_name, stmt in index_stmts:
        if inspector.has_table(table_name):
            op.execute(stmt)

    # --- Unique constraint on SharedServer(osid, user_id) ---
    # Prevents duplicate SharedServer records from TOCTOU race.
    # First remove duplicates (keep lowest id per osid+user_id).
    if inspector.has_table('sharedserver'):
        if dialect == 'sqlite':
            op.execute(
                'DELETE FROM sharedserver WHERE id NOT IN '
                '(SELECT MIN(id) FROM sharedserver '
                'GROUP BY osid, user_id)'
            )
        else:
            op.execute(
                'DELETE FROM sharedserver s1 USING '
                'sharedserver s2 WHERE s1.osid = s2.osid '
                'AND s1.user_id = s2.user_id '
                'AND s1.id > s2.id'
            )
        with op.batch_alter_table('sharedserver') as batch:
            batch.create_unique_constraint(
                'uq_sharedserver_osid_user',
                ['osid', 'user_id']
            )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
