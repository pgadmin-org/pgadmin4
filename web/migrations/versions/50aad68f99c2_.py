
"""Added service field option in server table (RM#3140)

Revision ID: 50aad68f99c2
Revises: 02b9dccdcfcb
Create Date: 2018-03-07 11:53:57.584280

"""
from pgadmin.model import db


# revision identifiers, used by Alembic.
revision = '50aad68f99c2'
down_revision = '02b9dccdcfcb'
branch_labels = None
depends_on = None


def upgrade():
        # To Save previous data
        db.engine.execute("ALTER TABLE server RENAME TO server_old")

        # With service file some fields won't be mandatory as user can provide
        # them using service file. Removed NOT NULL constraint from few columns
        db.engine.execute("""
            CREATE TABLE server (
                id	INTEGER NOT NULL,
                user_id	INTEGER NOT NULL,
                servergroup_id	INTEGER NOT NULL,
                name	VARCHAR(128) NOT NULL,
                host	VARCHAR(128),
                port	INTEGER NOT NULL CHECK(port >= 1024 AND port <= 65534),
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
                PRIMARY KEY(id),
                FOREIGN KEY(user_id) REFERENCES user(id),
                FOREIGN KEY(servergroup_id) REFERENCES servergroup(id)
            )
        """)

        # Copy old data again into table
        db.engine.execute("""
        INSERT INTO server (
            id,user_id, servergroup_id, name, host, port, maintenance_db,
            username, ssl_mode, comment, password, role, discovery_id,
            hostaddr, db_res, passfile, sslcert, sslkey, sslrootcert, sslcrl,
            bgcolor, fgcolor
        ) SELECT
            id,user_id, servergroup_id, name, host, port, maintenance_db,
            username, ssl_mode, comment, password, role, discovery_id,
            hostaddr, db_res, passfile, sslcert, sslkey, sslrootcert, sslcrl,
            bgcolor, fgcolor
        FROM server_old""")

        # Remove old data
        db.engine.execute("DROP TABLE server_old")

        # Add column for Service
        db.engine.execute(
            'ALTER TABLE server ADD COLUMN service TEXT'
        )

def downgrade():
    pass
