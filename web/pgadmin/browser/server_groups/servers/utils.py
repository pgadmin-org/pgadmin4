##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Server helper utilities"""
import config
from ipaddress import ip_address
import keyring
from flask_login import current_user
from werkzeug.exceptions import InternalServerError
from flask import render_template
from pgadmin.utils.constants import KEY_RING_USERNAME_FORMAT, \
    KEY_RING_SERVICE_NAME, KEY_RING_TUNNEL_FORMAT, \
    KEY_RING_DESKTOP_USER, SSL_MODES
from pgadmin.utils.crypto import encrypt, decrypt
from pgadmin.model import db, Server
from flask import current_app
from pgadmin.utils.master_password import set_masterpass_check_text
from pgadmin.utils.driver import get_driver
from .... import socketio as sio
from sqlalchemy import text


def is_valid_ipaddress(address):
    try:
        return bool(ip_address(address))
    except ValueError:
        return False


def parse_priv_from_db(db_privileges):
    """
    Common utility function to parse privileges retrieved from database.
    """
    acl = {
        'grantor': db_privileges['grantor'],
        'grantee': db_privileges['grantee'],
        'privileges': []
    }
    if 'acltype' in db_privileges:
        acl['acltype'] = db_privileges['acltype']

    privileges = []
    for idx, priv in enumerate(db_privileges['privileges']):
        privileges.append({
            "privilege_type": priv,
            "privilege": True,
            "with_grant": db_privileges['grantable'][idx]
        })

    acl['privileges'] = privileges

    return acl


def _check_privilege_type(priv):
    if isinstance(priv['privileges'], dict) \
            and 'changed' in priv['privileges']:
        tmp = []
        for p in priv['privileges']['changed']:
            tmp_p = {'privilege_type': p['privilege_type'],
                     'privilege': False,
                     'with_grant': False}

            if 'with_grant' in p:
                tmp_p['privilege'] = True
                tmp_p['with_grant'] = p['with_grant']

            if 'privilege' in p:
                tmp_p['privilege'] = p['privilege']

            tmp.append(tmp_p)

        priv['privileges'] = tmp


def _parse_privileges(priv, db_privileges, allowed_acls, priv_with_grant,
                      priv_without_grant):
    _check_privilege_type(priv)
    for privilege in priv['privileges']:

        if privilege['privilege_type'] not in db_privileges:
            continue

        if privilege['privilege_type'] not in allowed_acls:
            continue

        if privilege['with_grant']:
            priv_with_grant.append(
                db_privileges[privilege['privilege_type']]
            )
        elif privilege['privilege']:
            priv_without_grant.append(
                db_privileges[privilege['privilege_type']]
            )


def parse_priv_to_db(str_privileges, allowed_acls=[]):
    """
    Common utility function to parse privileges before sending to database.
    """
    from pgadmin.utils.driver import get_driver
    from config import PG_DEFAULT_DRIVER
    driver = get_driver(PG_DEFAULT_DRIVER)

    db_privileges = {
        'c': 'CONNECT',
        'C': 'CREATE',
        'T': 'TEMPORARY',
        'a': 'INSERT',
        'r': 'SELECT',
        'R': 'READ',
        'w': 'UPDATE',
        'W': 'WRITE',
        'd': 'DELETE',
        'D': 'TRUNCATE',
        'x': 'REFERENCES',
        't': 'TRIGGER',
        'U': 'USAGE',
        'X': 'EXECUTE',
        'm': 'MAINTAIN'
    }

    privileges = []
    allowed_acls_len = len(allowed_acls)

    for priv in str_privileges:
        priv_with_grant = []
        priv_without_grant = []

        _parse_privileges(priv, db_privileges, allowed_acls, priv_with_grant,
                          priv_without_grant)

        # If we have all acl then just return all
        if len(priv_with_grant) == allowed_acls_len > 1:
            priv_with_grant = ['ALL']
        if len(priv_without_grant) == allowed_acls_len > 1:
            priv_without_grant = ['ALL']

        grantee = driver.qtIdent(None, priv['grantee']) \
            if priv['grantee'] != 'PUBLIC' else 'PUBLIC'

        old_grantee = driver.qtIdent(None, priv['old_grantee']) \
            if 'old_grantee' in priv and priv['old_grantee'] != 'PUBLIC' \
            else grantee

        acltype = priv['acltype'] if 'acltype' in priv else 'defaultacls'

        grantor = driver.qtIdent(None, priv['grantor'])

        # Appending and returning all ACL
        privileges.append({
            'grantor': grantor,
            'grantee': grantee,
            'with_grant': priv_with_grant,
            'without_grant': priv_without_grant,
            'old_grantee': old_grantee,
            'acltype': acltype
        })

    return privileges


