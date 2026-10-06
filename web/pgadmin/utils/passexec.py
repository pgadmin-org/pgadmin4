##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################
import logging
import os
import subprocess
from datetime import datetime, timedelta, timezone
from threading import Lock

from flask import current_app
from flask_security import current_user

import config
from pgadmin.utils.driver import get_driver

PASSEXEC_INHERIT = '__inherit__'
PASSEXEC_NONE = '__none__'


def _iter_server_passexec_entries():
    """Yield (name, argv_or_None, reason) for each configured entry."""
    cmds = getattr(config, 'SERVER_PASSEXEC_COMMANDS', None) or {}
    if not isinstance(cmds, dict):
        yield None, None, 'SERVER_PASSEXEC_COMMANDS must be a dict'
        return
    for name, argv in cmds.items():
        if not isinstance(name, str) or not name.strip():
            yield name, None, 'name must be a non-empty string'
        elif name.startswith('__'):
            yield name, None, 'names starting with "__" are reserved'
        elif not isinstance(argv, (list, tuple)) or not argv or \
                not all(isinstance(a, str) for a in argv):
            yield name, None, 'value must be a non-empty list of strings'
        else:
            yield name, list(argv), None


def get_server_passexec_commands():
    """Return the valid entries of SERVER_PASSEXEC_COMMANDS as
    {name: argv}, with fresh lists so callers cannot alter config."""
    return {name: argv for name, argv, reason
            in _iter_server_passexec_entries() if reason is None}


def normalise_passexec_name(value, is_non_owner):
    """Map the name sent by the API to the value stored in the database.

    Owner (Server row): None, '' and '__none__' store None (no command);
    a configured name stores itself. '__inherit__' is meaningless for an
    owner. Non-owner (SharedServer row): '__inherit__' stores None,
    None, '' and '__none__' store '' (explicitly no command), and a
    configured name stores itself. Anything else raises ValueError."""
    if value is None or value == '' or value == PASSEXEC_NONE:
        return '' if is_non_owner else None
    if value == PASSEXEC_INHERIT:
        if is_non_owner:
            return None
        raise ValueError('Inheriting is only available for shared servers.')
    if not isinstance(value, str) or \
            value not in get_server_passexec_commands():
        raise ValueError('Unknown password exec command.')
    return value


def passexec_name_for_api(stored, is_non_owner):
    """The inverse of normalise_passexec_name, for the properties API."""
    if is_non_owner:
        if stored is None:
            return PASSEXEC_INHERIT
        return stored or PASSEXEC_NONE
    return stored or PASSEXEC_NONE


def check_server_passexec_config(logger):
    """Log configuration problems once, at startup."""
    for name, _argv, reason in _iter_server_passexec_entries():
        if reason is not None:
            logger.error('Ignoring SERVER_PASSEXEC_COMMANDS entry %r: %s',
                         name, reason)
    if getattr(config, 'ENABLE_SERVER_PASS_EXEC_CMD', False):
        logger.warning(
            'ENABLE_SERVER_PASS_EXEC_CMD is deprecated and no longer has '
            'any effect; define the permitted commands in '
            'SERVER_PASSEXEC_COMMANDS instead.')


def convert_legacy_server_passexec(logger):
    """Server mode only: convert free-text passexec_cmd values that
    exactly match a configured command into its name, and clear every
    passexec_cmd, since free-text commands no longer run in server mode.
    Command text is never logged because it may contain secrets.
    Returns the number of rows changed."""
    from pgadmin.model import db, Server, SharedServer
    by_cmd = {' '.join(argv): name
              for name, argv in get_server_passexec_commands().items()}
    changed = 0
    for model in (Server, SharedServer):
        # Normalise empty strings quietly; they carry no command.
        model.query.filter(model.passexec_cmd == '').update(
            {model.passexec_cmd: None}, synchronize_session=False)
        rows = model.query.filter(model.passexec_cmd.isnot(None)).all()
        for row in rows:
            name = by_cmd.get(row.passexec_cmd.strip())
            if name is not None:
                row.passexec_name = name
            else:
                logger.warning(
                    'Cleared the password exec command on %s %s (user %s): '
                    'free-text commands are not run in server mode and it '
                    'does not match any SERVER_PASSEXEC_COMMANDS entry.',
                    model.__tablename__, row.id, row.user_id)
            row.passexec_cmd = None
            changed += 1
    db.session.commit()
    return changed


def server_passexec_startup(app, cli_mode):
    """Run the server-mode password exec checks when the app starts.

    The legacy conversion is skipped in CLI mode: setup.py does not set
    SERVER_MODE, so it would otherwise clear the free-text commands in a
    desktop configuration database passed with --sqlite-path."""
    if not config.SERVER_MODE:
        return
    check_server_passexec_config(app.logger)
    if not cli_mode:
        convert_legacy_server_passexec(app.logger)


