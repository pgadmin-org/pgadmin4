##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Normalize User.locked column data from TEXT to integer 0/1 (SQLite only)

Migration 6650c52670c2 added the locked column with
``server_default='false'``. SQLite has no native BOOLEAN affinity, so the
literal 'false' was stored as TEXT both in the column DEFAULT and on
existing rows backfilled by the ALTER TABLE. SQLAlchemy's Boolean
processor then reads that TEXT back as Python ``True`` (because
``bool('false')`` is ``True`` for any non-empty string), which means any
code that branches on ``User.locked`` sees a locked-out account where
the data should be unlocked.

This was harmless for years because the only writer (the lockout block in
``/authenticate/login``) writes Python ``True``/``False`` (stored as
integer 1/0), and no reader branched on the field. The ``User.is_active``
and ``User.is_locked`` overrides added for the lockout-bypass fix are
the first readers, so they trip over every legacy row.

The data corruption is SQLite-specific. PostgreSQL accepts the string
``'false'`` for a BOOLEAN column and coerces it on insert, so existing
rows on a PostgreSQL config DB already hold proper boolean values and
need no fix. Restrict the data normalization to SQLite — the integer
literals below would also fail on PostgreSQL because the locked column
is BOOLEAN, not INTEGER.

Revision ID: normalize_locked_text_default
Revises: sharedserver_feature_parity
Create Date: 2026-05-05

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'normalize_locked_text_default'
down_revision = 'sharedserver_feature_parity'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != 'sqlite':
        # On PostgreSQL the locked column was always stored as a proper
        # BOOLEAN, so there is nothing to normalize. Skip — UPDATEs with
        # integer literals against a BOOLEAN column would otherwise raise
        # "column locked is of type boolean but expression is of type
        # integer" on PostgreSQL.
        return

    op.execute(
        "UPDATE \"user\" SET locked = 1 "
        "WHERE LOWER(CAST(locked AS TEXT)) IN ('true', 't', 'yes', 'y', '1')"
    )
    op.execute(
        "UPDATE \"user\" SET locked = 0 "
        "WHERE locked IS NULL OR LOWER(CAST(locked AS TEXT)) NOT IN "
        "('true', 't', 'yes', 'y', '1')"
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
