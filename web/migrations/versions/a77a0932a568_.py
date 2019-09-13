
"""Change the not null constraints for port, username as it should not
    compulsory when service is provided. RM #4642

Revision ID: a77a0932a568
Revises: 35f29b1701bd
Create Date: 2019-09-09 15:41:30.084753

"""
from alembic import op
import sqlalchemy as sa
from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = 'a77a0932a568'
down_revision = '35f29b1701bd'
branch_labels = None
depends_on = None


def upgrade():
    # To Save previous data
    db.engine.execute("ALTER TABLE server RENAME TO server_old")

    # Create table with drop constraint for port and username definition
    db.engine.execute("""
            CREATE TABLE server (
            id	INTEGER NOT NULL,
            user_id	INTEGER NOT NULL,
            servergroup_id	INTEGER NOT NULL,
            name	VARCHAR(128) NOT NULL,
            host	VARCHAR(128),
            port	INTEGER,
            maintenance_db	VARCHAR(64) NOT NULL,
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
            tunnel_identity_file TEXT, connect_timeout INTEGER DEFAULT 0, tunnel_password TEXT(64),
            PRIMARY KEY(id),
            FOREIGN KEY(user_id) REFERENCES user(id),
            FOREIGN KEY(servergroup_id) REFERENCES servergroup(id)
        )
    """)

    # Copy old data again into table
    db.engine.execute("""
    INSERT INTO server (
        id, user_id, servergroup_id, name, host, port, maintenance_db,
        username, password, role, ssl_mode, comment, discovery_id, hostaddr,
        db_res, passfile, sslcert, sslkey, sslrootcert, sslcrl,
        sslcompression, bgcolor, fgcolor, service, use_ssh_tunnel,
        tunnel_host, tunnel_port, tunnel_username, tunnel_authentication,
        tunnel_identity_file

    ) SELECT
        id, user_id, servergroup_id, name, host, port, maintenance_db,
        username, password, role, ssl_mode, comment, discovery_id, hostaddr,
        db_res, passfile, sslcert, sslkey, sslrootcert, sslcrl,
        sslcompression, bgcolor, fgcolor, service, use_ssh_tunnel,
        tunnel_host, tunnel_port, tunnel_username, tunnel_authentication,
        tunnel_identity_file
    FROM server_old""")

    # Remove old data
    db.engine.execute("DROP TABLE server_old")


def downgrade():
    pass
