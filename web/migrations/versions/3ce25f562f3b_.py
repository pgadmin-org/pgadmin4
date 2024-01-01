##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""

Revision ID: 3ce25f562f3b
Revises: 6650c52670c2
Create Date: 2021-12-01 11:52:09.037749

"""

# revision identifiers, used by Alembic.
revision = '3ce25f562f3b'
down_revision = '6650c52670c2'
branch_labels = None
depends_on = None


def upgrade():
    # After using alembic the old logic is not required.
    pass


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
