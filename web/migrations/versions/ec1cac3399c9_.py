
"""empty message

Revision ID: ec1cac3399c9
Revises: b5b87fdfcb30
Create Date: 2019-03-07 16:05:28.874203

"""
from pgadmin.model import db


# revision identifiers, used by Alembic.
revision = 'ec1cac3399c9'
down_revision = 'b5b87fdfcb30'
branch_labels = None
depends_on = None

srno = db.Column(db.Integer(), nullable=False, primary_key=True)
uid = db.Column(
    db.Integer, db.ForeignKey('user.id'), nullable=False, primary_key=True
)
sid = db.Column(db.Integer(), nullable=False, primary_key=True)
did = db.Column(db.Integer(), nullable=False, primary_key=True)
query = db.Column(db.String(), nullable=False)

def upgrade():
        db.engine.execute("""
    CREATE TABLE query_history (
        srno INTEGER NOT NULL,
        uid INTEGER NOT NULL,
        sid INTEGER NOT NULL,
        dbname TEXT NOT NULL,
        query_info TEXT NOT NULL,
        last_updated_flag TEXT NOT NULL,
        PRIMARY KEY (srno, uid, sid, dbname),
        FOREIGN KEY(uid) REFERENCES user (id),
        FOREIGN KEY(sid) REFERENCES server (id)
    )""")


def downgrade():
    pass
