#########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Perform the initial setup of the application, by creating the auth
and settings database."""

import base64
import getpass
import os
import random
import re
import string
import sys

from flask import Flask
from flask_security import Security, SQLAlchemyUserDatastore
from flask_security.utils import encrypt_password

from pgadmin.model import db, Role, User, Server, \
    ServerGroup, Version, Keys
# Configuration settings
import config

# Get the config database schema version. We store this in pgadmin.model
# as it turns out that putting it in the config files isn't a great idea
from pgadmin.model import SCHEMA_VERSION

config.SETTINGS_SCHEMA_VERSION = SCHEMA_VERSION

# If script is running under python2 then change the behaviour of functions
if hasattr(__builtins__, 'raw_input'):
    input = raw_input
    range = xrange


def do_setup(app):
    """Create a new settings database from scratch"""

    if config.SERVER_MODE is False:
        print("NOTE: Configuring authentication for DESKTOP mode.")
        email = config.DESKTOP_USER
        p1 = ''.join([
                         random.choice(string.ascii_letters + string.digits)
                         for n in range(32)
                         ])

    else:
        print("NOTE: Configuring authentication for SERVER mode.\n")

        if all(value in os.environ for value in
               ['PGADMIN_SETUP_EMAIL', 'PGADMIN_SETUP_PASSWORD']):
            email = ''
            p1 = ''
            if os.environ['PGADMIN_SETUP_EMAIL'] and os.environ[
                'PGADMIN_SETUP_PASSWORD']:
                email = os.environ['PGADMIN_SETUP_EMAIL']
                p1 = os.environ['PGADMIN_SETUP_PASSWORD']
        else:
            # Prompt the user for their default username and password.
            print("""
    Enter the email address and password to use for the initial pgAdmin user \
    account:\n""")
            email_filter = re.compile(
                "^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9]"
                "(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9]"
                "(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$")

            email = input("Email address: ")
            while email == '' or not email_filter.match(email):
                print('Invalid email address. Please try again.')
                email = input("Email address: ")

            def pprompt():
                return getpass.getpass(), getpass.getpass('Retype password:')

            p1, p2 = pprompt()
            while p1 != p2 or len(p1) < 6:
                if p1 != p2:
                    print('Passwords do not match. Please try again.')
                else:
                    print(
                    'Password must be at least 6 characters. Please try again.')
                p1, p2 = pprompt()

    # Setup Flask-Security
    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    Security(app, user_datastore)

    with app.app_context():
        password = encrypt_password(p1)

        db.create_all()
        user_datastore.create_role(
            name='Administrator',
            description='pgAdmin Administrator Role'
        )
        user_datastore.create_role(
            name='User',
            description='pgAdmin User Role'
        )
        user_datastore.create_user(email=email, password=password)
        db.session.flush()
        user_datastore.add_role_to_user(email, 'Administrator')

        # Get the user's ID and create the default server group
        user = User.query.filter_by(email=email).first()
        server_group = ServerGroup(user_id=user.id, name="Servers")
        db.session.merge(server_group)

        # Set the schema version
        version = Version(
            name='ConfigDB', value=config.SETTINGS_SCHEMA_VERSION
        )
        db.session.merge(version)
        db.session.commit()

        # Create the keys
        key = Keys(name='CSRF_SESSION_KEY', value=config.CSRF_SESSION_KEY)
        db.session.merge(key)

        key = Keys(name='SECRET_KEY', value=config.SECRET_KEY)
        db.session.merge(key)

        key = Keys(name='SECURITY_PASSWORD_SALT', value=config.SECURITY_PASSWORD_SALT)
        db.session.merge(key)

        db.session.commit()

    # Done!
    print("")
    print(
        "The configuration database has been created at {0}".format(
            config.SQLITE_PATH
        )
    )


def do_upgrade(app, datastore, version):
    """Upgrade an existing settings database"""
    #######################################################################
    # Run whatever is required to update the database schema to the current
    # version.
    #######################################################################

    with app.app_context():
        version = Version.query.filter_by(name='ConfigDB').first()

        # Pre-flight checks
        if int(version.value) > int(config.SETTINGS_SCHEMA_VERSION):
            print("""
The database schema version is {0}, whilst the version required by the \
software is {1}.
Exiting...""".format(version.value, config.SETTINGS_SCHEMA_VERSION))
            sys.exit(1)
        elif int(version.value) == int(config.SETTINGS_SCHEMA_VERSION):
            print("""
