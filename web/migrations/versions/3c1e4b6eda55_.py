##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: 3c1e4b6eda55
Revises: 09d53fca90c7
Create Date: 2017-06-13 17:05:30.671859

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '3c1e4b6eda55'
down_revision = '09d53fca90c7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('hostaddr', sa.String(length=1024)))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
