
"""empty message

Revision ID: 35f29b1701bd
Revises: ec1cac3399c9
Create Date: 2019-04-26 16:38:08.368471

"""
import base64
import os
import sys

from pgadmin.model import db, Server


# revision identifiers, used by Alembic.
revision = '35f29b1701bd'
down_revision = 'ec1cac3399c9'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute("ALTER TABLE user RENAME TO user_old")

    db.engine.execute("""
        CREATE TABLE user (
            id INTEGER NOT NULL,
            email VARCHAR(256) NOT NULL,
            password VARCHAR(256),
            active BOOLEAN NOT NULL,
            confirmed_at DATETIME,
            masterpass_check VARCHAR(256),
            PRIMARY KEY (id),
            UNIQUE (email),
            CHECK (active IN (0, 1))
        );
        """)

    db.engine.execute("""
        INSERT INTO user (
            id, email, password, active, confirmed_at
        ) SELECT
            id, email, password, active, confirmed_at
        FROM user_old""")

    db.engine.execute("DROP TABLE user_old")


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
