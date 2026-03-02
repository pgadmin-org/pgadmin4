##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Add AWS IAM authentication support

Added use_iam_auth, aws_profile, aws_region, and aws_role_arn columns
to server configuration for AWS RDS/Aurora IAM authentication.

Revision ID: 7ce2161fb957
Revises: 018e16dad6aa
Create Date: 2026-01-30 11:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '7ce2161fb957'
down_revision = '018e16dad6aa'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('use_iam_auth', sa.Boolean(),
                                       server_default='0', nullable=False))
    op.add_column('server', sa.Column('aws_profile', sa.String(length=64)))
    op.add_column('server', sa.Column('aws_region', sa.String(length=32)))
    op.add_column('server', sa.Column('aws_role_arn', sa.String(length=256)))
    # ### end Alembic commands ###


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
