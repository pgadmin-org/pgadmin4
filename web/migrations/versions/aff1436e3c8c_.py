
""" Update the default timeout to 10 seconds instead on 0.
0 indicates wait indefinitely which causes trouble when network connection
to server is lost.

Revision ID: aff1436e3c8c
Revises: a77a0932a568
Create Date: 2019-10-28 12:47:36.828709

"""
from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = 'aff1436e3c8c'
down_revision = 'a77a0932a568'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'UPDATE server SET connect_timeout=10 WHERE connect_timeout=0 OR connect_timeout IS NULL'
    )


def downgrade():
    pass
