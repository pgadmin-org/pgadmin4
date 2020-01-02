##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""
Adding new columns to store background & foreground (Feature: RM#1383)

Revision ID: 02b9dccdcfcb
Revises: ef590e979b0d
Create Date: 2017-11-14 19:09:04.674575

"""
from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = '02b9dccdcfcb'
down_revision = 'ef590e979b0d'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN bgcolor TEXT(10)'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN fgcolor TEXT(10)'
    )

def downgrade():
    pass
