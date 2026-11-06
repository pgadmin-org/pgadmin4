##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Implementation of ServerManager
"""
import datetime
import os
import config
import logging
from flask import current_app, session
from flask_security import current_user
from flask_babel import gettext
from werkzeug.exceptions import InternalServerError

from pgadmin.utils import get_complete_file_path, \
    connection_param_bool_to_int, is_valid_connection_param_key, \
    client_files_isolated, isolate_client_credential_files, \
    check_connection_params_allowed
from pgadmin.utils.crypto import decrypt
from pgadmin.utils.master_password import process_masterpass_disabled
from pgadmin.utils.locker import KerberosNotAllowed, \
    apply_kerberos_conn_params, check_kerberos_conn_params_unchanged
from .connection import Connection
from pgadmin.model import Server, User
from pgadmin.utils.exception import ConnectionLost, SSHTunnelConnectionLost,\
    CryptKeyMissing
from pgadmin.utils.master_password import get_crypt_key
from pgadmin.utils.exception import ObjectGone
from pgadmin.utils.passexec import build_passexec
from psycopg.conninfo import make_conninfo, conninfo_to_dict

if config.SUPPORT_SSH_TUNNEL:
    from sshtunnel import SSHTunnelForwarder, BaseSSHTunnelForwarderError

CONN_STRING = 'CONN:{0}'
DB_STRING = 'DB:{0}'


class ServerManager(object):
    """
    class ServerManager

    This class contains the information about the given server.
    And, acts as connection manager for that particular session.
    """
    _INFORMATION_MSG = gettext("Information is not available.")

    def __init__(self, server):
        self.connections = dict()
        self.local_bind_host = '127.0.0.1'
        self.local_bind_port = None
        self.tunnel_object = None
        self.tunnel_created = False
        self.display_connection_string = ''
        # fs_uniquifier of the pgAdmin user this manager was built for;
        # set by the driver, see Driver._current_pga_user.
        self.pga_user = None

        self.update(server)

    def update(self, server):
        assert (server is not None)
        assert (isinstance(server, Server))

        self.ver = None
        self.sversion = None
        self.server_type = None
        self.server_cls = None
        self.password = None
        self.tunnel_password = None

        self.sid = server.id
        self.host = server.host
        self.port = server.port
        self.db = server.maintenance_db
        self.shared = server.shared
        self.did = None
        self.user = server.username
        self.password = server.password
        self.role = server.role
        self.pinged = datetime.datetime.now()
        self.db_info = dict()
        self.server_types = None
        self.db_res = server.db_res
        self.db_res_type = server.db_res_type
        self.name = server.name
        self.passexec = build_passexec(server)
        self.service = server.service

        if config.SUPPORT_SSH_TUNNEL:
            self.use_ssh_tunnel = server.use_ssh_tunnel
            self.tunnel_host = server.tunnel_host
            self.tunnel_port = \
                22 if server.tunnel_port is None else server.tunnel_port
            self.tunnel_username = server.tunnel_username
            self.tunnel_authentication = 0 \
                if server.tunnel_authentication is None \
                else server.tunnel_authentication
            self.tunnel_identity_file = server.tunnel_identity_file
            self.tunnel_prompt_password = server.tunnel_prompt_password
            self.tunnel_password = server.tunnel_password
            self.tunnel_keep_alive = server.tunnel_keep_alive
        else:
            self.use_ssh_tunnel = 0
            self.tunnel_host = None
            self.tunnel_port = 22
            self.tunnel_username = None
            self.tunnel_authentication = None
            self.tunnel_identity_file = None
            self.tunnel_prompt_password = 0
            self.tunnel_password = None
            self.tunnel_keep_alive = 0

        self.kerberos_conn = server.kerberos_conn
        self.gss_authenticated = False
        self.gss_encrypted = False
        self.connection_params = server.connection_params
        try:
            self.create_connection_string(self.db, self.user)
        except PermissionError:
            # A file path that escapes the user's storage directory, or a
            # connection parameter whose key is not a libpq keyword, is
            # reported when a connection is attempted; it must not stop the
            # server being listed, or edited to correct the value.
            pass
        self.prepare_threshold = server.prepare_threshold
        self.post_connection_sql = server.post_connection_sql

        for con in self.connections:
            self.connections[con]._release()

        self.update_session()

        self.connections = dict()

    def _set_password(self, res):
        """
        Set password for server manager object.
        :param res: response dict.
        :return:
        """
        if hasattr(self, 'password') and self.password:
            if hasattr(self.password, 'decode'):
                res['password'] = self.password.decode('utf-8')
            else:
                res['password'] = str(self.password)
        else:
            res['password'] = self.password

    def as_dict(self):
        """
        Returns a dictionary object representing the server manager.
        """
        if self.ver is None or len(self.connections) == 0:
            return None

        res = dict()
        res['sid'] = self.sid
        res['ver'] = self.ver
        res['sversion'] = self.sversion

        # Persisted alongside the connection state so a later restore
        # (e.g. after a worker restart) can tell whether this blob still
        # belongs to the Server row for this id, or whether the id was
        # reused by an unrelated row after the configuration database
        # was reset/restored - see Driver._manager_is_stale.
        res['host'] = self.host
        res['port'] = self.port
        res['db'] = self.db
        res['user'] = self.user
        res['service'] = self.service
        res['tunnel_host'] = self.tunnel_host
        res['pga_user'] = self.pga_user

        self._set_password(res)

        if self.use_ssh_tunnel:
            if hasattr(self, 'tunnel_password') and self.tunnel_password:
                if hasattr(self.tunnel_password, 'decode'):
                    res['tunnel_password'] = \
                        self.tunnel_password.decode('utf-8')
                else:
                    res['tunnel_password'] = str(self.tunnel_password)
            else:
                res['tunnel_password'] = self.tunnel_password

        connections = res['connections'] = dict()

        for conn_id in self.connections:
            conn = self.connections[conn_id].as_dict()

            if conn is not None:
                connections[conn_id] = conn

        return res

    def server_version(self):
        return self.ver

    @property
    def version(self):
        return self.sversion

    def major_version(self):
        if self.sversion is not None:
            return int(self.sversion / 10000)
        raise InternalServerError(self._INFORMATION_MSG)

    def minor_version(self):
        if self.sversion:
            return int(int(self.sversion / 100) % 100)
        raise InternalServerError(self._INFORMATION_MSG)

    def patch_version(self):
        if self.sversion:
            return int(int(self.sversion / 100) / 100)
        raise InternalServerError(self._INFORMATION_MSG)

    def connection(self, **kwargs):
        database = kwargs.get('database', None)
        conn_id = kwargs.get('conn_id', None)
        auto_reconnect = kwargs.get('auto_reconnect', True)
        did = kwargs.get('did', None)
        async_ = kwargs.get('async_', None)
        use_binary_placeholder = kwargs.get('use_binary_placeholder', False)
        array_to_string = kwargs.get('array_to_string', False)

        if database is not None:
            if did is not None and did in self.db_info:
                self.db_info[did]['datname'] = database
        else:
            conn_str = CONN_STRING.format(conn_id)
            if did is None:
                database = self.db
            elif did in self.db_info:
                database = self.db_info[did]['datname']
            elif conn_id and conn_str in self.connections:
                database = self.connections[conn_str].db
            else:
                maintenance_db_id = DB_STRING.format(self.db)
                if maintenance_db_id in self.connections:
                    conn = self.connections[maintenance_db_id]
                    # try to connect maintenance db if not connected
                    if not conn.connected():
                        conn.connect()

                    if conn.connected():
                        status, res = conn.execute_dict("""
