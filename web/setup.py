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

import os
import sys
import typer
from rich.console import Console
from rich.table import Table
from rich import box
import json as jsonlib

console = Console()
app = typer.Typer()

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

from pgadmin.model import db, Version, User,\
    SCHEMA_VERSION as CURRENT_SCHEMA_VERSION
from pgadmin import create_app
from pgadmin.utils import clear_database_servers, dump_database_servers,\
    load_database_servers
from pgadmin.setup import db_upgrade, create_app_data_directory
from typing import Optional, List
from typing_extensions import Annotated
from pgadmin.utils.constants import MIMETYPE_APP_JS, INTERNAL, LDAP, OAUTH2,\
    KERBEROS, WEBSERVER
from pgadmin.tools.user_management import create_user, delete_user, update_user
from enum import Enum


class ManageServers:

    @app.command()
    def dump_servers(dump_servers: str, user: Optional[str] = None,
                     auth_source: Optional[str] = INTERNAL,
                     sqlite_path: Optional[str] = None,
                     servers: List[int] = None):
        """Dump the server groups and servers. """

        # What user?
        dump_user = user if user is not None else config.DESKTOP_USER

        # And the sqlite path
        if sqlite_path is not None:
            config.SQLITE_PATH = sqlite_path

        print('----------')
        print('Dumping servers with:')
        print('User:', dump_user)
        print('SQLite pgAdmin config:', config.SQLITE_PATH)
        print('----------')

        app = create_app(config.APP_NAME + '-cli')
        with app.test_request_context():
            dump_database_servers(dump_servers, servers, dump_user, True,
                                  auth_source)

    @app.command()
    def load_servers(loadservers: str, user: Optional[str] = None,
                     auth_source: Optional[str] = INTERNAL,
                     sqlite_path: Optional[str] = None,
                     replace: Optional[bool] = False
                     ):

        """Load server groups and servers."""

        # What user?
        load_user = user if user is not None else config.DESKTOP_USER

        # And the sqlite path
        if sqlite_path is not None:
            config.SQLITE_PATH = sqlite_path

        print('----------')
        print('Loading servers with:')
        print('User:', load_user)
        print('SQLite pgAdmin config:', config.SQLITE_PATH)
        print('----------')

        app = create_app(config.APP_NAME + '-cli')
        if replace:
            with app.app_context():
                clear_database_servers(load_user, True, auth_source)
        else:
            with app.test_request_context():
                load_database_servers(loadservers, None, load_user, True,
                                      auth_source)


class authType(str, Enum):
    internal = INTERNAL
    oauth2 = OAUTH2
    ldap = LDAP
    kerberos = KERBEROS
    webserver = WEBSERVER


