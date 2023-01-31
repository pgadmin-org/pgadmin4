##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
""" Used for connection parameter changes in the server table.

Revision ID: f656e56dfdc8
Revises: f79844e926ae
Create Date: 2023-01-02 14:52:48.109290

"""
import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = 'f656e56dfdc8'
down_revision = 'f79844e926ae'
branch_labels = None
depends_on = None


def migrate_connection_params(table_name):
    """
    This function is used to add connection parameter as JSON data and drop
    unused columns.
    """
    op.add_column(table_name,
                  sa.Column('connection_params', sa.JSON()))

    # define table representation
    meta = sa.MetaData(bind=op.get_bind())
    meta.reflect(only=(table_name,))
    server_table = sa.Table(table_name, meta)

    # Create a select statement
    stmt = sa.select([
        server_table.columns.id, server_table.columns.ssl_mode,
        server_table.columns.sslcert, server_table.columns.sslkey,
        server_table.columns.sslrootcert, server_table.columns.sslcrl,
        server_table.columns.sslcompression, server_table.columns.hostaddr,
        server_table.columns.passfile, server_table.columns.connect_timeout
    ])

    # Fetch the data from the server table
    results = op.get_bind().execute(stmt).fetchall()
    for rows in results:
        connection_params = {}
        server_id = 0
        for key, value in rows.items():
            if key == 'id':
                server_id = value
            # Name is changed from ssl_mode to sslmode
            if key == 'ssl_mode':
                key = 'sslmode'

            if value is not None and key != 'id':
                connection_params[key] = value

        # Update the newly added column with JSON data.
        op.execute(
            server_table.update().where(server_table.columns.id == server_id)
            .values(connection_params=connection_params)
        )

    # Drop constraint on ssl_mode column.
    if table_name == 'server':
        try:
            with op.batch_alter_table(table_name) as batch_op:
                batch_op.drop_constraint('ck_ssl_mode')
        except Exception:
            pass

    # Drop unused columns
    with op.batch_alter_table(table_name) as batch_op:
        batch_op.drop_column('ssl_mode')
        batch_op.drop_column('sslcert')
        batch_op.drop_column('sslkey')
        batch_op.drop_column('sslrootcert')
        batch_op.drop_column('sslcrl')
        batch_op.drop_column('sslcompression')
        batch_op.drop_column('hostaddr')
        batch_op.drop_column('passfile')
        batch_op.drop_column('connect_timeout')


def upgrade():
    migrate_connection_params('server')
    migrate_connection_params('sharedserver')

    # Increasing the length of the value column of the setting table.
    with op.batch_alter_table("setting") as batch_op:
        batch_op.alter_column('value',
                              existing_type=sa.String(length=1024),
                              type_=sa.Text(),
                              postgresql_using='value::text')


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
