##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
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
import sys

import config
from pgadmin.model import db, Server
from pgadmin.setup import get_version

# revision identifiers, used by Alembic.

revision = '09d53fca90c7'
down_revision = 'fdc58d9bd449'
branch_labels = None
depends_on = None


def upgrade():
    version = get_version()
    # Changes introduced in schema version 2
    if version < 2:
        # Create the 'server' table
        db.metadata.create_all(db.engine, tables=[Server.__table__])
    if version < 3:
        db.engine.execute(
            'ALTER TABLE server ADD COLUMN comment TEXT(1024)'
        )
    if version < 4:
        db.engine.execute(
            'ALTER TABLE server ADD COLUMN password TEXT(64)'
        )
    if version < 5:
        db.engine.execute('ALTER TABLE server ADD COLUMN role text(64)')
    if version < 6:
        db.engine.execute("ALTER TABLE server RENAME TO server_old")
        db.engine.execute("""
    CREATE TABLE server (
        id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        servergroup_id INTEGER NOT NULL,
        name VARCHAR(128) NOT NULL,
        host VARCHAR(128) NOT NULL,
        port INTEGER NOT NULL CHECK (port >= 1024 AND port <= 65534),
        maintenance_db VARCHAR(64) NOT NULL,
        username VARCHAR(64) NOT NULL,
        ssl_mode VARCHAR(16) NOT NULL CHECK (
            ssl_mode IN (
                'allow', 'prefer', 'require', 'disable', 'verify-ca', 'verify-full'
                )),
        comment VARCHAR(1024), password TEXT(64), role text(64),
        PRIMARY KEY (id),
        FOREIGN KEY(user_id) REFERENCES user (id),
        FOREIGN KEY(servergroup_id) REFERENCES servergroup (id)
    )""")
        db.engine.execute("""
    INSERT INTO server (
        id, user_id, servergroup_id, name, host, port, maintenance_db, username,
        ssl_mode, comment, password, role
    ) SELECT
        id, user_id, servergroup_id, name, host, port, maintenance_db, username,
        ssl_mode, comment, password, role
    FROM server_old""")
        db.engine.execute("DROP TABLE server_old")

    if version < 8:
        db.engine.execute("""
    CREATE TABLE module_preference(
        id INTEGER PRIMARY KEY,
        name VARCHAR(256) NOT NULL
        )""")

        db.engine.execute("""
    CREATE TABLE preference_category(
        id INTEGER PRIMARY KEY,
        mid INTEGER,
        name VARCHAR(256) NOT NULL,

        FOREIGN KEY(mid) REFERENCES module_preference(id)
        )""")

        db.engine.execute("""
    CREATE TABLE preferences (

        id INTEGER PRIMARY KEY,
        cid INTEGER NOT NULL,
        name VARCHAR(256) NOT NULL,

        FOREIGN KEY(cid) REFERENCES preference_category (id)
        )""")

        db.engine.execute("""
    CREATE TABLE user_preferences (

        pid INTEGER,
        uid INTEGER,
        value VARCHAR(1024) NOT NULL,

        PRIMARY KEY (pid, uid),
        FOREIGN KEY(pid) REFERENCES preferences (pid),
        FOREIGN KEY(uid) REFERENCES user (id)
        )""")

    if version < 9:
        db.engine.execute("""
    CREATE TABLE IF NOT EXISTS debugger_function_arguments (
        server_id INTEGER ,
        database_id INTEGER ,
        schema_id INTEGER ,
        function_id INTEGER ,
        arg_id INTEGER ,
        is_null INTEGER NOT NULL CHECK (is_null >= 0 AND is_null <= 1) ,
        is_expression INTEGER NOT NULL CHECK (is_expression >= 0 AND is_expression <= 1) ,
        use_default INTEGER NOT NULL CHECK (use_default >= 0 AND use_default <= 1) ,
        value TEXT,
        PRIMARY KEY (server_id, database_id, schema_id, function_id, arg_id)
        )""")

    if version < 10:
        db.engine.execute("""
    CREATE TABLE process(
        user_id INTEGER NOT NULL,
        pid TEXT NOT NULL,
        desc TEXT NOT NULL,
        command TEXT NOT NULL,
        arguments TEXT,
        start_time TEXT,
        end_time TEXT,
        logdir TEXT,
        exit_code INTEGER,
        acknowledge TEXT,
        PRIMARY KEY(pid),
        FOREIGN KEY(user_id) REFERENCES user (id)
        )""")

    if version < 11:
        db.engine.execute("""
    UPDATE role
        SET name = 'Administrator',
        description = 'pgAdmin Administrator Role'
        WHERE name = 'Administrators'
        """)

        db.engine.execute("""
    INSERT INTO role ( name, description )
                VALUES ('User', 'pgAdmin User Role')
        """)

    if version < 12:
        db.engine.execute("ALTER TABLE server RENAME TO server_old")
        db.engine.execute("""
    CREATE TABLE server (
        id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        servergroup_id INTEGER NOT NULL,
        name VARCHAR(128) NOT NULL,
        host VARCHAR(128) NOT NULL,
        port INTEGER NOT NULL CHECK (port >= 1024 AND port <= 65535),
        maintenance_db VARCHAR(64) NOT NULL,
        username VARCHAR(64) NOT NULL,
        ssl_mode VARCHAR(16) NOT NULL CHECK (
            ssl_mode IN (
                'allow', 'prefer', 'require', 'disable', 'verify-ca', 'verify-full'
                )),
        comment VARCHAR(1024), password TEXT(64), role text(64),
        PRIMARY KEY (id),
        FOREIGN KEY(user_id) REFERENCES user (id),
        FOREIGN KEY(servergroup_id) REFERENCES servergroup (id)
    )""")
        db.engine.execute("""
    INSERT INTO server (
        id, user_id, servergroup_id, name, host, port, maintenance_db, username,
        ssl_mode, comment, password, role
    ) SELECT
        id, user_id, servergroup_id, name, host, port, maintenance_db, username,
        ssl_mode, comment, password, role
    FROM server_old""")
        db.engine.execute("DROP TABLE server_old")

    if version < 13:
        db.engine.execute("""
    ALTER TABLE SERVER
        ADD COLUMN discovery_id TEXT
        """)

    if version < 14:
        db.engine.execute("""
    CREATE TABLE keys (
        name TEST NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (name))
                    """)

        sql = "INSERT INTO keys (name, value) VALUES ('CSRF_SESSION_KEY', '%s')" % base64.urlsafe_b64encode(
            os.urandom(32)).decode()
        db.engine.execute(sql)

        sql = "INSERT INTO keys (name, value) VALUES ('SECRET_KEY', '%s')" % base64.urlsafe_b64encode(
            os.urandom(32)).decode()
        db.engine.execute(sql)

        # If SECURITY_PASSWORD_SALT is not in the config, but we're upgrading, then it must (unless the
        # user edited the main config - which they shouldn't have done) have been at it's default
        # value, so we'll use that. Otherwise, use whatever we can find in the config.
        if hasattr(config, 'SECURITY_PASSWORD_SALT'):
            sql = "INSERT INTO keys (name, value) VALUES ('SECURITY_PASSWORD_SALT', '%s')" % config.SECURITY_PASSWORD_SALT
        else:
            sql = "INSERT INTO keys (name, value) VALUES ('SECURITY_PASSWORD_SALT', 'SuperSecret3')"
        db.engine.execute(sql)

    db.engine.execute(
        'UPDATE version set value="%s" WHERE name = "ConfigDB"' % config.SETTINGS_SCHEMA_VERSION
    )
    # ### end Alembic commands ###


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
