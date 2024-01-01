##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Add support for prepare_threshold param
https://www.psycopg.org/psycopg3/docs/advanced/prepare.html#prepared-statements

Revision ID: 44b9ce549393
Revises: 9426ad06a63b
Create Date: 2023-10-12 12:15:01.757931

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '44b9ce549393'
down_revision = '9426ad06a63b'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table(
            "server", table_kwargs={'sqlite_autoincrement': True}) as batch_op:
        batch_op.add_column(sa.Column('prepare_threshold', sa.Integer(),
                                      nullable=True))

    with op.batch_alter_table("sharedserver") as batch_op:
        batch_op.add_column(sa.Column('prepare_threshold', sa.Integer(),
                                      nullable=True))

    # get metadata from current connection
    meta = sa.MetaData()
    # define table representation
    meta.reflect(op.get_bind(), only=('server', 'sharedserver'))
    table = sa.Table('server', meta)
    op.execute(
        table.update().values(prepare_threshold=5)
    )
    table = sa.Table('sharedserver', meta)
    op.execute(
        table.update().values(prepare_threshold=5)
    )

def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
