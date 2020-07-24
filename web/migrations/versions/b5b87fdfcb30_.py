##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Added state of the utility process

Revision ID: b5b87fdfcb30
Revises: ece2e76bf60e
Create Date: 2018-10-24 12:37:59.487969

"""
from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = 'b5b87fdfcb30'
down_revision = 'ece2e76bf60e'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE process ADD COLUMN process_state INTEGER DEFAULT 0'
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
