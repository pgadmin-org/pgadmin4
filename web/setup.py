##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Perform the initial setup of the application, by creating the auth
and settings database."""

from flask import Flask
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.security import Security, SQLAlchemyUserDatastore
from flask.ext.security.utils import encrypt_password
from settings.settings_model import db, Role, User

import getpass, os, random, sys, string

# Configuration settings
import config

app = Flask(__name__)
app.config.from_object(config)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + config.SQLITE_PATH.replace('\\', '/')
db.init_app(app)

print "pgAdmin 4 - Application Initialisation"
print "======================================\n"

local_config = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'config_local.py')
if not os.path.isfile(local_config):
    print "The configuration file %s does not exist.\n" % local_config
    print "Before running this application, ensure that config_local.py has been created"
    print "and sets values for SECRET_KEY, SECURITY_PASSWORD_SALT and CSRF_SESSION_KEY"
    print "at bare minimum. See config.py for more information and a complete list of"
    print "settings. Exiting..."
    sys.exit(1)

# Check if the database exists. If it does, tell the user and exit.
if os.path.isfile(config.SQLITE_PATH):
    print "The configuration database %s already exists and will not be overwritten.\nExiting..." % config.SQLITE_PATH
    sys.exit(1)

if config.SERVER_MODE == False:
    print "NOTE: Configuring authentication for DESKTOP mode."
    email = config.DESKTOP_USER 
    p1 = ''.join([random.choice(string.ascii_letters + string.digits) for n in xrange(32)])

else:
    print "NOTE: Configuring authentication for SERVER mode.\n"

    # Prompt the user for their default username and password.
    print "Enter the email address and password to use for the initial pgAdmin user account:\n"
    email = ''
    while email == '':
        email = raw_input("Email address: ")

    pprompt = lambda: (getpass.getpass(), getpass.getpass('Retype password: '))

    p1, p2 = pprompt()
    while p1 != p2:
        print('Passwords do not match. Try again')
        p1, p2 = pprompt()

# Setup Flask-Security
user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)

with app.app_context():
    password = encrypt_password(p1)

    db.create_all()
    user_datastore.create_role(name='Administrators', description='pgAdmin Administrators Role')
    user_datastore.create_user(email=email, password=password)
    user_datastore.add_role_to_user(email, 'Administrators')
    db.session.commit()

# Done!
print ""
print "The configuration database has been created at %s" % config.SQLITE_PATH