The database schema version is {0} as required.
Exiting...""".format(version.value))
            sys.exit(1)

        app.logger.info(
            "NOTE: Upgrading database schema from version %d to %d." %
            (version.value, config.SETTINGS_SCHEMA_VERSION)
        )

        #######################################################################
        # Run whatever is required to update the database schema to the current
        # version. Always use "< REQUIRED_VERSION" as the test for readability
        #######################################################################

        # Changes introduced in schema version 2
        if int(version.value) < 2:
            # Create the 'server' table
            db.metadata.create_all(db.engine, tables=[Server.__table__])
        if int(version.value) < 3:
            db.engine.execute(
                'ALTER TABLE server ADD COLUMN comment TEXT(1024)'
            )
        if int(version.value) < 4:
            db.engine.execute(
                'ALTER TABLE server ADD COLUMN password TEXT(64)'
            )
        if int(version.value) < 5:
            db.engine.execute('ALTER TABLE server ADD COLUMN role text(64)')
        if int(version.value) < 6:
            db.engine.execute("ALTER TABLE server RENAME TO server_old")
            db.engine.execute("""
CREATE TABLE server (
    id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    servergroup_id INTEGER NOT NULL,
    name VARCHAR(128) NOT NULL,
    host VARCHAR(128) NOT NULL,
    port INTEGER NOT NULL CHECK (port >= 1024 AND port <= 65534),
    maintenance_db VARCHAR(64) NOT NULL,
    username VARCHAR(64) NOT NULL,
    ssl_mode VARCHAR(16) NOT NULL CHECK (
        ssl_mode IN (
            'allow', 'prefer', 'require', 'disable', 'verify-ca', 'verify-full'
            )),
    comment VARCHAR(1024), password TEXT(64), role text(64),
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES user (id),
    FOREIGN KEY(servergroup_id) REFERENCES servergroup (id)
)""")
            db.engine.execute("""
INSERT INTO server (
    id, user_id, servergroup_id, name, host, port, maintenance_db, username,
    ssl_mode, comment, password, role
) SELECT
    id, user_id, servergroup_id, name, host, port, maintenance_db, username,
    ssl_mode, comment, password, role
FROM server_old""")
            db.engine.execute("DROP TABLE server_old")

        if int(version.value) < 8:
            app.logger.info(
                "Creating the preferences tables..."
            )
            db.engine.execute("""
CREATE TABLE module_preference(
    id INTEGER PRIMARY KEY,
    name VARCHAR(256) NOT NULL
    )""")

            db.engine.execute("""
CREATE TABLE preference_category(
    id INTEGER PRIMARY KEY,
    mid INTEGER,
    name VARCHAR(256) NOT NULL,

    FOREIGN KEY(mid) REFERENCES module_preference(id)
    )""")

            db.engine.execute("""
CREATE TABLE preferences (

    id INTEGER PRIMARY KEY,
    cid INTEGER NOT NULL,
    name VARCHAR(256) NOT NULL,

    FOREIGN KEY(cid) REFERENCES preference_category (id)
    )""")

            db.engine.execute("""
CREATE TABLE user_preferences (

    pid INTEGER,
    uid INTEGER,
    value VARCHAR(1024) NOT NULL,

    PRIMARY KEY (pid, uid),
    FOREIGN KEY(pid) REFERENCES preferences (pid),
    FOREIGN KEY(uid) REFERENCES user (id)
    )""")

        if int(version.value) < 9:
            db.engine.execute("""
CREATE TABLE IF NOT EXISTS debugger_function_arguments (
    server_id INTEGER ,
    database_id INTEGER ,
    schema_id INTEGER ,
    function_id INTEGER ,
    arg_id INTEGER ,
    is_null INTEGER NOT NULL CHECK (is_null >= 0 AND is_null <= 1) ,
    is_expression INTEGER NOT NULL CHECK (is_expression >= 0 AND is_expression <= 1) ,
    use_default INTEGER NOT NULL CHECK (use_default >= 0 AND use_default <= 1) ,
    value TEXT,
    PRIMARY KEY (server_id, database_id, schema_id, function_id, arg_id)
    )""")

        if int(version.value) < 10:
            db.engine.execute("""
CREATE TABLE process(
    user_id INTEGER NOT NULL,
    pid TEXT NOT NULL,
    desc TEXT NOT NULL,
    command TEXT NOT NULL,
    arguments TEXT,
    start_time TEXT,
    end_time TEXT,
    logdir TEXT,
    exit_code INTEGER,
    acknowledge TEXT,
    PRIMARY KEY(pid),
    FOREIGN KEY(user_id) REFERENCES user (id)
    )""")

        if int(version.value) < 11:
            db.engine.execute("""
UPDATE role
    SET name = 'Administrator',
    description = 'pgAdmin Administrator Role'
    WHERE name = 'Administrators'
    """)

            db.engine.execute("""
INSERT INTO role ( name, description )
            VALUES ('User', 'pgAdmin User Role')
    """)

        if int(version.value) < 12:
            db.engine.execute("ALTER TABLE server RENAME TO server_old")
            db.engine.execute("""
CREATE TABLE server (
    id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    servergroup_id INTEGER NOT NULL,
    name VARCHAR(128) NOT NULL,
    host VARCHAR(128) NOT NULL,
    port INTEGER NOT NULL CHECK (port >= 1024 AND port <= 65535),
    maintenance_db VARCHAR(64) NOT NULL,
    username VARCHAR(64) NOT NULL,
    ssl_mode VARCHAR(16) NOT NULL CHECK (
        ssl_mode IN (
            'allow', 'prefer', 'require', 'disable', 'verify-ca', 'verify-full'
            )),
    comment VARCHAR(1024), password TEXT(64), role text(64),
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES user (id),
    FOREIGN KEY(servergroup_id) REFERENCES servergroup (id)
)""")
            db.engine.execute("""
