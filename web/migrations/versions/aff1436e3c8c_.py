##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
""" Update the default timeout to 10 seconds instead on 0.
0 indicates wait indefinitely which causes trouble when network connection
to server is lost.

Revision ID: aff1436e3c8c
Revises: a77a0932a568
Create Date: 2019-10-28 12:47:36.828709

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'aff1436e3c8c'
down_revision = 'a77a0932a568'
branch_labels = None
depends_on = None


def upgrade():
    # get metadata from current connection
    meta = sa.MetaData(bind=op.get_bind())
    # define table representation
    meta.reflect(only=('server',))
    server_table = sa.Table('server', meta)
    op.execute(
        server_table.update().where(server_table.c.connect_timeout == 0 or
                                    server_table.c.connect_timeout is None)
        .values(connect_timeout=10)
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
