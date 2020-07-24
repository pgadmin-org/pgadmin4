##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Add a column to save password option which will be useful when Trust mode

Revision ID: d39482714a2e
Revises: 7fedf8531802
Create Date: 2020-04-09 13:20:13.939775

"""
from alembic import op
import sqlalchemy as sa
from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = 'd39482714a2e'
down_revision = '7fedf8531802'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN save_password INTEGER DEFAULT 0'
    )
    # If password is already exists for any existing server then change the
    # save_password column to 1 (True) else set 0
    db.engine.execute(
        """
        UPDATE server SET save_password = (
            CASE WHEN password IS NOT NULL AND password != '' THEN
                1
            ELSE
                0
            END
        )
        """
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
