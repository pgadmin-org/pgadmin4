##########################################################################
##
## pgAdmin 4 - PostgreSQL Tools
##
## Copyright (C) 2013 - 2024, The pgAdmin Development Team
## This software is released under the PostgreSQL Licence
##
##########################################################################

"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from pgadmin.model import db
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade():
    ${upgrades if upgrades else "pass"}


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    ${downgrades if downgrades else "pass"}