def tokenize_options(options_from_db, option_name, option_value):
    """
    This function will tokenize the string stored in database
    e.g. database store the value as below
    key1=value1, key2=value2, key3=value3, ....
    This function will extract key and value from above string

    Args:
        options_from_db: Options from database
        option_name: Option Name
        option_value: Option Value

    Returns:
        Tokenized options
    """
    options = []
    if options_from_db is not None:
        for fdw_option in options_from_db:
            k, v = fdw_option.split('=', 1)
            options.append({option_name: k, option_value: v})
    return options


def validate_options(options, option_name, option_value):
    """
    This function will filter validated options
    and sets flag to use in sql template if there are any
    valid options

    Args:
        options: List of options
        option_name: Option Name
        option_value: Option Value

    Returns:
        Flag, Filtered options
    """
    valid_options = []
    is_valid_options = False

    for option in options:
        # If option name is valid
        if option_name in option and \
            option[option_name] is not None and \
                option[option_name] != '' and \
                len(option[option_name].strip()) > 0:
            # If option value is valid
            if option_value in option and \
                option[option_value] is not None and \
                option[option_value] != '' and \
                    len(option[option_value].strip()) > 0:
                # Do nothing here
                pass
            else:
                # Set empty string if no value provided
                option[option_value] = ''
            valid_options.append(option)

    if len(valid_options) > 0:
        is_valid_options = True

    return is_valid_options, valid_options


def _password_check(server, manager, old_key, new_key):
    # Check if old password was stored in pgadmin4 sqlite database.
    # If yes then update that password.
    if server.password is not None:
        password = decrypt(server.password, old_key)

        if isinstance(password, bytes):
            password = password.decode()

        password = encrypt(password, new_key)
        setattr(server, 'password', password)
        manager.password = password


def migrate_passwords_from_os_secret_storage(servers, enc_key):
    """
    Migrate password stored in os secret storage
    :param servers: server list
    :param enc_key: new encryption key
    :return: True if successful else False
    """
    passwords_migrated = False
    error = ''
    try:
        if len(servers) > 0:
            for ser in servers:
                server, is_password_saved, is_tunnel_password_saved = ser
                if is_password_saved:
                    server_name = KEY_RING_USERNAME_FORMAT.format(server.name,
                                                                  server.id)
                    server_password = keyring.get_password(
                        KEY_RING_SERVICE_NAME, server_name)
                    server_password = encrypt(server_password, enc_key)
                    setattr(server, 'password', server_password)
                    setattr(server, 'save_password', 1)
                else:
                    setattr(server, 'password', None)
                    setattr(server, 'save_password', 0)
                if is_tunnel_password_saved:
                    tunnel_name = KEY_RING_TUNNEL_FORMAT.format(server.name,
                                                                server.id)
                    tunnel_password = keyring.get_password(
                        KEY_RING_SERVICE_NAME, tunnel_name)
                    tunnel_password = encrypt(tunnel_password, enc_key)
                    setattr(server, 'tunnel_password', tunnel_password)
                else:
                    setattr(server, 'tunnel_password', None)
            passwords_migrated = True
    except Exception as e:
        error = 'Failed to migrate passwords stored using OS' \
                ' password manager.Error: {0}'.format(e)
        current_app.logger.exception(error)
    return passwords_migrated, error


