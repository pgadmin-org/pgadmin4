##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: d85a62333272
Revises: 3c1e4b6eda55
Create Date: 2017-07-07 16:03:23.842734

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'd85a62333272'
down_revision = 'f195f9a4923d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('db_res', sa.String()))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
