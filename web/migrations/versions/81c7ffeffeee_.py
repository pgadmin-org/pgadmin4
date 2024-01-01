##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""

Revision ID: 81c7ffeffeee
Revises: 398697dc9550
Create Date: 2020-11-02 09:46:51.250338

"""
from alembic import op
from sqlalchemy.orm.session import Session
from pgadmin.model import Preferences


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
    session = Session(bind=op.get_bind())

    qt_open_tab_setting = session.query(Preferences).filter_by(
        name='new_browser_tab').order_by(Preferences.id.desc()).first()
    debugger_tab_setting = session.query(Preferences).filter_by(
        name='debugger_new_browser_tab').order_by(Preferences.id.desc()).first()
    schema_diff_tab_setting = session.query(Preferences).filter_by(
        name='schema_diff_new_browser_tab').order_by(
        Preferences.id.desc()).first()

    if qt_open_tab_setting:
        session.delete(qt_open_tab_setting)
    if debugger_tab_setting:
        session.delete(debugger_tab_setting)
    if schema_diff_tab_setting:
        session.delete(schema_diff_tab_setting)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
