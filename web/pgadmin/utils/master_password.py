import config
from flask import current_app, session, current_app
from flask_login import current_user
from pgadmin.model import db, User, Server
from pgadmin.utils.crypto import encrypt, decrypt


MASTERPASS_CHECK_TEXT = 'ideas are bulletproof'


def set_crypt_key(_key, _new_login=True):
    """
    Set the crypt key
    :param _key: The key
    :param _new_login: Is fresh login or password change
    """
    current_app.keyManager.set(_key, _new_login)


def get_crypt_key():
    """
    Returns the crypt key
    :return: the key
    """
    enc_key = current_app.keyManager.get()

    # if desktop mode and master pass disabled then use the password hash
    if not config.MASTER_PASSWORD_REQUIRED \
            and not config.SERVER_MODE:
        return True, current_user.password
    # if desktop mode and master pass enabled
    elif config.MASTER_PASSWORD_REQUIRED and \
        config.MASTER_PASSWORD_HOOK is None\
            and enc_key is None:
        return False, None
    elif not config.MASTER_PASSWORD_REQUIRED and config.SERVER_MODE and \
            'pass_enc_key' in session:
        return True, session['pass_enc_key']
    elif config.MASTER_PASSWORD_REQUIRED and config.SERVER_MODE and \
            config.MASTER_PASSWORD_HOOK and current_user.password is None:
        cmd = config.MASTER_PASSWORD_HOOK
        command = cmd.replace('%u', current_user.username) \
            if '%u' in cmd else cmd
        return get_master_password_from_master_hook(command)
    else:
        return True, enc_key


def validate_master_password(password):
    """
    Validate the password/key against the stored encrypted text
    :param password: password/key
    :return: Valid or not
    """
    # master pass is incorrect if decryption fails
    try:
        decrypted_text = decrypt(current_user.masterpass_check, password)

        if isinstance(decrypted_text, bytes):
            decrypted_text = decrypted_text.decode()

        if MASTERPASS_CHECK_TEXT != decrypted_text:
            return False
        else:
            return True
    except Exception:
        False


def set_masterpass_check_text(password, clear=False):
    """
    Set the encrypted text which will be used later to validate entered key
    :param password: password/key
    :param clear: remove the encrypted text
    """
    try:
        masterpass_check = None
        if not clear:
            masterpass_check = encrypt(MASTERPASS_CHECK_TEXT, password)

        # set the encrypted sample text with the new
        # master pass
        db.session.query(User) \
            .filter(User.id == current_user.id) \
            .update({User.masterpass_check: masterpass_check})
        db.session.commit()

    except Exception:
        db.session.rollback()
        raise


def cleanup_master_password():
    """
    Remove the master password and saved passwords from DB which are
    encrypted using master password. Also remove the encrypted text
    """

    # also remove the master password check string as it will help if master
    # password entered/enabled again
    set_masterpass_check_text('', clear=True)

    from pgadmin.browser.server_groups.servers.utils \
        import remove_saved_passwords
    remove_saved_passwords(current_user.id)

    current_app.keyManager.hard_reset()

    from pgadmin.utils.driver import get_driver
    driver = get_driver(config.PG_DEFAULT_DRIVER)

    for server in Server.query.filter_by(user_id=current_user.id).all():
        manager = driver.connection_manager(server.id)
        manager.update(server)


def process_masterpass_disabled():
    """
    On master password disable, remove the connection data from session as it
    may have saved password which will cause trouble
    :param session: Flask session
    :param conn_data: connection manager copy from session if any
    """
    if not config.SERVER_MODE and not config.MASTER_PASSWORD_REQUIRED \
            and current_user.masterpass_check is not None:
        cleanup_master_password()
        return True

    return False


def get_master_password_from_master_hook(command):
    """
    This method executes specified command & returns output.
    :param command: Shell command with absolute path
    :return: Output of command.
    """
    import subprocess
    try:
        p = subprocess.Popen(command, stdout=subprocess.PIPE, shell=True)
        out, err = p.communicate()
        if p.returncode == 0:
            output = out.decode() if hasattr(out, 'decode') else out
            output = output.strip()
            return True, output
        else:
            error = "Command '{0}' failed, exit-code={1} error = {2}".format(
                command, p.returncode, str(err))
            current_app.logger.error(error)
            return False, None
    except Exception as e:
        current_app.logger.exception(
            'Failed to retrieve master password from the master password hook'
            ' utility.Error: {0}'.format(e)
        )
        return False, None
