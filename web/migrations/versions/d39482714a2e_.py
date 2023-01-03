##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Add a column to save password option which will be useful when Trust mode

Revision ID: d39482714a2e
Revises: 7fedf8531802
Create Date: 2020-04-09 13:20:13.939775

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd39482714a2e'
down_revision = '7fedf8531802'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('server', sa.Column('save_password', sa.Integer(),
                                      server_default='0'))
    # If password is already exists for any existing server then change the
    # save_password column to 1 (True) else set 0
    # get metadata from current connection
    meta = sa.MetaData(bind=op.get_bind())
    # define table representation
    meta.reflect(only=('server',))
    server_table = sa.Table('server', meta)

    op.execute(
        server_table.update().values(save_password=sa.case(
            (server_table.c.password != 'NULL' and
             server_table.c.password != '', 1), else_=0)
        ))


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
