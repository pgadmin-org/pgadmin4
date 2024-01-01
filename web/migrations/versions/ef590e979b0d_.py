##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: ef590e979b0d
Revises: d85a62333272
Create Date: 2017-08-23 18:37:14.836988

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ef590e979b0d'
down_revision = 'd85a62333272'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('passfile', sa.String()))
    op.add_column('server', sa.Column('sslcert', sa.String()))
    op.add_column('server', sa.Column('sslkey', sa.String()))
    op.add_column('server', sa.Column('sslrootcert', sa.String()))
    op.add_column('server', sa.Column('sslcrl', sa.String()))
    op.add_column('server', sa.Column('sslcompression', sa.Integer(),
                                      server_default='0'))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
