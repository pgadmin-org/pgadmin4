##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Remove passfile values copied from the owner into sharedserver rows

Before 9.15 (#9830), the first time a non-owner opened a shared server
the owner's connection_params were copied verbatim into the user's
sharedserver row, passfile included. The owner's passfile is a
credential source and, like the owner's password, SSH tunnel password
and identity file, and SSL client certificate and key paths, it is not
something a non-owner may inherit. Newer rows never receive it, but
rows created before 9.15 still carry the copy.

The sharedserver table records no provenance, so a stored passfile
cannot be told apart from one the user typed in themselves except by
value: a copy taken from the owner is identical to the owner's own
setting. Remove the sharedserver passfile wherever it still equals the
owner's, which is the only case that can be recognised. A user who had
deliberately entered the same path since 9.15 loses it once and can
simply set it again, after which it is kept because nothing copies the
owner's value any more. A copy whose owner has since changed their
passfile cannot be recognised and is left alone; the user can delete
it from the server dialog.

Revision ID: strip_inherited_passfile
Revises: normalize_locked_text_default
Create Date: 2026-10-12

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'strip_inherited_passfile'
down_revision = 'normalize_locked_text_default'
branch_labels = None
depends_on = None


def strip_owner_passfile_copies(conn):
    """Delete passfile from every sharedserver row whose value equals
    the owner server's passfile. Returns the number of rows changed.

    Takes a bare SQLAlchemy connection so the logic can be exercised
    outside Alembic.
    """
    server = sa.table(
        'server',
        sa.column('id', sa.Integer),
        sa.column('connection_params', sa.JSON),
    )
    sharedserver = sa.table(
        'sharedserver',
        sa.column('id', sa.Integer),
        sa.column('osid', sa.Integer),
        sa.column('connection_params', sa.JSON),
    )

    rows = conn.execute(
        sa.select(
            sharedserver.c.id,
            sharedserver.c.connection_params,
            server.c.connection_params.label('owner_params'),
        ).select_from(
            sharedserver.join(server, sharedserver.c.osid == server.c.id)
        )
    ).fetchall()

    changed = 0
    for ss_id, ss_params, owner_params in rows:
        if not isinstance(ss_params, dict) or 'passfile' not in ss_params:
            continue
        owner_passfile = (owner_params or {}).get('passfile') \
            if isinstance(owner_params, dict) else None
        if owner_passfile is None or ss_params['passfile'] != owner_passfile:
            continue

        cleaned = {k: v for k, v in ss_params.items() if k != 'passfile'}
        conn.execute(
            sharedserver.update()
            .where(sharedserver.c.id == ss_id)
            .values(connection_params=cleaned)
        )
        changed += 1

    return changed


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if not inspector.has_table('sharedserver'):
        return

    strip_owner_passfile_copies(conn)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
