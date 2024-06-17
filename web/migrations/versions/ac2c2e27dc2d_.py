
"""empty message

Revision ID: ac2c2e27dc2d
Revises: ec0f11f9a4e6
Create Date: 2024-05-17 19:35:03.700104

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm.session import Session
from pgadmin.model import Preferences

# revision identifiers, used by Alembic.
revision = 'ac2c2e27dc2d'
down_revision = 'ec0f11f9a4e6'
branch_labels = None
depends_on = None


def upgrade():
    session = Session(bind=op.get_bind())
    
    session.query(Preferences).filter(
            Preferences.name == 'execute_query').update({'name': 'execute_script'})
    session.commit()
    
    meta = sa.MetaData()
    meta.reflect(op.get_bind(), only=('user_macros',))
    user_macros_table = sa.Table('user_macros', meta)

    # Create a select statement
    stmt = sa.select(
        user_macros_table.columns.mid,
        user_macros_table.columns.uid, user_macros_table.columns.name,
        user_macros_table.columns.sql
    )
    # Fetch the data from the user_macros table
    results = op.get_bind().execute(stmt).fetchall()
    
    # Drop and re-create user macro table.
    op.drop_table('user_macros')
    op.create_table(
        'user_macros',
        sa.Column('id', sa.Integer(), autoincrement=True),
        sa.Column('mid', sa.Integer(), nullable=True),
        sa.Column('uid', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=1024), nullable=False),
        sa.Column('sql', sa.String()),
        sa.ForeignKeyConstraint(['mid'], ['macros.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uid'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id',))

    # Reflect the new table structure
    meta.reflect(op.get_bind(), only=('user_macros',))
    new_user_macros_table = sa.Table('user_macros', meta)

    # Bulk insert the fetched data into the new user_macros table
    op.bulk_insert(
        new_user_macros_table,
        [
            {'mid': row[0], 'uid': row[1], 'name': row[2], 'sql': row[3]}
            for row in results
        ]
    )

def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
