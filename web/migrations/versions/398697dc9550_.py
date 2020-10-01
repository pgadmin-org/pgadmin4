
"""empty message

Revision ID: 398697dc9550
Revises: a091c9611d20
Create Date: 2020-09-07 15:17:59.473879

"""
from pgadmin.model import db

# revision identifiers, used by Alembic.
revision = '398697dc9550'
down_revision = 'a091c9611d20'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute("""
        CREATE TABLE macros (
            id INTEGER NOT NULL,
            alt BOOLEAN NOT NULL,
            control BOOLEAN NOT NULL,
            key	VARCHAR(128) NOT NULL,
            key_code INTEGER NOT NULL,
            PRIMARY KEY(id)
        );
    """)

    db.engine.execute("""
        CREATE TABLE user_macros (
            mid INTEGER NOT NULL,
            uid INTEGER NOT NULL,
            name VARCHAR(1024) NOT NULL,
            sql	TEXT NOT NULL,
            PRIMARY KEY(mid, uid),
            FOREIGN KEY(mid) REFERENCES macros (id),
            FOREIGN KEY(uid) REFERENCES user (id)
        );
    """)

    db.engine.execute("""
        INSERT INTO macros (id, alt, control, key, key_code) VALUES (1, 0, 1, '1', 49),
        (2, 0, 1, '2', 50), (3, 0, 1, '3', 51), (4, 0, 1, '4', 52),
        (5, 0, 1, '5', 53), (6, 0, 1, '6', 54), (7, 0, 1, '7', 55),
        (8, 0, 1, '8', 56), (9, 0, 1, '9', 57), (10, 0, 1, '0', 48),
        (11, 1, 0, 'F1', 112), (12, 1, 0, 'F2', 113), (13, 1, 0, 'F3', 114),
        (14, 1, 0, 'F4', 115), (15, 1, 0, 'F5', 116), (16, 1, 0, 'F6', 117),
        (17, 1, 0, 'F7', 118), (18, 1, 0, 'F8', 119), (19, 1, 0, 'F9', 120),
        (20, 1, 0, 'F10', 121), (21, 1, 0, 'F11', 122), (22, 1, 0, 'F12', 123);
    """)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
