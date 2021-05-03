
"""empty message

Revision ID: d0bc9f32b2b9
Revises: c6974f64df08
Create Date: 2021-04-27 12:40:08.899712

"""
from alembic import op
import sqlalchemy as sa
from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = 'd0bc9f32b2b9'
down_revision = 'c6974f64df08'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN kerberos_conn INTEGER DEFAULT 0'
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
