
"""empty message

Revision ID: e24b1c4def17
Revises: c62bcc14c3d6
Create Date: 2025-07-14 10:49:07.292086

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e24b1c4def17'
down_revision = 'c62bcc14c3d6'
branch_labels = None
depends_on = None


def upgrade():
    # delete all data from the table
    op.execute("DELETE FROM application_state")

    # drop the 'tool_name' column
    op.drop_column('application_state', 'tool_name')


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
