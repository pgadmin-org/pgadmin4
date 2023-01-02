#########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Perform the initial setup of the application, by creating the auth
and settings database."""

import argparse
import os
import sys

# We need to include the root directory in sys.path to ensure that we can
# find everything we need when running in the standalone runtime.
root = os.path.dirname(os.path.realpath(__file__))
if sys.path[0] != root:
    sys.path.insert(0, root)

import builtins
import config

# Grab the SERVER_MODE if it's been set by the runtime
if 'SERVER_MODE' in globals():
    builtins.SERVER_MODE = globals()['SERVER_MODE']
else:
    builtins.SERVER_MODE = None

from pgadmin.model import db, Version, SCHEMA_VERSION as CURRENT_SCHEMA_VERSION
from pgadmin import create_app
from pgadmin.utils import clear_database_servers, dump_database_servers,\
    load_database_servers
from pgadmin.setup import db_upgrade, create_app_data_directory


def dump_servers(args):
    """Dump the server groups and servers.

    Args:
        args (ArgParser): The parsed command line options
    """

    # What user?
    if args.user is not None:
        dump_user = args.user
    else:
        dump_user = config.DESKTOP_USER

    # And the sqlite path
    if args.sqlite_path is not None:
        config.SQLITE_PATH = args.sqlite_path

    print('----------')
    print('Dumping servers with:')
    print('User:', dump_user)
    print('SQLite pgAdmin config:', config.SQLITE_PATH)
    print('----------')

    app = create_app(config.APP_NAME + '-cli')
    with app.test_request_context():
        dump_database_servers(args.dump_servers, args.servers, dump_user, True)


def load_servers(args):
    """Load server groups and servers.

    Args:
        args (ArgParser): The parsed command line options
    """

    # What user?
    load_user = args.user if args.user is not None else config.DESKTOP_USER

    # And the sqlite path
    if args.sqlite_path is not None:
        config.SQLITE_PATH = args.sqlite_path

    print('----------')
    print('Loading servers with:')
    print('User:', load_user)
    print('SQLite pgAdmin config:', config.SQLITE_PATH)
    print('----------')

    app = create_app(config.APP_NAME + '-cli')
    with app.test_request_context():
        load_database_servers(args.load_servers, None, load_user, True)


def setup_db(app):
    """Setup the configuration database."""

    create_app_data_directory(config)

    print("pgAdmin 4 - Application Initialisation")
    print("======================================\n")

    def run_migration_for_sqlite():
        with app.app_context():
            # Run migration for the first time i.e. create database
            from config import SQLITE_PATH
            if not os.path.exists(SQLITE_PATH):
                db_upgrade(app)
            else:
                version = Version.query.filter_by(name='ConfigDB').first()
                schema_version = version.value

                # Run migration if current schema version is greater than the
                # schema version stored in version table
                if CURRENT_SCHEMA_VERSION >= schema_version:
                    db_upgrade(app)

                # Update schema version to the latest
                if CURRENT_SCHEMA_VERSION > schema_version:
                    version = Version.query.filter_by(name='ConfigDB').first()
                    version.value = CURRENT_SCHEMA_VERSION
                    db.session.commit()

            if os.name != 'nt':
                os.chmod(config.SQLITE_PATH, 0o600)

    def run_migration_for_others():
        with app.app_context():
            version = Version.query.filter_by(name='ConfigDB').first()
            if version == -1:
                db_upgrade(app)
            else:
                schema_version = version.value

                # Run migration if current schema version is greater than the
                # schema version stored in version table
                if CURRENT_SCHEMA_VERSION >= schema_version:
                    db_upgrade(app)

                # Update schema version to the latest
                if CURRENT_SCHEMA_VERSION > schema_version:
                    version = Version.query.filter_by(name='ConfigDB').first()
                    version.value = CURRENT_SCHEMA_VERSION
                    db.session.commit()

    # Run the migration as per specified by the user.
    if config.CONFIG_DATABASE_URI is not None and \
            len(config.CONFIG_DATABASE_URI) > 0:
        run_migration_for_others()
    else:
        run_migration_for_sqlite()


def clear_servers():
    """Clear groups and servers configurations.

    Args:
        args (ArgParser): The parsed command line options
    """

    # What user?
    load_user = args.user if args.user is not None else config.DESKTOP_USER

    # And the sqlite path
    if args.sqlite_path is not None:
        config.SQLITE_PATH = args.sqlite_path

    app = create_app(config.APP_NAME + '-cli')
    with app.app_context():
        clear_database_servers(load_user, True)


if __name__ == '__main__':
    # Configuration settings
    parser = argparse.ArgumentParser(description='Setup the pgAdmin config DB')

    exp_group = parser.add_argument_group('Dump server config')
    exp_group.add_argument('--dump-servers', metavar="OUTPUT_FILE",
                           help='Dump the servers in the DB', required=False)
    exp_group.add_argument('--servers', metavar="SERVERS", nargs='*',
                           help='One or more servers to dump', required=False)

    imp_group = parser.add_argument_group('Load server config')
    imp_group.add_argument('--load-servers', metavar="INPUT_FILE",
                           help='Load servers into the DB', required=False)
    imp_group.add_argument('--replace', dest='replace', action='store_true',
                           help='replace server configurations',
                           required=False)

    imp_group.set_defaults(replace=False)
    # Common args
    parser.add_argument('--sqlite-path', metavar="PATH",
                        help='Dump/load with the specified pgAdmin config DB'
                             ' file. This is particularly helpful when there'
                             ' are multiple pgAdmin configurations. It is also'
                             ' recommended to use this option when running'
                             ' pgAdmin in desktop mode.', required=False)
    parser.add_argument('--user', metavar="USER_NAME",
                        help='Dump/load servers for the specified username',
                        required=False)

    args, extra = parser.parse_known_args()

    config.SETTINGS_SCHEMA_VERSION = CURRENT_SCHEMA_VERSION
    if "PGADMIN_TESTING_MODE" in os.environ and \
            os.environ["PGADMIN_TESTING_MODE"] == "1":
        config.SQLITE_PATH = config.TEST_SQLITE_PATH

    # What to do?
    if args.dump_servers is not None:
        try:
            dump_servers(args)
        except Exception as e:
            print(str(e))
    elif args.load_servers is not None:
        try:
            if args.replace:
                clear_servers()
            load_servers(args)
        except Exception as e:
            print(str(e))
    else:
        app = create_app()
        setup_db(app)
