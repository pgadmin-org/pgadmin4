##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Update DB to version 31

Added a table `user_mfa` for saving the options on MFA for different sources.

Revision ID: 15c88f765bc8
Revises: 6650c52670c2
Create Date: 2021-11-24 17:33:12.533825

"""
from pgadmin.model import db


# revision identifiers, used by Alembic.
revision = '15c88f765bc8'
down_revision = '3ce25f562f3b'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute("""
CREATE TABLE user_mfa(
    user_id  INTEGER NOT NULL,
    mfa_auth VARCHAR(256) NOT NULL,
    options  TEXT,
    PRIMARY KEY (user_id, mfa_auth),
    FOREIGN KEY(user_id) REFERENCES user (id)
)
    """)
    # ### end Alembic commands ###


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
