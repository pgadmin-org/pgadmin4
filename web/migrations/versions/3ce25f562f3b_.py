##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2022, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""empty message

Revision ID: 3ce25f562f3b
Revises: 6650c52670c2
Create Date: 2021-12-01 11:52:09.037749

"""
from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = '3ce25f562f3b'
down_revision = '6650c52670c2'
branch_labels = None
depends_on = None


def upgrade():
    # Rename user table to user_old and again user_old to user to change
    # the foreign key refernce of user_old table which is not exists

    db.engine.execute("ALTER TABLE user RENAME TO user_old")

    db.engine.execute("ALTER TABLE user_old RENAME TO user")

    # Rename server table to server_old and again server_old to server to change
    # the foreign key refernce of server_old table which is not exists
    db.engine.execute("ALTER TABLE server RENAME TO server_old")

    db.engine.execute("ALTER TABLE server_old RENAME TO server")


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
