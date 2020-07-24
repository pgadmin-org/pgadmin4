
"""empty message

Revision ID: 84700139beb0
Revises: d39482714a2e
Create Date: 2020-06-24 15:53:56.489518

"""
from pgadmin.model import db


# revision identifiers, used by Alembic.
revision = '84700139beb0'
down_revision = 'd39482714a2e'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute("""
        CREATE TABLE "database" (
            "id"	INTEGER NOT NULL,
            "schema_res"	TEXT,
            "server"	INTEGER NOT NULL,
            PRIMARY KEY("id","server"),
            FOREIGN KEY("server") REFERENCES "server"("id")
        );
    """)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
