
"""empty message

Revision ID: ef590e979b0d
Revises: d85a62333272
Create Date: 2017-08-23 18:37:14.836988

"""
from alembic import op
import sqlalchemy as sa
from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = 'ef590e979b0d'
down_revision = 'd85a62333272'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN passfile TEXT'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN sslcert TEXT'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN sslkey TEXT'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN sslrootcert TEXT'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN sslcrl TEXT'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN sslcompression '
        'INTEGER default 0'
    )
    db.engine.execute(
        'UPDATE server SET sslcompression=0'
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