def migrate_passwords_from_pgadmin_db(servers, old_key, enc_key):
    """
    Migrates passwords stored in pgadmin db
    :param servers: list of servers
    :param old_key: old encryption key
    :param enc_key: new encryption key
    :return: True if successful else False
    """
    error = ''
    passwords_migrated = False
    try:
        for ser in servers:
            server, is_password_saved, is_tunnel_password_saved = ser
            if is_password_saved:
                password = decrypt(server.password, old_key).decode()
                server_password = encrypt(password, enc_key)
                setattr(server, 'password', server_password)
                setattr(server, 'save_password', 1)

            if is_tunnel_password_saved:
                password = decrypt(server.tunnel_password, old_key).decode()
                tunnel_password = encrypt(password, enc_key)
                setattr(server, 'tunnel_password', tunnel_password)

        passwords_migrated = True
    except Exception as e:
        error = 'Failed to migrate passwords stored using master password or' \
                ' user password password manager. Error: {0}'.format(e)
        current_app.logger.warning(error)
        config.USE_OS_SECRET_STORAGE = False

    return passwords_migrated, error


def get_servers_with_saved_passwords():
    all_server = Server.query.filter(Server.is_adhoc == 0)
    servers_with_pwd_in_os_secret = []
    servers_with_pwd_in_pgadmin_db = []
    saved_password_servers = []
    for server in all_server:
        sname = KEY_RING_USERNAME_FORMAT.format(server.name, server.id)
        spassword = keyring.get_password(
            KEY_RING_SERVICE_NAME, sname)

        is_password_saved = bool(spassword)
        tunnel_name = KEY_RING_TUNNEL_FORMAT.format(server.name,
                                                    server.id)
        tunnel_password = keyring.get_password(KEY_RING_SERVICE_NAME,
                                               tunnel_name)
        is_tunnel_password_saved = bool(tunnel_password)

        if spassword or is_tunnel_password_saved:
            saved_password_servers.append(server)
            servers_with_pwd_in_os_secret.append(
                (server, is_password_saved, is_tunnel_password_saved))
        else:
            is_password_saved = bool(server.password)
            is_tunnel_password_saved = bool(server.tunnel_password)
            if is_password_saved or is_tunnel_password_saved:
                saved_password_servers.append(server)
                servers_with_pwd_in_pgadmin_db.append(
                    (server, is_password_saved, is_tunnel_password_saved))

    return (saved_password_servers,
            servers_with_pwd_in_os_secret,
            servers_with_pwd_in_pgadmin_db)


def migrate_saved_passwords(master_key, master_password):
    """
    Function will migrate password stored in pgadmin db and os secret storage
    with separate entry for each server(initial keyring implementation #5123).
    Now all saved passwords will be stored in pgadmin db which are encrypted
    using master_key which is stored in local os storage.
    :param master_key: encryption key from local os storage
    :param master_password: set by user if MASTER_PASSWORD_REQUIRED=True
    :param old_crypt_key: enc_key with ith passwords were encrypted when
    MASTER_PASSWORD_REQUIRED=False
    :return: True if all passwords are migrated successfully.
    """
    error = ''
    old_key = None
    passwords_migrated = False
    if config.ALLOW_SAVE_PASSWORD or config.ALLOW_SAVE_TUNNEL_PASSWORD:
        # Get servers with saved password
        saved_password_servers, \
            servers_with_pwd_in_os_secret,\
            servers_with_pwd_in_pgadmin_db = get_servers_with_saved_passwords()

        # No server passwords are saved
        if len(servers_with_pwd_in_os_secret) == 0 and \
                len(servers_with_pwd_in_pgadmin_db) == 0:
            current_app.logger.warning(
                'There are no saved passwords')
            return passwords_migrated, error

        # If not master password received return and follow
        # normal Master password path
        if config.MASTER_PASSWORD_REQUIRED:
            if current_user.masterpass_check is not None and \
                    not master_password:
                error = 'Master password required'
                return passwords_migrated, error
            elif master_password:
                old_key = master_password
            else:
                current_app.logger.info(
                    'Passwords saved with Master password were already'
                    ' migrated once. Hence not migrating again. '
                    'May be the old master key was deleted.')
        else:
            old_key = current_user.password

        # servers passwords stored with os storage are present.
        if len(servers_with_pwd_in_os_secret) > 0:
            current_app.logger.warning(
                'Re-encrypting passwords saved using os password manager')
            passwords_migrated, error = \
                migrate_passwords_from_os_secret_storage(
                    servers_with_pwd_in_os_secret, master_key)

        if len(servers_with_pwd_in_pgadmin_db) > 0 and old_key:
            # if master_password present and masterpass_check is  present,
            # server passwords are encrypted with master password
            current_app.logger.warning(
                'Re-encrypting passwords saved using master password '
                'or user password.')
            passwords_migrated, error = migrate_passwords_from_pgadmin_db(
                servers_with_pwd_in_pgadmin_db, old_key, master_key)
            # clear master_pass check once passwords are migrated
            if passwords_migrated:
                set_masterpass_check_text('', clear=True)

        if passwords_migrated:
            # commit the changes once all are migrated
            db.session.commit()
            # Delete passwords from os password manager
            if len(servers_with_pwd_in_os_secret) > 0:
                delete_saved_passwords_from_os_secret_storage(
                    servers_with_pwd_in_os_secret)
            # Update driver manager with new passwords
            try:
                update_session_manager(current_user.id, saved_password_servers)
            except Exception:
                current_app.logger.warning(
                    'Error while updating session manger')
            current_app.logger.warning('Password migration is successful')

    return passwords_migrated, error


