##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2022, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Added server id for cloud deployment

Revision ID: 1586db67b98e
Revises: 15c88f765bc8
Create Date: 2022-01-04 13:08:05.484598

"""
from pgadmin.model import db


# revision identifiers, used by Alembic.
revision = '1586db67b98e'
down_revision = '15c88f765bc8'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE process ADD COLUMN server_id INTEGER DEFAULT 0'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN cloud_status INTEGER DEFAULT 0'
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
