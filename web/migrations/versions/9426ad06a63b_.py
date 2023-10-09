
"""empty message

Revision ID: 9426ad06a63b
Revises: f656e56dfdc8
Create Date: 2023-10-09 15:09:50.773035

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '9426ad06a63b'
down_revision = 'f656e56dfdc8'
branch_labels = None
depends_on = None


def upgrade():
    # Added sqlite_autoincrement to force sqlite use auto increment instead of last row id for next record.
    # For future changes also do not forget to add table_kwargs={'sqlite_autoincrement': True}.
    with op.batch_alter_table("server", table_kwargs={'sqlite_autoincrement': True}) as batch_op:
        batch_op.alter_column('id', autoincrement=True)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
