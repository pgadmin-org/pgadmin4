##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Utility functions for storing and retrieving user configuration settings."""

from flask import current_app
from flask.ext.login import current_user
from flask.ext.sqlalchemy import SQLAlchemy

from settings_model import db, Setting

def set_boolean(setting, value):
    """Set a boolean configuration setting for the current user."""
    db.init_app(current_app)
    
    data = Setting(user_id=current_user.id, setting=setting, boolean_value=value)
    
    db.session.merge(data)
    db.session.commit()
    
def set_integer(setting, value):
    """Set a string configuration setting for the current user."""
    db.init_app(current_app)
    
    data = Setting(user_id=current_user.id, setting=setting, integer_value=value)
    
    db.session.merge(data)
    db.session.commit()
    
def set_string(setting, value):
    """Set a string configuration setting for the current user."""
    db.init_app(current_app)
    
    data = Setting(user_id=current_user.id, setting=setting, string_value=value)
    
    db.session.merge(data)
    db.session.commit()
    
def get_boolean(setting, default=None):
    """Retrieve a boolean configuration setting for the current user, or return
    the default value specified by the caller."""
    db.init_app(current_app)
    
    data = Setting.query.filter_by(user_id=current_user.id, setting=setting).first()
    
    if not data or data.boolean_value is None:
        return default
    else:
        return data.boolean_value
    
def get_integer(setting, default=None):
    """Retrieve an integer configuration setting for the current user, or return
    the default value specified by the caller."""
    db.init_app(current_app)
    
    data = Setting.query.filter_by(user_id=current_user.id, setting=setting).first()
    
    if not data or data.integer_value is None:
        return default
    else:
        return data.integer_value
    
def get_string(setting, default=None):
    """Retrieve a string configuration setting for the current user, or return
    the default value specified by the caller."""
    db.init_app(current_app)
    
    data = Setting.query.filter_by(user_id=current_user.id, setting=setting).first()
    
    if not data or data.string_value is None:
        return default
    else:
        return data.string_value