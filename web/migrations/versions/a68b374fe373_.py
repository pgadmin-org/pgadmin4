
"""Added columns for SSH tunneling

Revision ID: a68b374fe373
Revises: 50aad68f99c2
Create Date: 2018-04-05 13:59:57.588355

"""
from alembic import op
import sqlalchemy as sa
from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = 'a68b374fe373'
down_revision = '50aad68f99c2'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN use_ssh_tunnel INTEGER DEFAULT 0'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN tunnel_host TEXT'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN tunnel_port TEXT'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN tunnel_username TEXT'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN tunnel_authentication INTEGER DEFAULT 0'
    )
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN tunnel_identity_file TEXT'
    )

def downgrade():
    pass
