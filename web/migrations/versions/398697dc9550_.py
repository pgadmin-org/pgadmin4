
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
        INSERT INTO macros (id, alt, control, key, key_code) VALUES (1, false, true, '1', 49),
        (2, false, true, '2', 50), (3, false, true, '3', 51), (4, false, true, '4', 52),
        (5, false, true, '5', 53), (6, false, true, '6', 54), (7, false, true, '7', 55),
        (8, false, true, '8', 56), (9, false, true, '9', 57), (10, false, true, '0', 48),
        (11, true, false, 'F1', 112), (12, true, false, 'F2', 113), (13, true, false, 'F3', 114),
        (14, true, false, 'F4', 115), (15, true, false, 'F5', 116), (16, true, false, 'F6', 117),
        (17, true, false, 'F7', 118), (18, true, false, 'F8', 119), (19, true, false, 'F9', 120),
        (20, true, false, 'F10', 121), (21, true, false, 'F11', 122), (22, true, false, 'F12', 123);
    """)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
