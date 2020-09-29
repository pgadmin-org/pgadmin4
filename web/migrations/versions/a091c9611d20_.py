
"""empty message

Revision ID: a091c9611d20
Revises: 84700139beb0
Create Date: 2020-07-14 17:20:22.705737

"""
from pgadmin.model import db


# revision identifiers, used by Alembic.
revision = 'a091c9611d20'
down_revision = '84700139beb0'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE server ADD COLUMN shared BOOLEAN'
    )

    db.engine.execute("""
            CREATE TABLE sharedserver (
            id	INTEGER NOT NULL,
            user_id	INTEGER NOT NULL,
            server_owner VARCHAR(64),
            servergroup_id	INTEGER NOT NULL,
            name	VARCHAR(128) NOT NULL,
            host	VARCHAR(128),
            port	INTEGER NOT NULL CHECK(port >= 1 AND port <= 65534),
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


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
