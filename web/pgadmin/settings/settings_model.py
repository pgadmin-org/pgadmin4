##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines the models for the configuration database.

If any of the models are updated, you (yes, you, the developer) MUST do two
things:

1) Increment SETTINGS_SCHEMA_VERSION in config.py

2) Modify setup.py to ensure that the appropriate changes are made to the config
   database to upgrade it to the new version.
"""

from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.security import UserMixin, RoleMixin

db = SQLAlchemy()

# Define models
roles_users = db.Table('roles_users',
        db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
        db.Column('role_id', db.Integer(), db.ForeignKey('role.id')))


class Version(db.Model):
    """Version numbers for reference/upgrade purposes"""
    __tablename__ = 'version'
    name = db.Column(db.String(32), primary_key=True)
    value = db.Column(db.Integer(), nullable=False)

class Role(db.Model, RoleMixin):
    """Define a security role"""
    __tablename__ = 'role'
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    description = db.Column(db.String(256), nullable=False)

class User(db.Model, UserMixin):
    """Define a user object"""
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(256), unique=True, nullable=False)
    password = db.Column(db.String(256))
    active = db.Column(db.Boolean(), nullable=False)
    confirmed_at = db.Column(db.DateTime())
    roles = db.relationship('Role', secondary=roles_users,
                            backref=db.backref('users', lazy='dynamic'))

class Setting(db.Model):
    """Define a setting object"""
    __tablename__ = 'setting'
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    setting = db.Column(db.String(256), primary_key=True)
    value = db.Column(db.String(1024))

class ServerGroup(db.Model):
    """Define a server group for the treeview"""
    __tablename__ = 'servergroup'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    name = db.Column(db.String(128), nullable=False)
    __table_args__ = (db.UniqueConstraint('user_id', 'name'),)


class Server(db.Model):
    """Define a registered Postgres server"""
    __tablename__ = 'server'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
            db.Integer,
            db.ForeignKey('user.id'),
            nullable=False
            )
    servergroup_id = db.Column(
            db.Integer,
            db.ForeignKey('servergroup.id'),
            nullable=False
            )

    name = db.Column(db.String(128), nullable=False)
    host = db.Column(db.String(128), nullable=False)
    port = db.Column(
            db.Integer(),
            db.CheckConstraint('port >= 1024 AND port <= 65534'),
            nullable=False)
    maintenance_db = db.Column(db.String(64), nullable=False)
    username = db.Column(db.String(64), nullable=False)
    ssl_mode = db.Column(
        db.String(16),
        db.CheckConstraint(
            "ssl_mode IN ('allow', 'prefer', 'require', 'disable', 'verify-ca', 'verify-full')"
        ),
        nullable=False)
