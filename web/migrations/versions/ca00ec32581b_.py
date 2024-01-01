##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""
Deleting old debug logs

Revision ID: ca00ec32581b
Revises: aa86fb60b73d
Create Date: 2018-08-29 15:33:57.855491

"""
from alembic import op
from sqlalchemy.orm.session import Session
from pgadmin.model import DebuggerFunctionArguments

# revision identifiers, used by Alembic.
revision = 'ca00ec32581b'
down_revision = 'aa86fb60b73d'
branch_labels = None
depends_on = None


def upgrade():
    session = Session(bind=op.get_bind())

    debugger_records = session.query(DebuggerFunctionArguments).all()
    if debugger_records:
        session.delete(debugger_records)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
