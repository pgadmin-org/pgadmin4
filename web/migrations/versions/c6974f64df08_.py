
"""empty message

Revision ID: c6974f64df08
Revises: a39bd015b644
Create Date: 2021-04-22 10:06:21.282770

"""
from pgadmin.model import db



# revision identifiers, used by Alembic.
revision = 'c6974f64df08'
down_revision = 'a39bd015b644'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE sharedserver ADD COLUMN osid INTEGER'
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
