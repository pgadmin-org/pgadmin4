
"""empty message

Revision ID: 81c7ffeffeee
Revises: 398697dc9550
Create Date: 2020-11-02 09:46:51.250338

"""
from alembic import op
import sqlalchemy as sa
from pgadmin.model import db, Preferences


# revision identifiers, used by Alembic.
revision = '81c7ffeffeee'
down_revision = '398697dc9550'
branch_labels = None
depends_on = None


def upgrade():
    """
    Delete older preferences open new tab for Query tool, Debugger,
     and Schema diff.
    """
    qt_open_tab_setting = Preferences.query.filter_by(
        name='new_browser_tab').order_by(Preferences.id.desc()).first()
    debugger_tab_setting = Preferences.query.filter_by(
        name='debugger_new_browser_tab').order_by(Preferences.id.desc()).first()
    schema_diff_tab_setting = Preferences.query.filter_by(
        name='schema_diff_new_browser_tab').order_by(
        Preferences.id.desc()).first()

    if qt_open_tab_setting:
        db.session.delete(qt_open_tab_setting)
    if debugger_tab_setting:
        db.session.delete(debugger_tab_setting)
    if schema_diff_tab_setting:
        db.session.delete(schema_diff_tab_setting)

    db.session.commit()


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
