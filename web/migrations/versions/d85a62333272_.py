
"""empty message

Revision ID: d85a62333272
Revises: 3c1e4b6eda55
Create Date: 2017-07-07 16:03:23.842734

"""
from pgadmin.model import db


# revision identifiers, used by Alembic.
revision = 'd85a62333272'
down_revision = 'f195f9a4923d'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN db_res TEXT'
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