INSERT INTO server (
    id, user_id, servergroup_id, name, host, port, maintenance_db, username,
    ssl_mode, comment, password, role
) SELECT
    id, user_id, servergroup_id, name, host, port, maintenance_db, username,
    ssl_mode, comment, password, role
FROM server_old""")
            db.engine.execute("DROP TABLE server_old")

        if int(version.value) < 13:
            db.engine.execute("""
ALTER TABLE SERVER
    ADD COLUMN discovery_id TEXT
    """)

        if int(version.value) < 14:
            db.engine.execute("""
CREATE TABLE keys (
    name TEST NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (name))
                """)

            sql = "INSERT INTO keys (name, value) VALUES ('CSRF_SESSION_KEY', '%s')" % base64.urlsafe_b64encode(os.urandom(32)).decode()
            db.engine.execute(sql)

            sql = "INSERT INTO keys (name, value) VALUES ('SECRET_KEY', '%s')" % base64.urlsafe_b64encode(os.urandom(32)).decode()
            db.engine.execute(sql)

            # If SECURITY_PASSWORD_SALT is not in the config, but we're upgrading, then it must (unless the
            # user edited the main config - which they shouldn't have done) have been at it's default
            # value, so we'll use that. Otherwise, use whatever we can find in the config.
            if hasattr(config, 'SECURITY_PASSWORD_SALT'):
                sql = "INSERT INTO keys (name, value) VALUES ('SECURITY_PASSWORD_SALT', '%s')" % config.SECURITY_PASSWORD_SALT
            else:
                sql = "INSERT INTO keys (name, value) VALUES ('SECURITY_PASSWORD_SALT', 'SuperSecret3')"
            db.engine.execute(sql)

    # Finally, update the schema version
    version.value = config.SETTINGS_SCHEMA_VERSION
    db.session.merge(version)

    db.session.commit()

    # Done!
    app.logger.info(
        "The configuration database %s has been upgraded to version %d" %
        (config.SQLITE_PATH, config.SETTINGS_SCHEMA_VERSION)
    )


###############################################################################
# Do stuff!
###############################################################################
if __name__ == '__main__':
    app = Flask(__name__)

    app.config.from_object(config)

    if config.TESTING_MODE:
        config.SQLITE_PATH = config.TEST_SQLITE_PATH

    app.config['SQLALCHEMY_DATABASE_URI'] = \
        'sqlite:///' + config.SQLITE_PATH.replace('\\', '/')
    db.init_app(app)

    print("pgAdmin 4 - Application Initialisation")
    print("======================================\n")

    local_config = os.path.join(
        os.path.dirname(os.path.realpath(__file__)),
        'config_local.py'
    )

    # Check if the database exists. If it does, tell the user and exit.
    if os.path.isfile(config.SQLITE_PATH):
        print("""
The configuration database '%s' already exists.
Entering upgrade mode...""" % config.SQLITE_PATH)

        # Setup Flask-Security
        user_datastore = SQLAlchemyUserDatastore(db, User, Role)

        # Always use "< REQUIRED_VERSION" as the test for readability
        with app.app_context():
            version = Version.query.filter_by(name='ConfigDB').first()

            # Pre-flight checks
            if int(version.value) > int(config.SETTINGS_SCHEMA_VERSION):
                print("""
The database schema version is %d, whilst the version required by the \
software is %d.
Exiting...""" % (version.value, config.SETTINGS_SCHEMA_VERSION))
                sys.exit(1)
            elif int(version.value) == int(config.SETTINGS_SCHEMA_VERSION):
                print("""
The database schema version is %d as required.
Exiting...""" % (version.value))
                sys.exit(1)

            print("NOTE: Upgrading database schema from version %d to %d." % (
                version.value, config.SETTINGS_SCHEMA_VERSION
            ))
            do_upgrade(app, user_datastore, version)
    else:
        # Get some defaults for the various keys
        config.CSRF_SESSION_KEY = base64.urlsafe_b64encode(os.urandom(32)).decode()
        config.SECRET_KEY = base64.urlsafe_b64encode(os.urandom(32)).decode()
        config.SECURITY_PASSWORD_SALT = base64.urlsafe_b64encode(os.urandom(32)).decode()

        app.config.from_object(config)

        directory = os.path.dirname(config.SQLITE_PATH)
        if not os.path.exists(directory):
            os.makedirs(directory, int('700', 8))
        db_file = os.open(config.SQLITE_PATH, os.O_CREAT, int('600', 8))
        os.close(db_file)

        print("""
The configuration database - '{0}' does not exist.
Entering initial setup mode...""".format(config.SQLITE_PATH))
        do_setup(app)