class ManageUsers:

    @app.command()
    def add_user(email: str, password: str,
                 role: Annotated[Optional[bool], typer.Option(
                     "--admin/--nonadmin")] = False,
                 auth_source: Optional[str] = INTERNAL,
                 active: Annotated[Optional[bool],
                                   typer.Option("--active/--inactive")] = True,
                 console: Optional[bool] = True,
                 json: Optional[bool] = False
                 ):
        """Add user. """

        data = {
            'email': email,
            'role': 1 if role else 2,
            'active': active,
            'auth_source': auth_source,
            'newPassword': password,
            'confirmPassword': password,
        }
        ManageUsers.create_user(data, console, json)

    @app.command()
    def add_external_user(username: str,
                          auth_source: authType = authType.oauth2,
                          email: Optional[str] = None,
                          role: Annotated[Optional[bool],
                                          typer.Option(
                                              "--admin/--nonadmin")] = False,
                          active: Annotated[Optional[bool],
                                            typer.Option(
                                                "--active/--inactive")] = True,
                          console: Optional[bool] = True,
                          json: Optional[bool] = False
                          ):
        """Add user. """

        data = {
            'username': username,
            'email': email,
            'role': 1 if role else 2,
            'active': active,
            'auth_source': auth_source
        }
        ManageUsers.create_user(data, console, json)

    @app.command()
    def delete_user(username: str, auth_source: authType = authType.internal):
        """Delete user. """
        app = create_app(config.APP_NAME + '-cli')
        with app.test_request_context():
            uid = ManageUsers.get_user(username=username,
                                       auth_source=auth_source)
            if not uid:
                print("User not found")
            else:
                status, msg = delete_user(uid)
                if status:
                    print('User deleted successfully.')
                else:
                    print('Something went wrong. ' + str(msg))

    @app.command()
    def update_user(email: str,
                    password: Optional[str] = None,
                    role: Annotated[Optional[bool],
                                    typer.Option("--admin/--nonadmin"
                                                 )] = False,
                    active: Annotated[Optional[bool],
                                      typer.Option("--active/--inactive"
                                                   )] = None,
                    console: Optional[bool] = True,
                    json: Optional[bool] = False
                    ):
        data = dict()
        if password:
            data['password'] = password
        if role:
            data['role'] = 1 if role else 2
        if active is not None:
            data['active'] = active

        app = create_app(config.APP_NAME + '-cli')
        with app.test_request_context():
            uid = ManageUsers.get_user(username=email,
                                       auth_source=INTERNAL)
            if not uid:
                print("User not found")
            else:
                status, msg = update_user(uid, data)
                if status:
                    _user = ManageUsers.get_users(username=email,
                                                  auth_source=INTERNAL,
                                                  console=False)
                    ManageUsers.display_user(_user[0], console, json)
                else:
                    print('Something went wrong. ' + str(msg))

    @app.command()
    def get_users(username:Optional[str] = None,
                  auth_source: authType = authType.internal,
                  console:Optional[bool] = True,
                  json:Optional[bool] = False
                  ):
        app = create_app(config.APP_NAME + '-cli')
        usr = None
        with app.test_request_context():
            if username:
                users = User.query.filter_by(username=username,
                                             auth_source=auth_source)
            else:
                users = User.query.all()
            users_data = []
            for u in users:
                _data = {'id': u.id,
                         'username': u.username,
                         'email': u.email,
                         'active': u.active,
                         'role': u.roles[0].id,
                         'auth_source': u.auth_source,
                         'locked': u.locked
                         }
                users_data.append(_data)
                if console:
                    ManageUsers.display_user(_data, False, json)
            if not console:
                return users_data

    @app.command()
    def update_external_user(username: str,
                             auth_source: authType = authType.oauth2,
                             email: Optional[str] = None,
                             password: Optional[str] = None,
                             role: Optional[str] = None,
                             active: Annotated[
                                 Optional[bool],
                                 typer.Option("--active/--inactive")] = None,
                             console: Optional[bool] = True,
                             json: Optional[bool] = False
                             ):
        data = dict()
        if email:
            data['email'] = email
        if password:
            data['password'] = password
        if role:
            data['role'] = role
        if active is not None:
            data['active'] = active

        app = create_app(config.APP_NAME + '-cli')
        with app.test_request_context():
            uid = ManageUsers.get_user(username=username,
                                       auth_source=auth_source)
            if not uid:
                print("User not found")
            else:
                status, msg = update_user(uid, data)
                if status:
                    _user = ManageUsers.get_users(username=email,
                                                  auth_source=auth_source,
                                                  console=False)
                    ManageUsers.display_user(_user[0], console, json)
                else:
                    print('Something went wrong. ' + str(msg))

    def create_user(data, console, json):
        app = create_app(config.APP_NAME + '-cli')
        with app.test_request_context():
            status, msg = create_user(data)
            if status:
                ManageUsers.display_user(data, console, json)
            else:
                print('Something went wrong. ' + str(msg))

    def get_user(username=None, auth_source=INTERNAL):
        app = create_app(config.APP_NAME + '-cli')
        usr = None
        with app.test_request_context():
            usr = User.query.filter_by(username=username,
                                       auth_source=auth_source).first()

            if not usr:
                return None
            return usr.id

    def display_user(data, _console, _json):
        if _json:
            json_formatted_str = jsonlib.dumps(data, indent=0)
            console.print(json_formatted_str)
        else:
            table = Table(title="User Details", box=box.ASCII)
            table.add_column("Field", style="green")
            table.add_column("Value", style="green")

            if 'username' in data:
                table.add_row("Username", data['username'])
            if 'email' in data:
                table.add_row("Email", data['email'])
            table.add_row("auth_source", data['auth_source'])
            table.add_row("role",
                          "Admin" if data['role'] and data['role'] != 2 else
                          "Non-admin")
            table.add_row("active",
                          'True' if data['active'] else 'False')
            console.print(table)