SELECT
    db.oid as did, db.datname, db.datallowconn,
    pg_catalog.pg_encoding_to_char(db.encoding) AS serverencoding,
    pg_catalog.has_database_privilege(db.oid, 'CREATE') as cancreate,
    datistemplate
FROM
    pg_catalog.pg_database db
WHERE db.oid = {0}""".format(did))

                        if status and len(res['rows']) > 0:
                            for row in res['rows']:
                                self.db_info[did] = row
                                database = self.db_info[did]['datname']

                        if did not in self.db_info:
                            raise ObjectGone(gettext(
                                "Could not find the specified database."
                            ))

        if not get_crypt_key()[0] and (
                config.SERVER_MODE or not config.USE_OS_SECRET_STORAGE):
            # the reason its not connected might be missing key
            raise CryptKeyMissing()

        if database is None:
            # Check SSH Tunnel is alive or not.
            if self.use_ssh_tunnel == 1:
                self.check_ssh_tunnel_alive()
            else:
                raise ConnectionLost(self.sid, None, None)

        my_id = (CONN_STRING.format(conn_id)) if conn_id is not None else \
            (DB_STRING.format(database))

        self.pinged = datetime.datetime.now()

        if my_id in self.connections:
            return self.connections[my_id]
        else:
            if async_ is None:
                async_ = 1 if conn_id is not None else 0
            else:
                async_ = 1 if async_ is True else 0
            self.connections[my_id] = Connection(
                self, my_id, database, auto_reconnect=auto_reconnect,
                async_=async_,
                use_binary_placeholder=use_binary_placeholder,
                array_to_string=array_to_string
            )

            return self.connections[my_id]

    @staticmethod
    def _get_password_to_conn(data, masterpass_processed):
        """
        Get password for connect to server with simple and ssh connection.
        :param data: Data.
        :param masterpass_processed:
        :return:
        """
        # The data variable is a copy so is not automatically synced
        # update here
        if masterpass_processed and 'password' in data:
            data['password'] = None
        if masterpass_processed and 'tunnel_password' in data:
            data['tunnel_password'] = None

    def _get_server_type(self):
        """
        Get server type and server cls.
        :return:
        """
        from pgadmin.browser.server_groups.servers.types import ServerType

        if self.ver and not self.server_type:
            for st in ServerType.types():
                if st.instance_of(self.ver):
                    self.server_type = st.stype
                    self.server_cls = st
                    break

    def _check_and_reconnect_server(self, conn, conn_info, data):
        """
        Check and try to reconnect the server if server previously connected
        and auto_reconnect is true.
        :param conn:
        :type conn:
        :param conn_info:
        :type conn_info:
        :param data:
        :type data:
        :return:
        :rtype:
        """
        from pgadmin.browser.server_groups.servers.types import ServerType
        if conn_info['wasConnected'] and conn_info['auto_reconnect']:
            try:
                # Check SSH Tunnel needs to be created
                if self.use_ssh_tunnel == 1 and \
                        not self.tunnel_created:
                    self.create_ssh_tunnel(data['tunnel_password'])

                    # Check SSH Tunnel is alive or not.
                    self.check_ssh_tunnel_alive()

                conn.connect(
                    password=data['password'],
                    server_types=ServerType.types()
                )
                # This will also update wasConnected flag in
                # connection so no need to update the flag manually.
            except CryptKeyMissing:
                # maintain the status as this will help to restore once
                # the key is available
                conn.wasConnected = conn_info['wasConnected']
                conn.auto_reconnect = conn_info['auto_reconnect']
            except Exception as e:
                current_app.logger.exception(e)
                self.connections.pop(conn_info['conn_id'])
                raise

    def _restore(self, data):
        """
        Helps restoring to reconnect the auto-connect connections smoothly on
        reload/restart of the app server..
        """
        # restore server version from flask session if flask server was
        # restarted. As we need server version to resolve sql template paths.
        masterpass_processed = process_masterpass_disabled()

        ServerManager._get_password_to_conn(data, masterpass_processed)
        # Get server type.
        self._get_server_type()

        # We need to know about the existing server variant supports during
        # first connection for identifications.
        self.pinged = datetime.datetime.now()
        try:
            if 'password' in data and data['password'] and \
                    hasattr(data['password'], 'encode'):
                data['password'] = data['password'].encode('utf-8')
            if 'tunnel_password' in data and data['tunnel_password']:
                data['tunnel_password'] = \
                    data['tunnel_password'].encode('utf-8')
        except Exception as e:
            current_app.logger.exception(e)

        connections = data['connections']

        for conn_id in connections:
            conn_info = connections[conn_id]
            if conn_info['conn_id'] in self.connections:
                conn = self.connections[conn_info['conn_id']]
            else:
                conn = self.connections[conn_info['conn_id']] = Connection(
                    self, conn_info['conn_id'], conn_info['database'],
                    auto_reconnect=conn_info['auto_reconnect'],
                    async_=conn_info['async_'],
                    use_binary_placeholder=conn_info[
                        'use_binary_placeholder'],
                    array_to_string=conn_info['array_to_string']
                )

            # only try to reconnect
            self._check_and_reconnect_server(conn, conn_info, data)

    def _restore_connections(self):
        for conn_id in self.connections:
            conn = self.connections[conn_id]
            # only try to reconnect if connection was connected previously
            # and auto_reconnect is true.
            was_connected = conn.wasConnected
            auto_reconnect = conn.auto_reconnect
            if conn.wasConnected and conn.auto_reconnect:
                try:
                    # Check SSH Tunnel needs to be created
                    if self.use_ssh_tunnel == 1 and \
                       not self.tunnel_created:
                        self.create_ssh_tunnel(self.tunnel_password)

                        # Check SSH Tunnel is alive or not.
                        self.check_ssh_tunnel_alive()

                    conn.connect()
                    # This will also update wasConnected flag in
                    # connection so no need to update the flag manually.
                except CryptKeyMissing:
                    # maintain the status as this will help to restore once
                    # the key is available
                    conn.wasConnected = was_connected
                    conn.auto_reconnect = auto_reconnect
                except Exception as e:
                    self.connections.pop(conn_id)
                    current_app.logger.exception(e)
                    raise

    def _stop_ssh_tunnel(self, did, database, conn_id):
        """
        Stop ssh tunnel connection if function call without any parameter.
        :param did: Database Id.
        :param database: Database.
        :param conn_id: COnnection Id.
        :return:
        """
        if database is None and conn_id is None and did is None:
            self.stop_ssh_tunnel()

    def _check_db_info(self, did, conn_id, database):
        """
        Check did is not none and it is resent in db_info.
        :param did: Database Id.
        :param conn_id: Connection Id.
        :return:
        """
        if database is None and conn_id is None and did is None:
            self.stop_ssh_tunnel()

        my_id = None
        if did is not None:
            if did in self.db_info and 'datname' in self.db_info[did]:
                database = self.db_info[did]['datname']
                if database is None:
                    return True, False, my_id
            else:
                return True, False, my_id

        if conn_id is not None:
            my_id = CONN_STRING.format(conn_id)
        elif database is not None:
            my_id = DB_STRING.format(database)

        return False, True, my_id

    def release(self, database=None, conn_id=None, did=None):
        # Stop the SSH tunnel if release() function calls without
        # any parameter.
        is_return, return_value, my_id = self._check_db_info(did, conn_id,
                                                             database)
        if is_return:
            return return_value

        if my_id is not None:
            if my_id in self.connections:
                self.connections[my_id]._release()
                del self.connections[my_id]
                if did is not None:
                    del self.db_info[did]

                if len(self.connections) == 0:
                    self.ver = None
                    self.sversion = None
                    self.server_type = None
                    self.server_cls = None
                    self.password = None

                self.update_session()

                return True
            else:
                return False

        for con_key in list(self.connections.keys()):
            conn = self.connections[con_key]
            # Cancel the ongoing transaction before closing the connection
            # as it may hang forever
            if conn.connected() and conn.conn_id is not None and \
               conn.conn_id.startswith('CONN:'):
                conn.cancel_transaction(conn.conn_id[5:])
            conn._release()

        self.connections = dict()
        self.ver = None
        self.sversion = None
        self.server_type = None
        self.server_cls = None
        self.password = None

        self.update_session()

        return True

    def _update_password(self, passwd):
        self.password = passwd
        for conn_id in self.connections:
            conn = self.connections[conn_id]
            if conn.conn is not None or conn.wasConnected is True:
                conn.password = passwd

    def update_session(self):
        managers = session['__pgsql_server_managers'] \
            if '__pgsql_server_managers' in session else dict()
        updated_mgr = self.as_dict()

        if not updated_mgr:
            if self.sid in managers:
                managers.pop(self.sid)
        else:
            managers[self.sid] = updated_mgr
        session['__pgsql_server_managers'] = managers
        session.force_write = True

    def utility(self, operation):
        """
        utility(operation)

        Returns: name of the utility which used for the operation
        """
        if self.server_cls is not None:
            return self.server_cls.utility(operation, self.sversion)

        return None

    def export_password_env(self, env, name='PGPASSWORD'):
        """
        Put the server's password, if it has one, into env[name], where env
        is the environment being built for a child process.

        It must never go into os.environ: pgAdmin's own environment is
        shared by every user's requests and copied into every process it
        starts, so a password left there would be handed to other users'
        utilities and psql sessions, and read by libpq for their
        connections.

        Returns:
            False and an error message if the password cannot be
            decrypted, otherwise None
        """
        if self.password:
            crypt_key_present, crypt_key = get_crypt_key()
            if not crypt_key_present:
                return False, crypt_key
            env[str(name)] = decrypt(self.password, crypt_key).decode()
        elif self.passexec:
            env[str(name)] = self.passexec.get()

    def create_ssh_tunnel(self, tunnel_password):
        """
        This method is used to create ssh tunnel and update the IP Address and
        IP Address and port to localhost and the local bind port return by the
        SSHTunnelForwarder class.
        :return: True if tunnel is successfully created else error message.
        """
        # Fetch Logged in User Details.
        user = User.query.filter_by(id=current_user.id).first()
        if user is None:
            return False, gettext("Unauthorized request.")

        if tunnel_password is not None and tunnel_password != '':
            crypt_key_present, crypt_key = get_crypt_key()
            if not crypt_key_present:
                raise CryptKeyMissing()

            try:
                tunnel_password = decrypt(tunnel_password, crypt_key)
                # password is in bytes, for python3 we need it in string
                if isinstance(tunnel_password, bytes):
                    tunnel_password = tunnel_password.decode()
            except Exception as e:
                current_app.logger.exception(e)
                return False, gettext("Failed to decrypt the SSH tunnel "
                                      "password.\nError: {0}").format(str(e))

        try:
            # If authentication method is 1 then it uses identity file
            # and password
            ssh_logger = None
            if current_app.debug:
                ssh_logger = logging.getLogger('sshtunnel')
                ssh_logger.setLevel(logging.DEBUG)
                for h in current_app.logger.handlers:
                    ssh_logger.addHandler(h)
            # In desktop mode the account pgAdmin runs as is the user, so
            # sshtunnel keeps its defaults: the keys in ~/.ssh, ~/.ssh/config
            # and the ssh-agent are all available, and the agent is only
            # kept away when the user configured a credential of their own
            # (#9814). In server mode that account is shared by every pgAdmin
            # user, so none of its ambient credentials may be used: the
            # tunnel authenticates only with the password or the identity
            # file (inside the user's storage directory) the user supplied.
            # Do not read ~/.ssh/id_*, ~/.ssh/config (IdentityFile, User,
            # HostName, ProxyCommand) or the agent, and report a missing
            # identity file as a failure instead of falling back to them.
            server_mode = config.SERVER_MODE and \
                not getattr(current_app, 'PGADMIN_RUNTIME', False)
            isolation = {}
            if server_mode:
                isolation = dict(
                    host_pkey_directories=[],
                    ssh_config_file=os.devnull,
                    allow_agent=False
                )

            if self.tunnel_authentication == 1:
                try:
                    tunnel_identity_file = get_complete_file_path(
                        self.tunnel_identity_file)
                except PermissionError as e:
                    return False, str(e)
                if server_mode and tunnel_identity_file is None:
                    return False, gettext(
                        "The SSH tunnel identity file \"{0}\" could not be "
                        "found. Specify an identity file located in your "
                        "storage directory.").format(
                            self.tunnel_identity_file or '')
                if not server_mode:
                    isolation = dict(
                        allow_agent=not self.tunnel_identity_file)
                self.tunnel_object = SSHTunnelForwarder(
                    (self.tunnel_host, int(self.tunnel_port)),
                    ssh_username=self.tunnel_username,
                    ssh_pkey=tunnel_identity_file,
                    ssh_private_key_password=tunnel_password,
                    remote_bind_address=(self.host, self.port),
                    logger=ssh_logger,
                    set_keepalive=int(self.tunnel_keep_alive),
                    **isolation
                )
            else:
                if not server_mode:
                    isolation = dict(allow_agent=not tunnel_password)
                self.tunnel_object = SSHTunnelForwarder(
                    (self.tunnel_host, int(self.tunnel_port)),
                    ssh_username=self.tunnel_username,
                    ssh_password=tunnel_password,
                    remote_bind_address=(self.host, self.port),
                    logger=ssh_logger,
                    set_keepalive=int(self.tunnel_keep_alive),
                    **isolation
                )
            # flag tunnel threads in daemon mode to fix hang issue.
            self.tunnel_object.daemon_forward_servers = True
            self.tunnel_object.start()
            self.tunnel_created = True
        except (BaseSSHTunnelForwarderError, ValueError) as e:
            # sshtunnel raises a bare ValueError rather than one of its own
            # exceptions when it finds no credential to authenticate with, so
            # catch that too and report it the same way instead of letting it
            # escape as an unhandled exception.
            current_app.logger.exception(e)
            return False, gettext(
                "Failed to create the SSH tunnel. Possible causes:\n"
                "1. Enter the correct tunnel password (Clear saved password "
                "if it has changed).\n 2. If using an identity file that "
                "requires a password, enable “Prompt for Password?” in the "
                "server dialog. \n 3. Verify the host address.")

        # Update the port to communicate locally
        self.local_bind_port = self.tunnel_object.local_bind_port

        return True, None

    def check_ssh_tunnel_alive(self):
        # Check SSH Tunnel is alive or not. if it is not then
        # raise the ConnectionLost exception.
        if self.tunnel_object is None or not self.tunnel_object.is_active:
            self.tunnel_created = False
            raise SSHTunnelConnectionLost(self.tunnel_host)

    def stop_ssh_tunnel(self):
        # Stop the SSH tunnel if created.
        if self.tunnel_object and self.tunnel_object.is_active:
            self.tunnel_object.stop()
            self.local_bind_port = None
            self.tunnel_object = None
            self.tunnel_created = False

    def get_connection_param_value(self, param_name):
        """
        This function return the value of param_name if found in the
        connection parameter.
        """
        value = None
        if self.connection_params and param_name in self.connection_params:
            value = self.connection_params[param_name]

        return value

    def create_connection_string(self, database, user, password=None,
                                 for_utility=False):
        """
        This function is used to create connection string based on the
        parameters.

        :param for_utility: the string is for a utility, such as psql, with
            its own libpq, so parameters that only a newer libpq knows are
            not added to it; they are in its environment instead.
        """
        dsn_args = dict()
        dsn_args['host'] = self.host
        dsn_args['port'] = \
            self.local_bind_port if self.use_ssh_tunnel else self.port
        dsn_args['dbname'] = database
        dsn_args['user'] = user
        if self.service is not None:
            dsn_args['service'] = self.service
        if self.use_ssh_tunnel:
            dsn_args['hostaddr'] = self.local_bind_host

        # Make a copy to display the connection string on GUI.
        display_dsn_args = dsn_args.copy()
        # Password should not be visible into the connection string, so
        # setting the value with password to 'xxxxxxx'.
        if password:
            display_dsn_args['password'] = 'xxxxxxx'
            dsn_args['password'] = password

        # A file path that escapes the user's storage directory is refused,
        # but only once the display string below has been built.
        path_error = None
        # A connection parameter whose key is not an exact libpq keyword is
        # refused the same way (see below).
        key_error = None

        # In server mode a file is passed on even if it does not exist yet,
        # rather than dropped, because libpq would then use its default file
        # in the service account's home directory instead.  The path is
        # still confined to the user's storage directory.
        validate = not client_files_isolated()

        # Loop through all the connection parameters set in the server dialog.
        if self.connection_params and isinstance(self.connection_params, dict):
            for key, value in self.connection_params.items():
                # make_conninfo() quotes values but not keys, so a key that
                # smuggles its own "keyword=value" pairs would reach libpq
                # unconfined. Rows already in the database are never
                # re-validated on save, so refuse any key that is not an
                # exact libpq keyword here as well, and keep it out of both
                # the connection string and its display copy.
                if not is_valid_connection_param_key(key):
                    key_error = key_error or key
                    continue

                with_complete_path = False
                orig_value = value
                # Getting complete file path if the key is one of the below.
                if key in ['passfile', 'sslcert', 'sslkey','sslcrl',
                           'sslcrldir'] or \
                        (key == 'sslrootcert' and value != 'system'):
                    with_complete_path = True
                    try:
                        value = get_complete_file_path(
                            value, validate=validate)
                    except PermissionError as e:
                        path_error = path_error or e
                        value = None
                elif key == 'sslkeylogfile':
                    # libpq writes this file (it may not exist yet), so skip
                    # the existence check, but still confine it to the user's
                    # storage directory and refuse a read-only shared
                    # storage directory (for_write).
                    with_complete_path = True
                    try:
                        value = get_complete_file_path(
                            value, validate=False, for_write=True)
                    except PermissionError as e:
                        path_error = path_error or e
                        value = None

                # If key is hostaddr and ssh tunnel is in use don't overwrite.
                if key == 'hostaddr' and self.use_ssh_tunnel:
                    continue

                # Convert boolean connection parameters to integer for
                # libpq compatibility
                if key in ('sslcompression', 'sslsni'):
                    value = connection_param_bool_to_int(value)

                dsn_args[key] = value
                display_dsn_args[key] = orig_value if with_complete_path else \
                    value

        # Enable TCP keepalive so that stale/half-open connections are
        # detected by the OS within a reasonable time instead of hanging
        # for the full TCP retransmission timeout (which can be many
        # minutes).  These are libpq parameters passed through to
        # setsockopt and only take effect if not already set by the user
        # in connection_params.
        keepalive_defaults = {
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 3,
        }
        for k, v in keepalive_defaults.items():
            if k not in dsn_args:
                dsn_args[k] = v

        # In server mode, libpq must refuse GSSAPI and SSPI where this
        # connection may not use Kerberos; the environment alone does not
        # stop SSPI or gssproxy.
        kerberos_error = None
        for args in (dsn_args, display_dsn_args):
            try:
                apply_kerberos_conn_params(
                    args, getattr(self, 'kerberos_conn', False),
                    add_missing=not for_utility)
            except KerberosNotAllowed as e:
                kerberos_error = kerberos_error or e

        isolate_client_credential_files(dsn_args)

        # The server's service and a 'service' connection parameter are
        # both looked up in the service account's service file, so both
        # are checked. Only the server's service is passed to utilities
        # (PGSERVICE, via BatchProcess.set_env_variables): 'service' is
        # not in CONNECTION_PARAM_ENV_VARS, so a service set only as a
        # connection parameter applies to pgAdmin's own connections.
        # This is checked before building the display string, as a libpq
        # that does not know an option such as servicefile would fail to
        # build it.
        check_connection_params_allowed(dsn_args)

        self.display_connection_string = make_conninfo(**display_dsn_args)

        # Raised as PermissionError, like a refused path, so the same guard
        # in __init__ defers it: a server with an invalid saved key can
        # still be listed and edited to correct it, while an actual
        # connection attempt is refused.
        if key_error is not None:
            raise PermissionError(
                gettext(
                    'Invalid connection parameter: {0}'
                ).format(key_error)
            )

        if path_error is not None:
            raise path_error

        if kerberos_error is not None:
            raise kerberos_error

        conn_string = make_conninfo(**dsn_args)

        # make_conninfo() quotes parameter values but not their keys, so a
        # crafted key such as 'sslmode=prefer service' smuggles its own
        # service= into the connection string and slips past the dict check
        # above, which matches the exact key 'service'. Re-check the parsed
        # final string, which is exactly what libpq will act on, so the
        # allowlist holds regardless of how the parameters were serialised.
        check_connection_params_allowed(conninfo_to_dict(conn_string))

        # A crafted parameter key (make_conninfo() does not escape keys) can
        # serialise its own require_auth/gssencmode/gsslib into the string,
        # which libpq, or psql whose conninfo outranks PGREQUIREAUTH, would
        # honour. Re-check the parsed final string so the forced values (or
        # their absence, for a utility that gets them from the environment)
        # are what libpq actually acts on, however the parameters were built.
        check_kerberos_conn_params_unchanged(conn_string, dsn_args)

        return conn_string
