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

def store_setting(setting, value):
    """Set a configuration setting for the current user."""
    db.init_app(current_app)
    
    data = Setting(user_id=current_user.id, setting=setting, value=value)
    
    db.session.merge(data)
    db.session.commit()
    
def get_setting(setting, default=None):
    """Retrieve a configuration setting for the current user, or return the 
    default value specified by the caller."""
    db.init_app(current_app)
    
    data = Setting.query.filter_by(user_id=current_user.id, setting=setting).first()
    
    if not data or data.value is None:
        return default
    else:
        return data.value