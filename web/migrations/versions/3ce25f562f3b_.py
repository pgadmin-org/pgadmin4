##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
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
    db.engine.execute("create table user_old as select * from user")

    db.engine.execute("DROP TABLE user")

    db.engine.execute("ALTER TABLE user_old RENAME TO user")


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
