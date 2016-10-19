##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines the models for the configuration database.

If any of the models are updated, you (yes, you, the developer) MUST do two
things:

1) Increment SCHEMA_VERSION below

2) Modify setup.py to ensure that the appropriate changes are made to the
   config database to upgrade it to the new version.
"""

from flask_security import UserMixin, RoleMixin
from flask_sqlalchemy import SQLAlchemy

##########################################################################
#
# The schema version is used to track when upgrades are needed to the
# configuration database. Increment this whenever changes are made to the
# model or data, AND ensure the upgrade code is added to setup.py
#
##########################################################################

SCHEMA_VERSION = 14

##########################################################################
#
# And now we return to our regularly scheduled programming:
#
##########################################################################

db = SQLAlchemy()

# Define models
roles_users = db.Table(
    'roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)


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
    password = db.Column(db.String(64), nullable=True)
    role = db.Column(db.String(64), nullable=True)
    ssl_mode = db.Column(
        db.String(16),
        db.CheckConstraint(
            "ssl_mode IN ('allow', 'prefer', 'require', 'disable', 'verify-ca', 'verify-full')"
        ),
        nullable=False)
    comment = db.Column(db.String(1024), nullable=True)
    discovery_id = db.Column(db.String(128), nullable=True)


class ModulePreference(db.Model):
    """Define a preferences table for any modules."""
    __tablename__ = 'module_preference'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(256), nullable=False)


class PreferenceCategory(db.Model):
    """Define a preferences category for each modules."""
    __tablename__ = 'preference_category'
    id = db.Column(db.Integer, primary_key=True)
    mid = db.Column(
        db.Integer,
        db.ForeignKey('module_preference.id'),
        nullable=False
    )
    name = db.Column(db.String(256), nullable=False)


class Preferences(db.Model):
    """Define a particular preference."""
    __tablename__ = 'preferences'
    id = db.Column(db.Integer, primary_key=True)
    cid = db.Column(
        db.Integer,
        db.ForeignKey('preference_category.id'),
        nullable=False
    )
    name = db.Column(db.String(1024), nullable=False)


class UserPreference(db.Model):
    """Define the preference for a particular user."""
    __tablename__ = 'user_preferences'
    pid = db.Column(
        db.Integer, db.ForeignKey('preferences.id'), primary_key=True
    )
    uid = db.Column(
        db.Integer, db.ForeignKey('user.id'), primary_key=True
    )
    value = db.Column(db.String(1024), nullable=False)


class DebuggerFunctionArguments(db.Model):
    """Define the debugger input function arguments."""
    __tablename__ = 'debugger_function_arguments'
    server_id = db.Column(db.Integer(), nullable=False, primary_key=True)
    database_id = db.Column(db.Integer(), nullable=False, primary_key=True)
    schema_id = db.Column(db.Integer(), nullable=False, primary_key=True)
    function_id = db.Column(db.Integer(), nullable=False, primary_key=True)
    arg_id = db.Column(db.Integer(), nullable=False, primary_key=True)
    is_null = db.Column(db.Integer(),
                        db.CheckConstraint('is_null >= 0 AND is_null <= 1'),
                        nullable=False)
    is_expression = db.Column(db.Integer(),
                              db.CheckConstraint('is_expression >= 0 AND is_expression <= 1'),
                              nullable=False)
    use_default = db.Column(db.Integer(),
                            db.CheckConstraint('use_default >= 0 AND use_default <= 1'),
                            nullable=False)

    value = db.Column(db.String(), nullable=True)


class Process(db.Model):
    """Define the Process table."""
    __tablename__ = 'process'
    pid = db.Column(db.String(), nullable=False, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id'),
        nullable=False
    )
    command = db.Column(db.String(), nullable=False)
    desc = db.Column(db.String(), nullable=False)
    arguments = db.Column(db.String(), nullable=True)
    logdir = db.Column(db.String(), nullable=True)
    start_time = db.Column(db.String(), nullable=True)
    end_time = db.Column(db.String(), nullable=True)
    exit_code = db.Column(db.Integer(), nullable=True)
    acknowledge = db.Column(db.String(), nullable=True)


class Keys(db.Model):
    """Define the keys table."""
    __tablename__ = 'keys'
    name = db.Column(db.String(), nullable=False, primary_key=True)
    value = db.Column(db.String(), nullable=False)