def reencrpyt_server_passwords(user_id, old_key, new_key):
    """
    This function will decrypt the saved passwords in SQLite with old key
    and then encrypt with new key
    """
    from pgadmin.utils.driver import get_driver
    driver = get_driver(config.PG_DEFAULT_DRIVER)

    for server in Server.query.filter_by(user_id=user_id).all():
        manager = driver.connection_manager(server.id)
        _password_check(server, manager, old_key, new_key)

        if server.tunnel_password is not None:
            tunnel_password = decrypt(server.tunnel_password, old_key)
            if isinstance(tunnel_password, bytes):
                tunnel_password = tunnel_password.decode()

            tunnel_password = encrypt(tunnel_password, new_key)
            setattr(server, 'tunnel_password', tunnel_password)
            manager.tunnel_password = tunnel_password
        elif manager.tunnel_password is not None:
            tunnel_password = decrypt(manager.tunnel_password, old_key)

            if isinstance(tunnel_password, bytes):
                tunnel_password = tunnel_password.decode()

            tunnel_password = encrypt(tunnel_password, new_key)
            manager.tunnel_password = tunnel_password

        db.session.commit()
        manager.update_session()


def remove_saved_passwords(user_id):
    """
    This function will remove all the saved passwords for the server
    """
    try:
        db.session.query(Server) \
            .filter(Server.user_id == user_id) \
            .update({Server.password: None, Server.tunnel_password: None,
                     Server.save_password: 0})
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise


def delete_saved_passwords_from_os_secret_storage(servers):
    """
    Delete passwords from os secret storage
    :param servers: server list
    :return: True if successful else False
    """
    try:
        # Clears entry created by initial keyring implementation
        desktop_user_pass = \
            KEY_RING_DESKTOP_USER.format(current_user.username)
        if keyring.get_password(KEY_RING_SERVICE_NAME,desktop_user_pass):
            keyring.delete_password(KEY_RING_SERVICE_NAME, desktop_user_pass)

        if len(servers) > 0:
            for ser in servers:
                server, _, _ = ser
                server_name = KEY_RING_USERNAME_FORMAT.format(server.name,
                                                              server.id)
                server_password = keyring.get_password(
                    KEY_RING_SERVICE_NAME, server_name)
                if server_password:
                    keyring.delete_password(
                        KEY_RING_SERVICE_NAME, server_name)

                tunnel_name = KEY_RING_TUNNEL_FORMAT.format(server.name,
                                                            server.id)
                tunnel_password = keyring.get_password(
                    KEY_RING_SERVICE_NAME, tunnel_name)
                if tunnel_password:
                    keyring.delete_password(
                        KEY_RING_SERVICE_NAME, tunnel_name)
            return True
        else:
            # This means no server password to migrate
            return False
    except Exception as e:
        current_app.logger.warning(
            'Failed to delete passwords stored in OS password manager.'
            'Error: {0}'.format(e))
        return False


