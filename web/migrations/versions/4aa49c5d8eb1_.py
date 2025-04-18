
"""empty message

Revision ID: 4aa49c5d8eb1
Revises: 1f0eddc8fc79
Create Date: 2025-04-17 15:20:29.605023

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '4aa49c5d8eb1'
down_revision = '1f0eddc8fc79'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'pgadmin_state_data',
        sa.Column('uid', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer()),
        sa.Column('connection_info', sa.JSON()),
        sa.Column('tool_name', sa.String()),
        sa.Column('tool_data', sa.String()),
        sa.ForeignKeyConstraint(['uid'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', 'uid'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
