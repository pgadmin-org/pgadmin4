
"""Change server port constraint to allow port below 1024 RM#3307

Revision ID: 7c56ea250085
Revises: a68b374fe373
Create Date: 2018-06-04 14:23:31.472645

"""
from alembic import op
import sqlalchemy as sa

from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = '7c56ea250085'
down_revision = 'a68b374fe373'
branch_labels = None
depends_on = None


def upgrade():
    # To Save previous data
    db.engine.execute("ALTER TABLE server RENAME TO server_old")

    # Create table with new constraint definition
    db.engine.execute("""
            CREATE TABLE server (
            id	INTEGER NOT NULL,
            user_id	INTEGER NOT NULL,
            servergroup_id	INTEGER NOT NULL,
            name	VARCHAR(128) NOT NULL,
            host	VARCHAR(128),
            port	INTEGER NOT NULL CHECK(port >= 1 AND port <= 65534),
            maintenance_db	VARCHAR(64),
            username	VARCHAR(64) NOT NULL,
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