class PasswordExec:

    lock = Lock()

    def __init__(self, cmd, host, port, username, expiration_seconds=None,
                 timeout=60):
        self.host = host
        self.port = port
        self.username = username
        self.cmd = cmd
        self.expiration_seconds = int(expiration_seconds) \
            if expiration_seconds is not None else None
        self.timeout = int(timeout)
        self.password = None
        self.last_result = None

    def get(self):
        if config.SERVER_MODE:
            # Arbitrary shell execution on server is a security risk
            raise NotImplementedError('Passexec not available in server mode')
        driver = get_driver(config.PG_DEFAULT_DRIVER)
        self.cmd = str(self.cmd)
        self.cmd = self.cmd.replace('%HOSTNAME%', self.host or '')
        self.cmd = self.cmd.replace(
            '%PORT%', str(self.port) if self.port is not None else '')
        self.cmd = self.cmd.replace(
            '%USERNAME%',
            driver.qtIdent(None, self.username) if self.username else '')
        return self._get_cached(lambda: subprocess.run(
            self.cmd,
            shell=True,
            timeout=self.timeout,
            capture_output=True,
            text=True,
            check=True,
        ), skip=not self.cmd)

    def _get_cached(self, run, skip=False):
        """Return the cached password, calling run() when it is missing
        or expired. If skip is true and a run would be needed, return
        None instead."""
        with self.lock:
            if not self.password or self.is_expired():
                if skip:
                    return None
                current_app.logger.info('Calling passexec')
                now = datetime.now(timezone.utc)
                try:
                    p = run()
                except subprocess.CalledProcessError as e:
                    if e.stderr:
                        self.create_logger().error(e.stderr)
                    raise

                current_app.logger.info('Passexec completed successfully')
                self.last_result = now
                self.password = p.stdout.strip()
            return self.password

    def is_expired(self):
        if self.expiration_seconds is None:
            return False
        return self.last_result is not None and\
            datetime.now(timezone.utc) - self.last_result \
            >= timedelta(seconds=self.expiration_seconds)

    def create_logger(self):
        logger = logging.getLogger('passexec')
        for h in current_app.logger.handlers:
            logger.addHandler(h)
        return logger


class ServerPasswordExec(PasswordExec):
    """Runs an administrator-defined command without a shell, passing
    connection details in environment variables so that no value can be
    interpreted as part of the command."""

    def __init__(self, name, argv, host, port, username, database,
                 pgadmin_user, auth_source, expiration_seconds=None,
                 timeout=60):
        super().__init__(None, host, port, username, expiration_seconds,
                         timeout)
        self.name = name
        self.argv = list(argv)
        self.env = dict(os.environ)
        self.env.update({
            'PGADMIN_PASSEXEC_HOST': host or '',
            'PGADMIN_PASSEXEC_PORT': str(port) if port is not None else '',
            'PGADMIN_PASSEXEC_USERNAME': username or '',
            'PGADMIN_PASSEXEC_DATABASE': database or '',
            'PGADMIN_PASSEXEC_PGADMIN_USER': pgadmin_user or '',
            'PGADMIN_PASSEXEC_AUTH_SOURCE': auth_source or '',
        })

    def get(self):
        return self._get_cached(lambda: subprocess.run(
            self.argv, shell=False, env=self.env, timeout=self.timeout,
            capture_output=True, text=True, check=True))


def resolve_server_passexec(server, user):
    """Work out which named command applies to this server for this
    pgAdmin user. Returns (name, expiration, db_username) or None.

    A non-owner of a shared server inherits the owner's command unless
    their SharedServer row says otherwise (NULL inherits, '' is none,
    anything else is their own choice). The owner's values are read from
    the Server row's passexec fields, which get_shared_server_properties
    deliberately leaves alone."""
    from pgadmin.model import SharedServer
    if server.shared and server.user_id != user.id:
        ss = SharedServer.query.filter_by(osid=server.id,
                                          user_id=user.id).first()
        db_user = ss.username if ss else server.shared_username
        own = ss.passexec_name if ss else None
        if own == '':
            return None
        if own is not None:
            return own, ss.passexec_expiration, db_user
        if not server.passexec_name:
            return None
        return server.passexec_name, server.passexec_expiration, db_user
    if not server.passexec_name:
        return None
    return server.passexec_name, server.passexec_expiration, server.username


def build_passexec(server):
    """Build the password exec object for a ServerManager, or None."""
    if not config.SERVER_MODE:
        if not server.passexec_cmd:
            return None
        return PasswordExec(server.passexec_cmd, server.host, server.port,
                            server.username, server.passexec_expiration)
    if not current_user or not current_user.is_authenticated:
        return None
    resolved = resolve_server_passexec(server, current_user)
    if resolved is None:
        return None
    name, expiration, db_user = resolved
    argv = get_server_passexec_commands().get(name)
    if argv is None:
        current_app.logger.warning(
            'Server %s uses password exec command %r, which is not in '
            'SERVER_PASSEXEC_COMMANDS; ignoring it.', server.id, name)
        return None
    return ServerPasswordExec(
        name, argv, server.host, server.port, db_user,
        server.maintenance_db, current_user.username,
        getattr(current_user, 'auth_source', None), expiration)
