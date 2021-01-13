
"""empty message

Revision ID: a39bd015b644
Revises: 81c7ffeffeee
Create Date: 2021-01-12 15:46:49.283021

"""
from pgadmin.model import db


# revision identifiers, used by Alembic.
revision = 'a39bd015b644'
down_revision = '81c7ffeffeee'
branch_labels = None
depends_on = None


def upgrade():
    # Rename older table to save previous data
    db.engine.execute("ALTER TABLE sharedserver RENAME TO sharedserver_old")

    # Create new table with removed not null constraints for port column.
    db.engine.execute("""
        CREATE TABLE sharedserver (
        id	INTEGER NOT NULL,
        user_id	INTEGER NOT NULL,
        server_owner VARCHAR(64),
        servergroup_id	INTEGER NOT NULL,
        name	VARCHAR(128) NOT NULL,
        host	VARCHAR(128),
        port	INTEGER,
        maintenance_db	VARCHAR(64),
        username	VARCHAR(64),
        password	VARCHAR(64),
        role	VARCHAR(64),
        ssl_mode	VARCHAR(16) NOT NULL CHECK(ssl_mode IN
            ( 'allow' , 'prefer' , 'require' , 'disable' ,
              'verify-ca' , 'verify-full' )
        ),
        comment	VARCHAR(1024),
        discovery_id	VARCHAR(128),
        hostaddr	TEXT(1024),
        db_res	TEXT,
        passfile	TEXT,
        sslcert	TEXT,
        sslkey	TEXT,
        sslrootcert	TEXT,
        sslcrl	TEXT,
        sslcompression	INTEGER DEFAULT 0,
        bgcolor TEXT(10),
        fgcolor TEXT(10),
        service TEXT,
        use_ssh_tunnel INTEGER DEFAULT 0,
        tunnel_host TEXT,
        tunnel_port TEXT,
        tunnel_username TEXT,
        tunnel_authentication INTEGER DEFAULT 0,
        tunnel_identity_file TEXT,
        shared BOOLEAN NOT NULL,
        save_password BOOLEAN NOT NULL,
        tunnel_password VARCHAR(64),
        connect_timeout INTEGER ,
        PRIMARY KEY(id),
        FOREIGN KEY(user_id) REFERENCES user(id),
        FOREIGN KEY(servergroup_id) REFERENCES servergroup(id)
        );
    """)

    # Copy old data again into table.
    db.engine.execute("""
        INSERT INTO sharedserver (
            id, user_id, server_owner, servergroup_id, name, host, port,
            maintenance_db, username, password, role, ssl_mode, comment,
            discovery_id, hostaddr, db_res, passfile, sslcert, sslkey,
            sslrootcert, sslcrl, sslcompression, bgcolor, fgcolor, service,
            use_ssh_tunnel, tunnel_host, tunnel_port, tunnel_username,
            tunnel_authentication, tunnel_identity_file, shared, save_password,
            tunnel_password, connect_timeout

        ) SELECT
            id, user_id, server_owner, servergroup_id, name, host, port,
            maintenance_db, username, password, role, ssl_mode, comment,
            discovery_id, hostaddr, db_res, passfile, sslcert, sslkey,
            sslrootcert, sslcrl, sslcompression, bgcolor, fgcolor, service,
            use_ssh_tunnel, tunnel_host, tunnel_port, tunnel_username,
            tunnel_authentication, tunnel_identity_file, shared, save_password,
            tunnel_password, connect_timeout
        FROM sharedserver_old""")

    # Drop older table.
    db.engine.execute("DROP TABLE sharedserver_old")


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
