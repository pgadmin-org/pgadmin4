
"""empty message

Revision ID: 3c1e4b6eda55
Revises: 09d53fca90c7
Create Date: 2017-06-13 17:05:30.671859

"""

from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = '3c1e4b6eda55'
down_revision = '09d53fca90c7'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN hostaddr TEXT(1024)'
    )


def downgrade():
    pass
