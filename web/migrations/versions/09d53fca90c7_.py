##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Update DB to version 14

Revision ID: 09d53fca90c7
Revises: fdc58d9bd449
Create Date: 2017-03-13 12:27:30.543908

"""
import base64
import os
import config
import sqlalchemy as sa
from alembic import op
from pgadmin.model import db, Server
from pgadmin.setup import get_version_for_migration

# revision identifiers, used by Alembic.

revision = '09d53fca90c7'
down_revision = 'fdc58d9bd449'
branch_labels = None
depends_on = None


def upgrade():
    version = get_version_for_migration(op)
    # Changes introduced in schema version 2
    if version < 2:
        # Create the 'server' table
        db.metadata.create_all(db.engine, tables=[Server.__table__])
    if version < 3:
        op.add_column('server', sa.Column('comment', sa.String(length=1024)))
    if version < 4:
        op.add_column('server', sa.Column('password', sa.String()))
    if version < 5:
        op.add_column('server', sa.Column('role', sa.String(length=64)))
    if version < 6:
        with op.batch_alter_table("server") as batch_op:
            batch_op.create_check_constraint(
                "ck_port_range",
                "port >= 1024 AND port <= 65535"
            )

            batch_op.create_check_constraint(
                "ck_ssl_mode",
                "ssl_mode IN ('allow', 'prefer', 'require', 'disable', \
                'verify-ca', 'verify-full')"
            )
    if version < 8:
        op.create_table(
            'module_preference',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('name', sa.String(length=256), nullable=False),
            sa.PrimaryKeyConstraint('id'))

        op.create_table(
            'preference_category',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('mid', sa.Integer(),),
            sa.Column('name', sa.String(length=256), nullable=False),
            sa.ForeignKeyConstraint(['mid'], ['module_preference.id'], ),
            sa.PrimaryKeyConstraint('id'))

        op.create_table(
            'preferences',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('cid', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=256), nullable=False),
            sa.ForeignKeyConstraint(['cid'], ['preference_category.id'], ),
            sa.PrimaryKeyConstraint('id'))

        op.create_table(
            'user_preferences',
            sa.Column('pid', sa.Integer(), nullable=False),
            sa.Column('uid', sa.Integer(), nullable=False),
            sa.Column('value', sa.String(length=1024), nullable=False),
            sa.ForeignKeyConstraint(['pid'], ['preferences.id'],
                                    ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['uid'], ['user.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('pid', 'uid'))

    if version < 9:
        op.create_table(
            'debugger_function_arguments',
            sa.Column('server_id', sa.Integer(), nullable=False),
            sa.Column('database_id', sa.Integer(), nullable=False),
            sa.Column('schema_id', sa.Integer(), nullable=False),
            sa.Column('function_id', sa.Integer(), nullable=False),
            sa.Column('arg_id', sa.Integer(), nullable=False),
            sa.Column('is_null', sa.Integer(), nullable=False),
            sa.Column('is_expression', sa.Integer(), nullable=False),
            sa.Column('use_default', sa.Integer()),
            sa.Column('value', sa.String(), nullable=False),
            sa.CheckConstraint('is_null >= 0 AND is_null <= 1'),
            sa.CheckConstraint('is_expression >= 0 AND is_expression <= 1'),
            sa.CheckConstraint('use_default >= 0 AND use_default <= 1'),
            sa.PrimaryKeyConstraint('server_id', 'database_id', 'schema_id',
                                    'function_id', 'arg_id'))
    if version < 10:
        op.create_table(
            'process',
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('pid', sa.String(), nullable=False),
            sa.Column('desc', sa.String(), nullable=False),
            sa.Column('command', sa.String(), nullable=False),
            sa.Column('arguments', sa.String()),
            sa.Column('start_time', sa.String()),
            sa.Column('end_time', sa.String()),
            sa.Column('logdir', sa.String()),
            sa.Column('exit_code', sa.Integer()),
            sa.Column('acknowledge', sa.String()),
            sa.ForeignKeyConstraint(['user_id'], ['user.id'],
                                    ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('pid'))

    if version < 11:
        # get metadata from current connection
        meta = sa.MetaData()
        # define table representation
        meta.reflect(op.get_bind(), only=('role',))
        role_table = sa.Table('role', meta)

        op.execute(
            role_table.update().where(role_table.c.name == 'Administrators')
            .values(name='Administrator',
                    description='pgAdmin Administrator Role'))

        op.bulk_insert(role_table,
                       [{'name': 'User', 'description': 'pgAdmin User Role'}])

    if version < 13:
        op.add_column('server', sa.Column('discovery_id', sa.String()))

    if version < 14:
        keys_table = op.create_table(
            'keys',
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('value', sa.String(), nullable=False),
            sa.PrimaryKeyConstraint('name'))

        secret_key = base64.urlsafe_b64encode(os.urandom(32)).decode()
        if hasattr(config, 'SECRET_KEY'):
            secret_key = config.SECRET_KEY

        # If SECURITY_PASSWORD_SALT is not in the config, but we're upgrading,
        # then it must (unless the user edited the main config - which they
        # shouldn't have done) have been at it's default value, so we'll use
        # that. Otherwise, use whatever we can find in the config.
        security_password_salt = 'SuperSecret3'
        if hasattr(config, 'SECURITY_PASSWORD_SALT'):
            security_password_salt = config.SECURITY_PASSWORD_SALT

        op.bulk_insert(keys_table,
                       [{'name': 'CSRF_SESSION_KEY', 'value':
                           base64.urlsafe_b64encode(os.urandom(32)).decode()},
                        {'name': 'SECRET_KEY', 'value': secret_key},
                        {'name': 'SECURITY_PASSWORD_SALT',
                         'value': security_password_salt}])

    # get metadata from current connection
    meta = sa.MetaData()
    # define table representation
    meta.reflect(op.get_bind(), only=('version',))
    version_table = sa.Table('version', meta)

    op.execute(
        version_table.update().where(version_table.c.name == 'ConfigDB')
        .values(value=config.SETTINGS_SCHEMA_VERSION))
    # ### end Alembic commands ###


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
