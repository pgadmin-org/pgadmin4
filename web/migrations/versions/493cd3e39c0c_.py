
"""empty message

Revision ID: 493cd3e39c0c
Revises: 7c56ea250085
Create Date: 2018-06-18 11:26:33.285037

"""
from alembic import op
import sqlalchemy as sa
from pgadmin.model import db


# revision identifiers, used by Alembic.
revision = '493cd3e39c0c'
down_revision = '7c56ea250085'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN connect_timeout INTEGER DEFAULT 0'
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