class ManagePreferences:

    def get_user(username=None, auth_source=INTERNAL):
        app = create_app(config.APP_NAME + '-cli')
        usr = None
        with app.test_request_context():
            usr = User.query.filter_by(username=username,
                                       auth_source=auth_source).first()
            if not usr:
                return None
            return usr.id

    @app.command()
    def get_prefs(id: Optional[bool] = None, json: Optional[bool] = False):
        app = create_app(config.APP_NAME + '-cli')
        table = Table(title="Pref Details", box=box.ASCII)
        table.add_column("Preference", style="green")
        with app.app_context():
            from pgadmin.preferences import save_pref
            from pgadmin.utils.preferences import Preferences
            from pgadmin.model import db, Preferences as PrefTable, \
                ModulePreference as ModulePrefTable, \
                UserPreference as UserPrefTable, \
                PreferenceCategory as PrefCategoryTbl

            module_prefs = ModulePrefTable.query.all()
            cat_prefs = PrefCategoryTbl.query.all()
            prefs = PrefTable.query.all()
            if id:
                all_preferences = {}
            else:
                all_preferences = []
            for i in module_prefs:
                for j in cat_prefs:
                    if i.id == j.mid:
                        for k in prefs:
                            if k.cid == j.id:
                                if id:
                                    all_preferences["{0}:{1}:{2}".format(
                                        i.name, j.name, k.name)
                                    ] = "{0}:{1}:{2}".format(i.id, j.id, k.id)
                                else:
                                    table.add_row("{0}:{1}:{2}".format(
                                        i.name, j.name, k.name))
                                    all_preferences.append(
                                        "{0}:{1}:{2}".format(
                                            i.name, j.name, k.name)
                                    )
            if id:
                return all_preferences
            else:
                if json:
                    json_formatted_str = jsonlib.dumps(
                        {"Preferences": all_preferences},
                        indent=0)
                    console.print(json_formatted_str)
                else:
                    console.print(table)

    @app.command()
    def set_prefs(username, pref_options: List[str],
                  auth_source: authType = authType.internal,
                  json: Optional[bool] = False):
        user_id = ManagePreferences.get_user(username, auth_source)
        app = create_app(config.APP_NAME + '-cli')
        table = Table(title="Pref Details", box=box.ASCII)
        table.add_column("Preference", style="green")
        if not user_id:
            print("User not found.")
            return

        prefs = ManagePreferences.get_prefs(True)
        app = create_app(config.APP_NAME + '-cli')
        with app.app_context():
            from pgadmin.preferences import save_pref
            for opt in pref_options:
                val = opt.split("=")
                final_opt = val[0].split(":")
                val = val[1]
                f = ":".join(final_opt)
                if f in prefs:
                    ids = prefs[f].split(":")
                    save_pref({
                        'mid': ids[0],
                        'category_id': ids[1],
                        'id': ids[2],
                        'name': final_opt[2],
                        'user_id': user_id,
                        'value': val})
                    _row = {
                        'mid': ids[0],
                        'category_id': ids[1],
                        'id': ids[2],
                        'name': final_opt[2],
                        'user_id': user_id,
                        'value': val}
                    if json:
                        json_formatted_str = jsonlib.dumps(_row, indent=0)
                        console.print(json_formatted_str)
                    else:
                        table.add_row(jsonlib.dumps(_row))

            if not json:
                console.print(table)


@app.command()
def setup_db():
    """Setup the configuration database."""

    app = create_app()
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


def main():
    app()


if __name__ == "__main__":
    main()
