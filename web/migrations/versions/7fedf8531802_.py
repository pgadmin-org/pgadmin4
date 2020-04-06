
"""empty message

Revision ID: 7fedf8531802
Revises: aff1436e3c8c
Create Date: 2020-02-26 11:24:54.353288

"""
from alembic import op
import sqlalchemy as sa
from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = '7fedf8531802'
down_revision = 'aff1436e3c8c'
branch_labels = None
depends_on = None


def upgrade():

    db.engine.execute("ALTER TABLE user RENAME TO user_old")

    db.engine.execute("""
        CREATE TABLE user (
            id INTEGER NOT NULL,
            username VARCHAR(256) NOT NULL,
            email VARCHAR(256),
            password VARCHAR(256),
            active BOOLEAN NOT NULL,
            confirmed_at DATETIME,
            masterpass_check VARCHAR(256),
            auth_source VARCHAR(256) NOT NULL DEFAULT 'internal',
            PRIMARY KEY (id),
            UNIQUE (username, auth_source),
            CHECK (active IN (0, 1))
        );
        """)

    db.engine.execute("""
        INSERT INTO user (
            id, username, email, password, active, confirmed_at, masterpass_check
        ) SELECT
            id, email, email, password, active, confirmed_at, masterpass_check
        FROM user_old""")

    db.engine.execute("DROP TABLE user_old")


def downgrade():
    pass