def update_session_manager(user_id=None, servers=None):
    """
    Updates the passwords in the session
    :param user_id:
    :param servers:
    :return:
    """
    from pgadmin.model import Server
    from pgadmin.utils.driver import get_driver
    driver = get_driver(config.PG_DEFAULT_DRIVER)
    try:
        if user_id:
            for server in Server.query.\
                    filter_by(user_id=current_user.id).all():
                manager = driver.connection_manager(server.id)
                manager.update(server)
        elif servers:
            for server in servers:
                manager = driver.connection_manager(server.id)
                manager.update(server)
        else:
            return False
        db.session.commit()
        return True
    except Exception:
        db.session.rollback()
        raise


def get_replication_type(conn, sversion):
    status, res = conn.execute_dict(render_template(
        "/servers/sql/#{0}#/replication_type.sql".format(sversion)
    ))

    if not status:
        raise InternalServerError(res)

    return res['rows'][0]['type']


def convert_connection_parameter(params):
    """
    This function is used to convert the connection parameter based
    on the instance type.
    """
    conn_params = None
    # if params is of type list then it is coming from the frontend,
    # and we have to convert it into the dict and store it into the
    # database
    if isinstance(params, list):
        conn_params = {}
        for item in params:
            conn_params[item['name']] = item['value']
    # if params is of type dict then it is coming from the database,
    # and we have to convert it into the list of params to show on GUI.
    elif isinstance(params, dict):
        conn_params = []
        for key, value in params.items():
            if value is not None:
                conn_params.append(
                    {'name': key, 'keyword': key, 'value': value})

    return conn_params


def check_ssl_fields(data):
    """
    This function will allow us to check and set defaults for
    SSL fields

    Args:
        data: Response data

    Returns:
        Flag and Data
    """
    flag = False

    if 'sslmode' in data and data['sslmode'] in SSL_MODES:
        flag = True
        ssl_fields = [
            'sslcert', 'sslkey', 'sslrootcert', 'sslcrl', 'sslcompression'
        ]
        # Required SSL fields for SERVER mode from user
        required_ssl_fields_server_mode = ['sslcert', 'sslkey']

        for field in ssl_fields:
            if field in data:
                continue
            elif config.SERVER_MODE and \
                    field in required_ssl_fields_server_mode:
                # In Server mode,
                # we will set dummy SSL certificate file path which will
                # prevent using default SSL certificates from web servers

                # Set file manager directory from preference
                import os
                file_extn = '.key' if field.endswith('key') else '.crt'
                dummy_ssl_file = os.path.join(
                    '<STORAGE_DIR>', '.postgresql',
                    'postgresql' + file_extn
                )
                data[field] = dummy_ssl_file
                # For Desktop mode, we will allow to default

    return flag, data


def disconnect_from_all_servers():
    """
    This function is used to disconnect all the servers
    """
    all_servers = Server.query.all()
    for server in all_servers:
        manager = get_driver(config.PG_DEFAULT_DRIVER).connection_manager(
            server.id)
        # Check if any psql terminal is running for the current disconnecting
        # server. If any terminate the psql tool connection.
        if 'sid_soid_mapping' in current_app.config and str(server.id) in \
            current_app.config['sid_soid_mapping'] and \
                str(server.id) in current_app.config['sid_soid_mapping']:
            for i in current_app.config['sid_soid_mapping'][str(server.id)]:
                sio.emit('disconnect-psql', namespace='/pty', to=i)

        manager.release()


def delete_adhoc_servers(sid=None):
    """
    This function will remove all the adhoc servers.
    """
    try:
        if sid is not None:
            db.session.query(Server).filter(Server.id == sid).delete()
        else:
            db.session.query(Server).filter(Server.is_adhoc == 1).delete()
        db.session.commit()

        # Reset the sequence again
        if config.CONFIG_DATABASE_URI is not None and \
                len(config.CONFIG_DATABASE_URI) > 0:
            query = ("SELECT setval(pg_get_serial_sequence('server', "
                     "'id'), coalesce(max(id),0) + 1, false) FROM "
                     "server;")
        else:
            query = ("UPDATE sqlite_sequence SET seq = "
                     "(SELECT max(id) from server)  WHERE name = "
                     "'server'")
        with db.engine.connect() as connection:
            connection.execute(text(query))
            connection.commit()
    except Exception:
        db.session.rollback()
        raise
