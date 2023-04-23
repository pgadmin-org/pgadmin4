##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Encrypt the existing user password.

Revision ID: f195f9a4923d
Revises: 3c1e4b6eda55
Create Date: 2017-06-15 17:18:50.667139

"""
import config
from flask import current_app
from flask_security import Security, SQLAlchemyUserDatastore
from flask_security.utils import verify_and_update_password
from alembic import op
from sqlalchemy.orm.session import Session
from pgadmin.model import Keys, db, User, Role

# revision identifiers, used by Alembic.
revision = 'f195f9a4923d'
down_revision = '3c1e4b6eda55'
branch_labels = None
depends_on = None


def upgrade():
    app = current_app
    session = Session(bind=op.get_bind())
    current_salt = session.query(Keys).filter_by(
        name='SECURITY_PASSWORD_SALT').first().value
    app.config.update(dict(SECURITY_PASSWORD_SALT=current_salt))
    app.config['SECURITY_PASSWORD_HASH'] = config.SECURITY_PASSWORD_HASH

    if app.extensions.get('security') is None:
        user_datastore = SQLAlchemyUserDatastore(db, User, Role)
        Security(app, user_datastore, register_blueprint=False)
    else:
        app.config['SECURITY_PASSWORD_SALT'] = current_salt

    users = session.query(User).with_entities(
        User.id, User.email, User.password, User.active, User.confirmed_at)\
        .all()
    # This will upgrade the plaintext password of all the user as per the
    # SECURITY_PASSWORD_HASH.
    for user in users:
        if user.password is not None:
            verify_and_update_password(user.password, user)


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass
