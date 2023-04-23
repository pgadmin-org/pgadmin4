##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: a091c9611d20
Revises: 84700139beb0
Create Date: 2020-07-14 17:20:22.705737

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a091c9611d20'
down_revision = '84700139beb0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('shared', sa.Boolean()))
    op.create_table(
        'sharedserver',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('server_owner', sa.String(length=64)),
        sa.Column('servergroup_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('host', sa.String(length=128)),
        sa.Column('port', sa.Integer(), nullable=False),
        sa.Column('maintenance_db', sa.String(length=64)),
        sa.Column('username', sa.String(length=64)),
        sa.Column('password', sa.String()),
        sa.Column('role', sa.String(length=64)),
        sa.Column('ssl_mode', sa.String(length=16), nullable=False),
        sa.Column('comment', sa.String(length=1024)),
        sa.Column('discovery_id', sa.String(length=128)),
        sa.Column('hostaddr', sa.String(length=1024)),
        sa.Column('db_res', sa.String()),
        sa.Column('passfile', sa.String()),
        sa.Column('sslcert', sa.String()),
        sa.Column('sslkey', sa.String()),
        sa.Column('sslrootcert', sa.String()),
        sa.Column('sslcrl', sa.String()),
        sa.Column('sslcompression', sa.Integer(), server_default='0'),
        sa.Column('bgcolor', sa.String(length=10)),
        sa.Column('fgcolor', sa.String(length=10)),
        sa.Column('service', sa.String()),
        sa.Column('use_ssh_tunnel', sa.Integer(), server_default='0'),
        sa.Column('tunnel_host', sa.String()),
        sa.Column('tunnel_port', sa.String()),
        sa.Column('tunnel_username', sa.String()),
        sa.Column('tunnel_authentication', sa.Integer(), server_default='0'),
        sa.Column('tunnel_identity_file', sa.String()),
        sa.Column('shared', sa.Boolean(), nullable=False),
        sa.Column('save_password', sa.Integer(), server_default='0'),
        sa.Column('tunnel_password', sa.String()),
        sa.Column('connect_timeout', sa.Integer()),
        sa.CheckConstraint("ssl_mode IN ('allow', 'prefer', 'require', \
            'disable', 'verify-ca', 'verify-full')"),
        sa.ForeignKeyConstraint(['servergroup_id'], ['servergroup.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'))

    # Named constraint
    with op.batch_alter_table("sharedserver") as batch_op:
        batch_op.create_check_constraint('ck_shared_server_port',
                                         'port >= 1024 AND port <= 65535')


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
