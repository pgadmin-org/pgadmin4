#########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Perform the initial setup of the application, by creating the auth
and settings database."""

import argparse
import json
import os
import sys
import builtins
from pgadmin.model import db, User, Version, ServerGroup, Server, \
    SCHEMA_VERSION as CURRENT_SCHEMA_VERSION

# Grab the SERVER_MODE if it's been set by the runtime
if 'SERVER_MODE' in globals():
    builtins.SERVER_MODE = globals()['SERVER_MODE']
else:
    builtins.SERVER_MODE = None

# We need to include the root directory in sys.path to ensure that we can
# find everything we need when running in the standalone runtime.
root = os.path.dirname(os.path.realpath(__file__))
if sys.path[0] != root:
    sys.path.insert(0, root)

from pgadmin import create_app


def add_value(attr_dict, key, value):
    """Add a value to the attribute dict if non-empty.

    Args:
        attr_dict (dict): The dictionary to add the values to
        key (str): The key for the new value
        value (str): The value to add

    Returns:
        The updated attribute dictionary
    """
    if value != "" and value is not None:
        attr_dict[key] = value

    return attr_dict


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
    with app.app_context():
        user = User.query.filter_by(email=dump_user).first()

        if user is None:
            print("The specified user ID (%s) could not be found." %
                  dump_user)
            sys.exit(1)

        user_id = user.id

        # Dict to collect the output
        object_dict = {}

        # Counters
        servers_dumped = 0

        # Dump servers
        servers = Server.query.filter_by(user_id=user_id).all()
        server_dict = {}
        for server in servers:
            if args.servers is None or str(server.id) in args.servers:
                # Get the group name
                group_name = ServerGroup.query.filter_by(
                    user_id=user_id, id=server.servergroup_id).first().name

                attr_dict = {}
                add_value(attr_dict, "Name", server.name)
                add_value(attr_dict, "Group", group_name)
                add_value(attr_dict, "Host", server.host)
                add_value(attr_dict, "HostAddr", server.hostaddr)
                add_value(attr_dict, "Port", server.port)
                add_value(attr_dict, "MaintenanceDB", server.maintenance_db)
                add_value(attr_dict, "Username", server.username)
                add_value(attr_dict, "Role", server.role)
                add_value(attr_dict, "SSLMode", server.ssl_mode)
                add_value(attr_dict, "Comment", server.comment)
                add_value(attr_dict, "DBRestriction", server.db_res)
                add_value(attr_dict, "PassFile", server.passfile)
                add_value(attr_dict, "SSLCert", server.sslcert)
                add_value(attr_dict, "SSLKey", server.sslkey)
                add_value(attr_dict, "SSLRootCert", server.sslrootcert)
                add_value(attr_dict, "SSLCrl", server.sslcrl)
                add_value(attr_dict, "SSLCompression", server.sslcompression)
                add_value(attr_dict, "BGColor", server.bgcolor)
                add_value(attr_dict, "FGColor", server.fgcolor)
                add_value(attr_dict, "Service", server.service)
                add_value(attr_dict, "Timeout", server.connect_timeout)
                add_value(attr_dict, "UseSSHTunnel", server.use_ssh_tunnel)
                add_value(attr_dict, "TunnelHost", server.tunnel_host)
                add_value(attr_dict, "TunnelPort", server.tunnel_port)
                add_value(attr_dict, "TunnelUsername", server.tunnel_username)
                add_value(attr_dict, "TunnelAuthentication",
                          server.tunnel_authentication)

                servers_dumped = servers_dumped + 1

                server_dict[servers_dumped] = attr_dict

        object_dict["Servers"] = server_dict

        try:
            f = open(args.dump_servers, "w")
        except Exception as e:
            print("Error opening output file %s: [%d] %s" %
                  (args.dump_servers, e.errno, e.strerror))
            sys.exit(1)

        try:
            f.write(json.dumps(object_dict, indent=4))
        except Exception as e:
            print("Error writing output file %s: [%d] %s" %
                  (args.dump_servers, e.errno, e.strerror))
            sys.exit(1)

        f.close()

        print("Configuration for %s servers dumped to %s." %
              (servers_dumped, args.dump_servers))


def load_servers(args):
    """Load server groups and servers.

    Args:
        args (ArgParser): The parsed command line options
    """

    # What user?
    if args.user is not None:
        load_user = args.user
    else:
        load_user = config.DESKTOP_USER

    # And the sqlite path
    if args.sqlite_path is not None:
        config.SQLITE_PATH = args.sqlite_path

    print('----------')
    print('Loading servers with:')
    print('User:', load_user)
    print('SQLite pgAdmin config:', config.SQLITE_PATH)
    print('----------')

    try:
        with open(args.load_servers) as f:
            data = json.load(f)
    except json.decoder.JSONDecodeError as e:
        print("Error parsing input file %s: %s" %
              (args.load_servers, e))
        sys.exit(1)
    except Exception as e:
        print("Error reading input file %s: [%d] %s" %
              (args.load_servers, e.errno, e.strerror))
        sys.exit(1)

    f.close()

    app = create_app(config.APP_NAME + '-cli')
    with app.app_context():
        user = User.query.filter_by(email=load_user).first()

        if user is None:
            print("The specified user ID (%s) could not be found." %
                  load_user)
            sys.exit(1)

        user_id = user.id

        # Counters
        groups_added = 0
        servers_added = 0

        # Get the server groups
        groups = ServerGroup.query.filter_by(user_id=user_id)

        def print_summary():
            print("Added %d Server Group(s) and %d Server(s)." %
                  (groups_added, servers_added))
        # Loop through the servers...
        if "Servers" not in data:
            print("'Servers' attribute not found in file '%s'" %
                  args.load_servers)
            print_summary()
            sys.exit(1)

        for server in data["Servers"]:
            obj = data["Servers"][server]

            def check_attrib(attrib):
                if attrib not in obj:
                    print("'%s' attribute not found for server '%s'" %
                          (attrib, server))
                    print_summary()
                    sys.exit(1)

            check_attrib("Name")
            check_attrib("Group")
            check_attrib("Port")
            check_attrib("Username")
            check_attrib("SSLMode")
            check_attrib("MaintenanceDB")

            if "Host" not in obj and \
                "HostAddr" not in obj and \
                    "Service" not in obj:
                print("'Host', 'HostAddr' or 'Service' attribute not found "
                      "for server '%s'" % server)
                print_summary()
                sys.exit(1)

            # Get the group. Create if necessary
            group_id = -1
            for g in groups:
                if g.name == obj["Group"]:
                    group_id = g.id
                    break

            if group_id == -1:
                new_group = ServerGroup()
                new_group.name = obj["Group"]
                new_group.user_id = user_id
                db.session.add(new_group)

                try:
                    db.session.commit()
                except Exception as e:
                    print("Error creating server group '%s': %s" %
                          (new_group.name, e))
                    print_summary()
                    sys.exit(1)

                group_id = new_group.id
                groups_added = groups_added + 1
                groups = ServerGroup.query.filter_by(user_id=user_id)

            # Create the server
            new_server = Server()
            new_server.name = obj["Name"]
            new_server.servergroup_id = group_id
            new_server.user_id = user_id

            new_server.host = obj["Host"]

            if "HostAddr" in obj:
                new_server.hostaddr = obj["HostAddr"]

            new_server.port = obj["Port"]
            new_server.maintenance_db = obj["MaintenanceDB"]
            new_server.username = obj["Username"]

            if "Role" in obj:
                new_server.role = obj["Role"]

            new_server.ssl_mode = obj["SSLMode"]

            if "Comment" in obj:
                new_server.comment = obj["Comment"]

            if "DBRestriction" in obj:
                new_server.db_res = obj["DBRestriction"]

            if "PassFile" in obj:
                new_server.passfile = obj["PassFile"]

            if "SSLCert" in obj:
                new_server.sslcert = obj["SSLCert"]

            if "SSLKey" in obj:
                new_server.sslkey = obj["SSLKey"]

            if "SSLRootCert" in obj:
                new_server.sslrootcert = obj["SSLRootCert"]

            if "SSLCrl" in obj:
                new_server.sslcrl = obj["SSLCrl"]

            if "SSLCompression" in obj:
                new_server.sslcompression = obj["SSLCompression"]

            if "BGColor" in obj:
                new_server.bgcolor = obj["BGColor"]

            if "FGColor" in obj:
                new_server.fgcolor = obj["FGColor"]

            if "Service" in obj:
                new_server.service = obj["Service"]

            if "Timeout" in obj:
                new_server.connect_timeout = obj["Timeout"]

            if "UseSSHTunnel" in obj:
                new_server.use_ssh_tunnel = obj["UseSSHTunnel"]

            if "TunnelHost" in obj:
                new_server.tunnel_host = obj["TunnelHost"]

            if "TunnelPort" in obj:
                new_server.tunnel_port = obj["TunnelPort"]

            if "TunnelUsername" in obj:
                new_server.tunnel_username = obj["TunnelUsername"]

            if "TunnelAuthentication" in obj:
                new_server.tunnel_authentication = obj["TunnelAuthentication"]

            db.session.add(new_server)

            try:
                db.session.commit()
            except Exception as e:
                print("Error creating server '%s': %s" %
                      (new_server.name, e))
                print_summary()
                sys.exit(1)

            servers_added = servers_added + 1

        print_summary()


def setup_db():
    """Setup the configuration database."""

    create_app_data_directory(config)

    app = create_app()

    print(u"pgAdmin 4 - Application Initialisation")
    print(u"======================================\n")

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


if __name__ == '__main__':
    # Configuration settings
    import config
    from pgadmin.model import SCHEMA_VERSION
    from pgadmin.setup import db_upgrade, create_app_data_directory

    parser = argparse.ArgumentParser(description='Setup the pgAdmin config DB')

    exp_group = parser.add_argument_group('Dump server config')
    exp_group.add_argument('--dump-servers', metavar="OUTPUT_FILE",
                           help='Dump the servers in the DB', required=False)
    exp_group.add_argument('--servers', metavar="SERVERS", nargs='*',
                           help='One or more servers to dump', required=False)

    imp_group = parser.add_argument_group('Load server config')
    imp_group.add_argument('--load-servers', metavar="INPUT_FILE",
                           help='Load servers into the DB', required=False)

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

    config.SETTINGS_SCHEMA_VERSION = SCHEMA_VERSION
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
            load_servers(args)
        except Exception as e:
            print(str(e))
    else:
        setup_db()
