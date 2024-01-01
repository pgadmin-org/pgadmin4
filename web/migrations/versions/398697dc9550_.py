##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: 398697dc9550
Revises: a091c9611d20
Create Date: 2020-09-07 15:17:59.473879

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '398697dc9550'
down_revision = 'a091c9611d20'
branch_labels = None
depends_on = None


def upgrade():
    macro_table = op.create_table(
        'macros',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('alt', sa.Boolean(), nullable=False),
        sa.Column('control', sa.Boolean(), nullable=False),
        sa.Column('key', sa.String(length=128), nullable=False),
        sa.Column('key_code', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'))

    op.create_table(
        'user_macros',
        sa.Column('mid', sa.Integer(), nullable=False),
        sa.Column('uid', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=1024), nullable=False),
        sa.Column('sql', sa.String()),
        sa.ForeignKeyConstraint(['mid'], ['macros.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uid'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('mid', 'uid'))

    op.bulk_insert(macro_table, [
        {'alt': 0, 'control': 1, 'key': '1', 'key_code': 49},
        {'alt': 0, 'control': 1, 'key': '2', 'key_code': 50},
        {'alt': 0, 'control': 1, 'key': '3', 'key_code': 51},
        {'alt': 0, 'control': 1, 'key': '4', 'key_code': 52},
        {'alt': 0, 'control': 1, 'key': '5', 'key_code': 53},
        {'alt': 0, 'control': 1, 'key': '6', 'key_code': 54},
        {'alt': 0, 'control': 1, 'key': '7', 'key_code': 55},
        {'alt': 0, 'control': 1, 'key': '8', 'key_code': 56},
        {'alt': 0, 'control': 1, 'key': '9', 'key_code': 57},
        {'alt': 0, 'control': 1, 'key': '0', 'key_code': 48},
        {'alt': 1, 'control': 0, 'key': 'F1', 'key_code': 112},
        {'alt': 1, 'control': 0, 'key': 'F2', 'key_code': 113},
        {'alt': 1, 'control': 0, 'key': 'F3', 'key_code': 114},
        {'alt': 1, 'control': 0, 'key': 'F4', 'key_code': 115},
        {'alt': 1, 'control': 0, 'key': 'F5', 'key_code': 116},
        {'alt': 1, 'control': 0, 'key': 'F6', 'key_code': 117},
        {'alt': 1, 'control': 0, 'key': 'F7', 'key_code': 118},
        {'alt': 1, 'control': 0, 'key': 'F8', 'key_code': 119},
        {'alt': 1, 'control': 0, 'key': 'F9', 'key_code': 120},
        {'alt': 1, 'control': 0, 'key': 'F10', 'key_code': 121},
        {'alt': 1, 'control': 0, 'key': 'F11', 'key_code': 122},
        {'alt': 1, 'control': 0, 'key': 'F12', 'key_code': 123}
    ])


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
