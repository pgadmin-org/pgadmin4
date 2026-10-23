##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import errno
import os
import stat
import sys
import json
import subprocess
import re
from collections import defaultdict
from functools import lru_cache
from operator import attrgetter

from pathlib import Path
from flask import Blueprint, current_app, url_for
from flask_babel import gettext
from flask_security import current_user, login_required
from flask_security.utils import get_post_login_redirect, \
    get_post_logout_redirect
from threading import Lock
import config
from .paths import get_storage_directory
from .preferences import Preferences
from pgadmin.utils.constants import UTILITIES_ARRAY, USER_NOT_FOUND, \
    MY_STORAGE, ACCESS_DENIED_MESSAGE, INTERNAL, \
    CONNECTION_PARAM_ENV_VARS, CONNECTION_PARAM_FILE_PATHS, \
    CONNECTION_PARAM_BOOLEANS, CONNECTION_PARAM_DIR_PATHS, \
    CONNECTION_PARAM_CREDENTIAL_FILES
from pgadmin.utils.ajax import make_json_response
from pgadmin.model import db, User, ServerGroup, Server
from urllib.parse import unquote

ADD_SERVERS_MSG = "Added %d Server Group(s) and %d Server(s)."


class PgAdminModule(Blueprint):
    """
    Base class for every PgAdmin Module.

    This class defines a set of method and attributes that
    every module should implement.
    """

    def __init__(self, name, import_name, **kwargs):
        kwargs.setdefault('url_prefix', '/' + name)
        kwargs.setdefault('template_folder', 'templates')
        kwargs.setdefault('static_folder', 'static')
        self.submodules = []
        self.parentmodules = []

        super().__init__(name, import_name, **kwargs)

    def register_preferences(self):
        # To be implemented by child classes
        pass

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """

        # Sub-classes populate self.submodules from their own register(),
        # but the blueprint objects themselves are module level singletons,
        # so registering one against a second application instance (which
        # happens whenever more than one app is created in a single
        # process, as the regression suite does) would otherwise leave a
        # duplicate entry behind for every sub-module. Anything that walks
        # self.submodules then does its work once per duplicate; in Schema
        # Diff's case that means generating the same DDL several times
        # over.
        self.submodules = list(dict.fromkeys(self.submodules))

        super().register(app, options)

        def create_module_preference():
            # Create preference for each module by default
            if hasattr(self, 'LABEL'):
                self.preference = Preferences(self.name, self.LABEL)
            else:
                self.preference = Preferences(self.name, None)

            self.register_preferences()

        # Create and register the module preference object and preferences for
        # it just before starting app
        app.register_before_app_start(create_module_preference)

        for module in self.submodules:
            if self not in module.parentmodules:
                module.parentmodules.append(self)
            if app.blueprints.get(module.name) is None:
                app.register_blueprint(module)
                app.register_logout_hook(module)

    def get_own_messages(self):
        """
        Returns:
            dict: the i18n messages used by this module, not including any
                messages needed by the submodules.
        """
        return dict()

    def get_own_menuitems(self):
        """
        Returns:
            dict: the menuitems for this module, not including
                any needed from the submodules.
        """
        return defaultdict(list)

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return []

    @property
    def messages(self):
        res = self.get_own_messages()

        for module in self.submodules:
            res.update(module.messages)
        return res

    @property
    def menu_items(self):
        menu_items = self.get_own_menuitems()
        for module in self.submodules:
            for key, value in module.menu_items.items():
                menu_items[key].extend(value)
        menu_items = dict((key, sorted(value, key=attrgetter('priority')))
                          for key, value in menu_items.items())
        return menu_items

    @property
    def exposed_endpoints(self):
        res = self.get_exposed_url_endpoints()

        for module in self.submodules:
            res += module.exposed_endpoints

        return res


IS_WIN = (os.name == 'nt')

sys_encoding = sys.getdefaultencoding()
if not sys_encoding or sys_encoding == 'ascii':
    # Fall back to 'utf-8', if we couldn't determine the default encoding,
    # or 'ascii'.
    sys_encoding = 'utf-8'

fs_encoding = sys.getfilesystemencoding()
if not fs_encoding or fs_encoding == 'ascii':
    # Fall back to 'utf-8', if we couldn't determine the file-system encoding,
    # or 'ascii'.
    fs_encoding = 'utf-8'


def u_encode(_s, _encoding=sys_encoding):
    return _s


def file_quote(_p):
    return _p


if IS_WIN:
    import ctypes
    from ctypes import wintypes

    def env(name):
        if name in os.environ:
            return os.environ[name]
        return None

    _GetShortPathNameW = ctypes.windll.kernel32.GetShortPathNameW
    _GetShortPathNameW.argtypes = [
        wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD
    ]
    _GetShortPathNameW.restype = wintypes.DWORD

    def fs_short_path(_path):
        """
        Gets the short path name of a given long path.
        http://stackoverflow.com/a/23598461/200291
        """
        buf_size = len(_path)
        while True:
            res = ctypes.create_unicode_buffer(buf_size)
            # Note:- _GetShortPathNameW may return empty value
            # if directory doesn't exist.
            needed = _GetShortPathNameW(_path, res, buf_size)

            if buf_size >= needed:
                return res.value
            else:
                buf_size += needed

    def document_dir():
        CSIDL_PERSONAL = 5  # My Documents
        SHGFP_TYPE_CURRENT = 0  # Get current, not default value

        buf = ctypes.create_unicode_buffer(wintypes.MAX_PATH)
        ctypes.windll.shell32.SHGetFolderPathW(
            None, CSIDL_PERSONAL, None, SHGFP_TYPE_CURRENT, buf
        )

        return buf.value

else:
    def env(name):
        if name in os.environ:
            return os.environ[name]
        return None

    def fs_short_path(_path):
        return _path

    def document_dir():
        return os.path.realpath(os.path.expanduser('~/'))


# A single SQL identifier, quoted, with every embedded double quote doubled.
_QUOTED_IDENT = re.compile(r'"(?:[^"]|"")*"\Z')


def unquote_ident(value):
    """
    Reverse the quoting that Driver.qtIdent() and the server's own
    quote_ident() apply to an identifier.

    Catalogue functions such as pg_get_indexdef() return an identifier quoted
    only when it needs to be, with any embedded double quote doubled, so a
    column named 'col"x' arrives as '"col""x"'. Stripping the outer quotes
    alone would leave that doubled quote behind.

    Anything that is not a single quoted identifier, an unquoted name or an
    expression such as '(a || b)', is returned unchanged.

    :param value: identifier as returned by the server
    :return: the identifier as the user typed it
    """
    if value and _QUOTED_IDENT.match(value):
        return value[1:-1].replace('""', '"')
    return value


def get_directory_and_file_name(drivefilepath):
    """
    Returns directory name if specified and file name
    :param drivefilepath: file path like '<shared_drive_name>:/filename' or
    '/filename'
    :return: directory name and file name
    """
    dir_name = ''
    file_name = drivefilepath
    if config.SHARED_STORAGE:
        shared_dirs = [sdir['name'] + ':' for sdir in config.SHARED_STORAGE]
        if len(re.findall(r"(?=(" + '|'.join(shared_dirs) + r"))",
                          drivefilepath)) > 0:
            dir_file_paths = drivefilepath.split(':/')
            dir_name = dir_file_paths[0]
            file_name = dir_file_paths[1]
    return dir_name, file_name


def get_complete_file_path(file, validate=True, for_write=False):
    """
    Args:
        file: File returned by file manager
        validate: if True, return None unless the path names an existing
            file; pass False for a directory, or for a file that may not
            exist yet
        for_write: set True when libpq will write the file (e.g.
            sslkeylogfile) rather than read it. A write target must
            additionally honour a shared storage directory that is
            read-only for non-administrators, and must resolve its short
            path on Windows even though the file does not exist yet.

    Returns:
         Full path for the file

    Raises:
        PermissionError: in server mode, if the path resolves to somewhere
            outside the user's storage directory (or the named shared
            storage directory), or names a read-only shared storage
            directory when for_write is set
    """
    if not file:
        return None

    # If desktop mode
    if current_app.PGADMIN_RUNTIME or not current_app.config['SERVER_MODE']:
        if not validate:
            return file
        return file if os.path.isfile(file) else None

    orig_file = file

    # get dir name and file name
    dir_name, file = get_directory_and_file_name(file)

    storage_dir = get_storage_directory(shared_storage=dir_name) if dir_name \
        else get_storage_directory()

    # Without a storage directory to anchor it, the path would be used
    # exactly as given, so refuse it rather than let it name any file the
    # pgAdmin service account can read.
    if not storage_dir:
        raise PermissionError(
            gettext("Access denied ({0}): the storage directory it refers "
                    "to could not be found.").format(orig_file))

    # A write target (e.g. sslkeylogfile) must honour a shared storage
    # directory that is read-only for non-administrators; get_storage_
    # directory() itself does not enforce that flag, so a non-admin could
    # otherwise create or append a file there.
    if for_write and dir_name:
        shared_dir = next(
            (sdir for sdir in current_app.config['SHARED_STORAGE']
             if sdir['name'] == dir_name), None)
        if shared_dir and shared_dir['restricted_access'] and \
                not current_user.has_role("Administrator"):
            raise PermissionError(
                gettext("Access denied ({0}): the shared storage directory "
                        "it names is read-only.").format(orig_file))

    file = os.path.join(
        storage_dir,
        file.lstrip('/').lstrip('\\')
    )

    # The path is the user's to choose, and is used for things like the
    # password file and SSL key libpq connects with, so it must not climb
    # out of their storage directory with "..", an absolute path or a
    # symbolic link. This mirrors Filemanager.check_access_permission().
    try:
        Path(os.path.realpath(file)).relative_to(
            os.path.realpath(storage_dir))
    except ValueError:
        current_app.logger.warning(
            'Refusing the path %r, which resolves outside the storage '
            'directory.', orig_file)
        raise PermissionError(
            gettext("Access denied ({0}): the path resolves outside your "
                    "storage directory, or outside the shared storage "
                    "directory it names.").format(orig_file))

    if IS_WIN:
        file = file.replace('\\', '/')
        short_path = fs_short_path(file)
        # fs_short_path() returns an empty string on Windows when the file
        # does not exist yet. For a write target (sslkeylogfile) that is
        # the normal case, so fall back to the short path of the parent
        # directory joined with the file name, instead of silently
        # dropping the path.
        if for_write and short_path == '':
            base_name = os.path.basename(file)
            dir_short_path = fs_short_path(os.path.dirname(file))
            if dir_short_path != '':
                short_path = os.path.join(dir_short_path, base_name)
        file = short_path

    if validate:
        return file if os.path.isfile(file) else None
    else:
        return file


# A path that libpq can never open: a name below a regular file fails with
# ENOTDIR, which libpq treats exactly as it does a missing file, and no
# user can create a directory in place of the file to change that.  This
# relies on __file__ being a regular file; under zipimport or a frozen build
# the open fails with ENOTDIR or ENOENT instead, which is still safe.
NO_CLIENT_FILE = os.path.join(os.path.abspath(__file__), 'no-client-file')


def client_files_isolated():
    """
    Whether connections are made on behalf of a user who must not use the
    client files of the account pgAdmin runs as, which is so in server
    mode.  The test is the one get_complete_file_path() uses.
    """
    return not (current_app.PGADMIN_RUNTIME or
                not current_app.config['SERVER_MODE'])


def isolate_client_credential_files(params, names=None):
    """
    In server mode, set each client credential file parameter that has no
    value to NO_CLIENT_FILE, so that libpq does not fall back to the
    service account's own ~/.pgpass or client certificate and key.

    Args:
        params: a dict of connection parameters, updated in place
        names: a dict mapping each parameter to the key to set in params,
            such as its environment variable; the parameter names
            themselves by default

    Returns:
        params
    """
    if client_files_isolated():
        for param in CONNECTION_PARAM_CREDENTIAL_FILES:
            key = names[param] if names else param
            if not params.get(key):
                params[key] = NO_CLIENT_FILE
    return params


def connection_param_bool_to_int(value):
    """
    Convert a boolean connection parameter to the 0 or 1 that libpq expects.

    The server dialog stores these as booleans, but a servers.json import
    or a direct API call stores whatever it is given, so the strings
    "false", "0" and the like must not be treated as true merely for being
    non-empty strings.
    """
    if isinstance(value, str):
        return 0 if value.strip().lower() in \
            ('', '0', 'false', 'f', 'no', 'n', 'off') else 1
    return 1 if value else 0


@lru_cache(maxsize=1)
def get_libpq_connection_keywords():
    """
    Return the set of connection-parameter keywords recognised by the
    libpq that psycopg is linked against.

    This is read from libpq itself rather than hard-coded, so it always
    matches the installed version; a keyword unknown to this libpq is not
    treated as valid, since make_conninfo() would reject it anyway.
    """
    from psycopg.pq import Conninfo
    return frozenset(
        defn.keyword.decode() for defn in Conninfo.get_defaults()
    )


def is_valid_connection_param_key(key):
    """
    Return True only if key is an exact libpq connection keyword.

    psycopg's make_conninfo() quotes parameter values but not their keys,
    so a key that smuggles its own "keyword=value" pairs (for example via
    an '=' sign or embedded/leading/trailing whitespace) would reach libpq
    as extra, unconfined connection directions. Accepting only exact libpq
    keywords closes that injection.
    """
    return isinstance(key, str) and key in get_libpq_connection_keywords()


def get_invalid_connection_param_key(connection_params):
    """
    Return the first key in connection_params that is not a valid libpq
    keyword, or None if every key is valid (or there are no params).

    Callers use this to refuse a server whose connection parameters carry
    an injected key, before it is saved or used to build a connection
    string.
    """
    if not connection_params or not isinstance(connection_params, dict):
        return None
    for key in connection_params:
        if not is_valid_connection_param_key(key):
            return key
    return None


def connection_params_to_env(connection_params):
    """
    Translate the connection parameters configured against a server into the
    libpq environment variables that carry them, so that a utility such as
    pg_dump or psql connects the same way the server dialog says it should.

    Only the parameters libpq actually reads from the environment can be
    passed this way; anything else in connection_params is dropped.

    libpq ranks the environment below a pg_service.conf entry, so in server
    mode the credential files are also passed in the utility's --dbname
    connection string (see utility_conninfo()); that copy is what beats a
    service file entry, and these variables are kept as a second layer.

    Args:
        connection_params: the server's connection parameters, as a dict

    Returns:
        A dict of environment variables and their values
    """
    env = dict()

    if not connection_params or not isinstance(connection_params, dict):
        connection_params = dict()

    # In server mode a file is passed on even if it does not exist yet,
    # rather than dropped, because libpq would then use its default file in
    # the service account's home directory instead.  The path is still
    # confined to the user's storage directory.
    validate = not client_files_isolated()

    for param, value in connection_params.items():
        env_var = CONNECTION_PARAM_ENV_VARS.get(param, None)
        if env_var is None or value is None or value == '':
            continue

        if param in CONNECTION_PARAM_DIR_PATHS:
            # A directory, which the file check in get_complete_file_path()
            # would reject, so resolve it unvalidated and check it here.
            value = get_complete_file_path(value, validate=False)
            value = value if value and (
                not validate or os.path.isdir(value)) else ''
        elif param in CONNECTION_PARAM_FILE_PATHS or \
                (param == 'sslrootcert' and value != 'system'):
            # An unresolvable path is passed on as an empty value, which
            # libpq treats as unset, so it uses its default file; in server
            # mode the credential files are set to NO_CLIENT_FILE below.
            value = get_complete_file_path(value, validate=validate)
            value = '' if value is None else value
        elif param in CONNECTION_PARAM_BOOLEANS:
            value = connection_param_bool_to_int(value)

        env[env_var] = str(value)

    return isolate_client_credential_files(
        env, names=CONNECTION_PARAM_ENV_VARS)


def _fd_above_stdio(fd):
    """Move `fd` to 3 or above, so it cannot collide with a child's stdio."""
    if fd >= 3:
        return fd
    import fcntl
    # On failure the caller still owns, and closes, the original.
    new_fd = fcntl.fcntl(fd, fcntl.F_DUPFD_CLOEXEC, 3)
    os.close(fd)
    return new_fd


def _dev_fd_reopens():
    """True where opening /dev/fd/N gives a new open file description for
    the same file (Linux), rather than a dup() of descriptor N that shares
    its file offset (macOS and the BSDs)."""
    return sys.platform.startswith('linux')


def open_utility_file(path, for_write, is_directory=False, root=None):
    """Open a user's file for an external utility (pg_dump, pg_restore,
    psql) without following a symbolic link below the storage directory.

    The path has already been checked against the user's storage directory
    `root` (by default the one the file manager is using), but the utility
    would open it by name later, so a symbolic link swapped in at the leaf
    or a parent directory in between would redirect it outside. In server
    mode, pgAdmin therefore opens the file itself, walking down from the
    storage directory without following symbolic links (see
    `_open_beneath()`), and the utility is given /dev/fd/N, inherited
    through the background process (see BatchProcess.start()). Only a
    regular file is accepted: the open is non-blocking so a FIFO cannot hang
    the request.

    A directory (directory-format backup/restore) cannot be handed over that
    way, as the utility creates and opens the files inside it by name. It is
    only checked here, in the same way, not to be or lie below a symbolic
    link (and created 0o700 for a backup, as pg_dump would). Someone who can
    write to the storage directory as pgAdmin's own OS user can still plant
    symbolic links inside it.

    Returns (path for the utility, descriptor or None). The caller must
    close the descriptor once the process has been started. In desktop mode,
    or where O_NOFOLLOW is unavailable, returns (path, None) unchanged; off
    Linux, the file is checked as above but (path, None) is still returned.
    """
    from pgadmin.misc.file_manager import _refuses_leaf_symlinks, \
        _open_beneath, _open_parent_beneath, _openat_nofollow
    if not _refuses_leaf_symlinks():
        return path, None
    if root is None:
        root = get_file_manager_storage_dir()

    if is_directory:
        dir_fd, name = _open_parent_beneath(root, path)
        try:
            if for_write:
                try:
                    os.mkdir(name, 0o700, dir_fd=dir_fd)
                except FileExistsError:
                    pass
            os.close(_openat_nofollow(
                dir_fd, name, os.O_RDONLY | os.O_DIRECTORY, 0, path))
        finally:
            os.close(dir_fd)
        return path, None

    flags = os.O_NONBLOCK
    if for_write:
        # O_TRUNC is applied only after the hard-link check below, so a
        # second name for a file outside the storage directory is never
        # emptied before we have refused it.
        flags |= os.O_WRONLY | os.O_CREAT
    else:
        flags |= os.O_RDONLY
    fd = _open_beneath(root, path, flags, 0o600)
    try:
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode):
            raise OSError(errno.EINVAL,
                          gettext("Not a regular file"), path)
        # A hard link is an ordinary file O_NOFOLLOW cannot detect; refuse a
        # second name for the same inode, which could be a file outside the
        # storage directory. st_nlink == 0 means the file was unlinked after
        # the open, which is refused too.
        if st.st_nlink > 1:
            raise OSError(errno.EPERM, gettext(
                "Refusing a file with multiple hard links"), path)
        if st.st_nlink == 0:
            raise OSError(errno.EPERM, gettext(
                "Refusing a file that was unlinked after opening"), path)
        if for_write:
            os.ftruncate(fd, 0)
        if not _dev_fd_reopens():
            # Elsewhere, opening /dev/fd/N dup()s the descriptor, so the
            # utility would share its file offset, which pg_restore cannot
            # cope with (custom and tar archives are opened more than once
            # and seeked, and parallel workers reopen them). The open above
            # still refuses a symbolic link already present and creates or
            # truncates the file safely, but the utility then reopens it by
            # name, so a symbolic or hard link swapped in afterwards is
            # followed.
            os.close(fd)
            return path, None
        os.set_blocking(fd, True)
        fd = _fd_above_stdio(fd)
    except BaseException:
        try:
            os.close(fd)
        except OSError:
            pass
        raise
    return '/dev/fd/{0}'.format(fd), fd


def open_utility_file_or_error(path, for_write, is_directory=False):
    """Call open_utility_file(), turning a failure into a bad request.

    Returns (path for the utility, descriptor or None, error response or
    None). The error never includes the file name, as that would reveal the
    absolute path of the user's storage directory on the server.
    """
    from pgadmin.utils.ajax import bad_request
    try:
        utility_file, fd = open_utility_file(
            path, for_write, is_directory=is_directory)
    except OSError as e:
        if _is_refused_leaf_symlink(e):
            return None, None, bad_request(errormsg=gettext(
                "Refusing to use a symbolic link."))
        return None, None, bad_request(errormsg=e.strerror or str(e))
    return utility_file, fd, None


def get_file_manager_storage_dir():
    """
    Returns:
        The storage directory the user's file manager is currently using
        (their own, or the shared storage last selected), or None in
        desktop mode. Raises PermissionError for a restricted shared
        storage the user may not use.
    """
    try:
        last_storage = Preferences.module('file_manager').preference(
            'last_storage').get()
    except Exception:
        last_storage = MY_STORAGE

    if last_storage != MY_STORAGE:
        sel_dir_list = [sdir for sdir in current_app.config['SHARED_STORAGE']
                        if sdir['name'] == last_storage]
        selected_dir = sel_dir_list[0] if len(
            sel_dir_list) == 1 else None

        if selected_dir and selected_dir['restricted_access'] and \
                not current_user.has_role("Administrator"):
            raise PermissionError(ACCESS_DENIED_MESSAGE)
        return get_storage_directory(shared_storage=last_storage)
    return get_storage_directory()


def filename_with_file_manager_path(_file, create_file=False,
                                    skip_permission_check=False):
    """
    Args:
        _file: File name returned from client file manager
        create_file: Set flag to False when file creation doesn't require
        skip_permission_check:
    Returns:
        Filename to use for backup with full path taken from preference
    """
    # get dir name and file name
    _dir_name, _file = get_directory_and_file_name(_file)

    # retrieve storage directory path
    try:
        storage_dir = get_file_manager_storage_dir()
    except PermissionError:
        return make_json_response(success=0,
                                  errormsg=ACCESS_DENIED_MESSAGE,
                                  info='ACCESS_DENIED',
                                  status=403)

    from pgadmin.misc.file_manager import Filemanager
    Filemanager.check_access_permission(
        storage_dir, _file, skip_permission_check)
    if storage_dir:
        _file = os.path.join(storage_dir, _file.lstrip('/').lstrip('\\'))
    elif not os.path.isabs(_file):
        _file = os.path.join(document_dir(), _file)

    def short_filepath(file=_file):
        short_path = fs_short_path(file)
        # fs_short_path() function may return empty path on Windows
        # if directory doesn't exists. In that case we strip the last path
        # component and get the short path.
        if os.name == 'nt' and short_path == '':
            base_name = os.path.basename(file)
            dir_name = os.path.dirname(file)
            dir_short_path = fs_short_path(dir_name)
            if dir_short_path == '' and file != "":
                short_path = os.path.join(short_filepath(dir_name), base_name)
            else:
                short_path = os.path.join(dir_short_path, base_name)
        return short_path

    if create_file:
        # Touch the file to get the short path of the file on windows. In
        # server mode, don't follow a symbolic link below the storage
        # directory: that would create the file wherever it points.
        from pgadmin.misc.file_manager import _refuses_leaf_symlinks, \
            _open_beneath
        if _refuses_leaf_symlinks():
            os.close(_open_beneath(
                storage_dir, _file,
                os.O_WRONLY | os.O_CREAT | os.O_APPEND | os.O_NONBLOCK,
                0o600))
            return short_filepath()
        with open(_file, 'a'):
            return short_filepath()

    return short_filepath()


def does_utility_exist(file):
    """
    This function will check the utility file exists on given path.
    :return:
    """
    error_msg = None

    if file is None:
        error_msg = gettext("Utility file not found. Please correct the Binary"
                            " Path in the Preferences")
        return error_msg

    if Path(config.STORAGE_DIR) == Path(file) or \
            Path(config.STORAGE_DIR) in Path(file).parents:
        error_msg = gettext("Please correct the Binary Path in the "
                            "Preferences. pgAdmin storage directory cannot "
                            "be a utility binary directory.")

    if not os.path.exists(file):
        error_msg = gettext("'%s' file not found. Please correct the Binary"
                            " Path in the Preferences" % file)
    return error_msg


def get_server(sid, only_owned=False):
    """Fetch a server by ID with access check.

    Delegates to server_access.get_server(). Kept here for backward
    compatibility — existing callers import from pgadmin.utils.
    """
    from pgadmin.utils.server_access import get_server as _get_server
    return _get_server(sid, only_owned=only_owned)


def get_binary_path_versions(binary_path: str) -> dict:
    ret = {}
    binary_path = os.path.abspath(
        replace_binary_path(binary_path)
    )

    for utility in UTILITIES_ARRAY:
        ret[utility] = None
        full_path = os.path.join(binary_path,
                                 (utility if os.name != 'nt' else
                                  (utility + '.exe')))

        try:
            # if path doesn't exist raise exception
            if not os.path.isdir(binary_path):
                current_app.logger.warning('Invalid binary path.')
                raise FileNotFoundError()
            # Get the output of the '--version' command
            cmd = subprocess.run(
                [full_path, '--version'],
                shell=False,
                capture_output=True,
                text=True
            )
            if cmd.returncode == 0:
                ret[utility] = cmd.stdout.split(") ", 1)[1].strip()
        except Exception as _:
            continue

    return ret


def set_binary_path(binary_path, bin_paths, server_type,
                    version_number=None, set_as_default=False,
                    is_fixed_path=False):
    """
    This function is used to iterate through the utilities and set the
    default binary path.
    """
    path_with_dir = binary_path if "$DIR" in binary_path else None
    binary_versions = get_binary_path_versions(binary_path)

    for utility, version in binary_versions.items():
        version_number = version if version_number is None else version_number
        # version will be None if binary not present
        version_number = version_number or ''
        if version_number.find('.'):
            version_number = version_number.split('.', 1)[0]
        try:
            # Get the paths array based on server type
            if 'pg_bin_paths' in bin_paths or 'as_bin_paths' in bin_paths:
                paths_array = bin_paths['pg_bin_paths']
                if server_type == 'ppas':
                    paths_array = bin_paths['as_bin_paths']
            else:
                paths_array = bin_paths

            for path in paths_array:
                if path['version'].find(version_number) == 0 and \
                        path['binaryPath'] is None:
                    path['binaryPath'] = path_with_dir \
                        if path_with_dir is not None else binary_path
                    if set_as_default:
                        path['isDefault'] = True
                    # Whether the fixed path in the config file exists or not
                    path['isFixed'] = is_fixed_path
                    break
            break
        except Exception:
            continue


def replace_binary_path(binary_path):
    """
    This function is used to check if $DIR is present in
    the binary path. If it is there then replace it with
    module.
    """
    if "$DIR" in binary_path:
        # When running as an WSGI application, we will not find the
        # '__file__' attribute for the '__main__' module.
        main_module_file = getattr(
            sys.modules['__main__'], '__file__', None
        )

        if main_module_file is not None:
            binary_path = binary_path.replace(
                "$DIR", os.path.dirname(main_module_file)
            )

    return binary_path


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


def dump_database_servers(output_file, selected_servers,
                          dump_user=current_user, from_setup=False,
                          auth_source=INTERNAL):
    """Dump the server groups and servers.
    """
    user = _does_user_exist(dump_user, from_setup, auth_source)
    if user is None:
        return False, USER_NOT_FOUND % dump_user

    user_id = user.id
    # Dict to collect the output
    object_dict = {}
    # Counters
    servers_dumped = 0

    # Dump servers
    servers = Server.query.filter_by(user_id=user_id, is_adhoc=0).all()
    server_dict = {}
    for server in servers:
        if selected_servers is None or (
            isinstance(selected_servers, list) and len(selected_servers) == 0)\
                or str(server.id) in selected_servers\
                or server.id in selected_servers:
            # Get the group name
            group_name = ServerGroup.query.filter_by(
                user_id=user_id, id=server.servergroup_id).first().name

            attr_dict = {}
            add_value(attr_dict, "Name", server.name)
            add_value(attr_dict, "Group", group_name)
            add_value(attr_dict, "Host", server.host)
            add_value(attr_dict, "Port", server.port)
            add_value(attr_dict, "MaintenanceDB", server.maintenance_db)
            add_value(attr_dict, "Username", server.username)
            add_value(attr_dict, "Role", server.role)
            add_value(attr_dict, "Comment", server.comment)
            add_value(attr_dict, "Shared", server.shared)
            add_value(attr_dict, "SharedUsername", server.shared_username)
            add_value(attr_dict, "DBRestriction", server.db_res)
            add_value(attr_dict, "DBRestrictionType", server.db_res_type)
            add_value(attr_dict, "BGColor", server.bgcolor)
            add_value(attr_dict, "FGColor", server.fgcolor)
            add_value(attr_dict, "Service", server.service)
            add_value(attr_dict, "UseSSHTunnel", server.use_ssh_tunnel)
            add_value(attr_dict, "TunnelHost", server.tunnel_host)
            add_value(attr_dict, "TunnelPort", server.tunnel_port)
            add_value(attr_dict, "TunnelUsername", server.tunnel_username)
            add_value(attr_dict, "TunnelAuthentication",
                      server.tunnel_authentication)
            add_value(attr_dict, "TunnelIdentityFile",
                      server.tunnel_identity_file)
            add_value(attr_dict, "TunnelPromptPassword",
                      server.tunnel_prompt_password)
            add_value(attr_dict, "TunnelKeepAlive",
                      server.tunnel_keep_alive)
            add_value(attr_dict, "KerberosAuthentication",
                      server.kerberos_conn),
            add_value(attr_dict, "ConnectionParameters",
                      server.connection_params)
            add_value(attr_dict, "Tags", server.tags)
            add_value(attr_dict, "PrepareThreshold",
                      server.prepare_threshold)
            add_value(attr_dict, "PostConnectionSQL",
                      server.post_connection_sql)

            if not current_app.config['SERVER_MODE']:
                add_value(attr_dict, "PasswordExecCommand",
                          server.passexec_cmd)
                add_value(attr_dict, "PasswordExecExpiration",
                          server.passexec_expiration)
            elif server.passexec_name:
                # Server mode never exports free-text commands, only
                # the name of an entry in SERVER_PASSEXEC_COMMANDS.
                add_value(attr_dict, "PasswordExecCommand",
                          server.passexec_name)
                add_value(attr_dict, "PasswordExecExpiration",
                          server.passexec_expiration)

            servers_dumped = servers_dumped + 1

            server_dict[servers_dumped] = attr_dict

    object_dict["Servers"] = server_dict

    try:
        if from_setup:
            file_path = unquote(output_file)
        else:
            file_path = filename_with_file_manager_path(unquote(output_file))
    except Exception as e:
        return _handle_error(str(e), from_setup)

    # write to file
    file_content = json.dumps(object_dict, indent=4)
    error_str = "Error: {0}"
    try:
        if from_setup:
            with open(file_path, 'w') as output_file:
                output_file.write(file_content)
        else:
            # The path was validated against the user's storage directory
            # above, so open it without following a symbolic link swapped
            # in at the leaf or a parent directory since that check.
            from pgadmin.misc.file_manager import _open_upload_target
            with _open_upload_target(
                    file_path, get_file_manager_storage_dir()) as output_file:
                output_file.write(file_content.encode('utf-8'))
    except IOError as e:
        if not from_setup and _is_refused_leaf_symlink(e):
            return _handle_error(gettext(
                "Refusing to write through a symbolic link."), from_setup)
        err_msg = error_str.format(e.strerror)
        return _handle_error(err_msg, from_setup)
    except Exception as e:
        # A non-OSError has no strerror; fall back to its string form so this
        # never raises AttributeError and returns a 500.
        current_app.logger.exception(e)
        err_msg = error_str.format(getattr(e, 'strerror', None) or str(e))
        return _handle_error(err_msg, from_setup)

    msg = gettext("Configuration for %s servers dumped to %s" %
                  (servers_dumped, file_path))
    print(msg)

    return True, msg


def validate_json_data(data, is_admin):
    """
    Used internally by load_servers to validate servers data.
    :param data: servers data
    :param is_admin:
    :return: error message if any
    """
    # Loop through the servers...
    if "Servers" not in data:
        return gettext("'Servers' attribute not found in the specified file.")

    # Shared servers can only be imported by administrators. Prune them
    # before validating, so that they are dropped even when the
    # validation of the remaining servers fails.
    if not is_admin:
        skip_servers = [server for server, obj in data["Servers"].items()
                        if obj.get("Shared") is True]
        for server in skip_servers:
            print("Won't import the server '%s' as it is shared " %
                  data["Servers"][server].get("Name", server))
            del data["Servers"][server]

    for server in data["Servers"]:
        obj = data["Servers"][server]

        # Only the JSON value true means shared, anything else is not.
        is_shared = obj.get("Shared") is True

        def check_attrib(attrib):
            if attrib not in obj:
                return gettext("'%s' attribute not found for server '%s'" %
                               (attrib, server))
            return None

        def check_is_integer(value):
            if not isinstance(value, int):
                return gettext("Port must be integer for server '%s'" % server)
            return None

        for attrib in ("Group", "Name"):
            errmsg = check_attrib(attrib)
            if errmsg:
                return errmsg

        is_service_attrib_available = obj.get("Service", None) is not None

        if not is_service_attrib_available:
            errmsg = check_attrib("Port")
            if errmsg:
                return errmsg
            errmsg = check_is_integer(obj["Port"])
            if errmsg:
                return errmsg

            if is_shared:
                # Shared servers may carry either the owner's username
                # or a per-user override, so accept either attribute.
                # Check the values rather than merely the keys: the
                # loader falls back to SharedUsername when Username is
                # absent, so an empty or null SharedUsername would
                # otherwise be stored as the server's username.
                if not obj.get("Username") and not obj.get("SharedUsername"):
                    return gettext(
                        "'Username' or 'SharedUsername' attribute not "
                        "found for server '%s'" % server
                    )
            else:
                if not obj.get("Username"):
                    return gettext(
                        "'Username' attribute not found for server '%s'" %
                        server
                    )

        errmsg = check_attrib("MaintenanceDB")
        if errmsg:
            return errmsg

        if "Host" not in obj and not is_service_attrib_available:
            return gettext("'Host' or 'Service' attribute not "
                           "found for server '%s'" % server)

    return None


def check_non_admin_shared_servers(logger, cli_mode=False):
    """Server mode only: log a warning for each server that is shared by a
    user who is not an administrator. Only administrators can share a
    server now, but servers shared before that restriction stay shared
    until they are un-shared. Read-only, and it never raises, so it cannot
    block the startup. Credentials and host details are not logged.
    Returns the number of servers found."""
    if not config.SERVER_MODE or cli_mode:
        return 0
    try:
        rows = db.session.query(Server.id, Server.name, Server.user_id) \
            .filter(Server.shared.is_(True)).all()
        found = 0
        owner_is_admin = {}
        for server_id, name, user_id in rows:
            if user_id not in owner_is_admin:
                owner = db.session.get(User, user_id)
                owner_is_admin[user_id] = owner is not None and \
                    owner.has_role('Administrator')
            if owner_is_admin[user_id]:
                continue
            found += 1
            logger.warning(
                "Server %s ('%s') is shared by user %s, who is not an "
                "administrator. The owner can un-share it with a PUT of "
                "\"shared\": false through the API, or an administrator "
                "can change its 'shared' column in the configuration "
                "database.", server_id, name, user_id)
        return found
    except Exception as e:
        try:
            logger.warning("Unable to check for servers shared by "
                           "non-administrators: %s", e)
        except Exception:
            pass
        return 0


def _load_server_passexec(new_server, obj):
    """Apply PasswordExecCommand from an import file in server mode,
    where it must be the name of a configured command. Anything else
    is ignored with a warning that names the server only, as the text
    could be a secret."""
    from pgadmin.utils.passexec import get_server_passexec_commands

    name = obj.get("PasswordExecCommand", None)
    if not name:
        return

    if isinstance(name, str) and name in get_server_passexec_commands():
        new_server.passexec_name = name
        new_server.passexec_expiration = obj.get(
            "PasswordExecExpiration", None)
    else:
        print("Ignoring the password exec command for server '%s' as it "
              "is not the name of a command in SERVER_PASSEXEC_COMMANDS." %
              obj.get("Name"))


def load_database_servers(input_file, selected_servers,
                          load_user=current_user, from_setup=False,
                          auth_source=INTERNAL, replace=False):
    """Load server groups and servers.

    :param replace: clear the user's existing servers once the file has
        been validated, and just before the servers are loaded.
    """
    user = _does_user_exist(load_user, from_setup, auth_source)
    if user is None:
        return False, USER_NOT_FOUND % load_user

    # generate full path of file
    try:
        if from_setup:
            file_path = unquote(input_file)
        else:
            file_path = filename_with_file_manager_path(unquote(input_file))
    except Exception as e:
        return _handle_error(str(e), from_setup)

    try:
        if from_setup:
            with open(file_path) as f:
                data = json.load(f)
        else:
            # As for the export, don't follow a symbolic link swapped in
            # since the path was validated.
            from pgadmin.misc.file_manager import _open_read_target
            with _open_read_target(
                    file_path, get_file_manager_storage_dir()) as f:
                data = json.load(f)
    except (json.decoder.JSONDecodeError, UnicodeDecodeError) as e:
        # The absolute path is shown only for the setup.py CLI, where the
        # administrator named the file; in server mode it would reveal the
        # user's storage directory location on the server.
        if from_setup:
            return _handle_error(gettext("Error parsing input file %s: %s" %
                                 (file_path, e)), from_setup)
        return _handle_error(gettext("Error parsing the selected file: %s" %
                             e), from_setup)
    except OSError as e:
        if not from_setup and _is_refused_leaf_symlink(e):
            return _handle_error(gettext(
                "Refusing to read through a symbolic link."), from_setup)
        if from_setup:
            return _handle_error(
                gettext("Error reading input file %s: [%d] %s" %
                        (file_path, e.errno, e.strerror)), from_setup)
        return _handle_error(gettext("Error reading the selected file: "
                             "[%d] %s" % (e.errno, e.strerror)), from_setup)
    except Exception as e:
        # A non-OSError (e.g. UnicodeDecodeError from a non-UTF-8 file) has no
        # errno/strerror, so don't assume them here.
        current_app.logger.exception(e)
        if from_setup:
            return _handle_error(
                gettext("Error reading input file %s: %s" %
                        (file_path, e)), from_setup)
        return _handle_error(
            gettext("Unable to read the selected file."), from_setup)

    f.close()

    user_id = user.id
    # Counters
    groups_added = 0
    servers_added = 0

    # Get the server groups
    groups = ServerGroup.query.filter_by(user_id=user_id)

    # Validate server data
    is_admin = user.has_role("Administrator")
    error_msg = validate_json_data(data, is_admin)
    if error_msg is not None:
        if from_setup:
            print(ADD_SERVERS_MSG % (groups_added, servers_added))
        return _handle_error(error_msg, from_setup)

    if replace:
        # Clear the existing servers only once the file is known to be
        # valid, so that a refused file does not lose the user's servers.
        result = clear_database_servers(load_user, from_setup, auth_source)
        if result is not None and result is not True:
            return result

    for server in data["Servers"]:
        if selected_servers is None or str(server) in selected_servers:
            obj = data["Servers"][server]

            # Defence in depth: only administrators can import shared
            # servers. Checked before the group is created, so that no
            # empty group is left behind.
            if obj.get("Shared") is True and not is_admin:
                print("Won't import the server '%s' as it is shared " %
                      obj.get("Name", server))
                continue

            # Get the group. Create if necessary
            group_id = next(
                (g.id for g in groups if g.name == obj["Group"]), -1)

            if group_id == -1:
                new_group = ServerGroup()
                new_group.name = obj["Group"]
                new_group.user_id = user_id
                db.session.add(new_group)

                try:
                    db.session.commit()
                except Exception as e:
                    if from_setup:
                        print(ADD_SERVERS_MSG % (groups_added, servers_added))
                    return _handle_error(
                        gettext("Error creating server group '%s': %s" %
                                (new_group.name, e)), from_setup)

                group_id = new_group.id
                groups_added = groups_added + 1
                groups = ServerGroup.query.filter_by(user_id=user_id)

            # Only the JSON value true means shared, as in validation.
            is_shared = obj.get("Shared") is True
            username = obj.get("Username", None)
            shared_username = obj.get("SharedUsername", None)
            if is_shared and username is None:
                username = shared_username

            # Create the server
            new_server = Server()
            new_server.name = obj["Name"]
            new_server.servergroup_id = group_id
            new_server.user_id = user_id
            new_server.maintenance_db = obj["MaintenanceDB"]

            new_server.host = obj.get("Host", None)

            new_server.port = obj.get("Port", None)

            new_server.username = username

            new_server.role = obj.get("Role", None)

            new_server.comment = obj.get("Comment", None)

            new_server.db_res = obj.get("DBRestriction", None)

            new_server.db_res_type = obj.get("DBRestrictionType", None)

            if 'ConnectionParameters' in obj:
                new_server.connection_params = \
                    obj.get("ConnectionParameters", None)
            else:
                # JSON file format is old before introduction of the
                # connection parameters.
                conn_param = dict()
                for item in ['HostAddr', 'SSLMode', 'PassFile', 'SSLCert',
                             'SSLKey', 'SSLRootCert', 'SSLCrl', 'Timeout',
                             'SSLCompression']:
                    if item in obj:
                        key = item.lower()
                        if item == 'Timeout':
                            key = 'connect_timeout'
                        conn_param[key] = obj.get(item)

                new_server.connection_params = conn_param

            # Refuse a key that is not an exact libpq keyword:
            # make_conninfo() quotes values but not keys, so a key carrying
            # its own "keyword=value" pairs would reach libpq as extra
            # connection directions.
            invalid_key = get_invalid_connection_param_key(
                new_server.connection_params)
            if invalid_key is not None:
                if from_setup:
                    print(ADD_SERVERS_MSG % (groups_added, servers_added))
                return _handle_error(
                    gettext(
                        "Invalid connection parameter '%s' for server '%s'" %
                        (invalid_key, new_server.name)), from_setup)

            new_server.bgcolor = obj.get("BGColor", None)

            new_server.fgcolor = obj.get("FGColor", None)

            new_server.service = obj.get("Service", None)

            new_server.use_ssh_tunnel = obj.get("UseSSHTunnel", None)

            new_server.tunnel_host = obj.get("TunnelHost", None)

            new_server.tunnel_port = obj.get("TunnelPort", None)

            new_server.tunnel_username = obj.get("TunnelUsername", None)

            new_server.tunnel_authentication = \
                obj.get("TunnelAuthentication", None)

            new_server.tunnel_identity_file = \
                obj.get("TunnelIdentityFile", None)

            new_server.tunnel_prompt_password = \
                obj.get("TunnelPromptPassword", 0)

            new_server.tunnel_keep_alive = \
                obj.get("TunnelKeepAlive", None)

            new_server.shared = is_shared and is_admin

            new_server.shared_username = \
                shared_username if new_server.shared else None

            new_server.kerberos_conn = obj.get("KerberosAuthentication", None)

            new_server.tags = obj.get("Tags", None)

            new_server.prepare_threshold = obj.get("PrepareThreshold", None)

            new_server.post_connection_sql = obj.get("PostConnectionSQL", None)

            if not current_app.config['SERVER_MODE']:
                new_server.passexec_cmd = obj.get("PasswordExecCommand", None)
                new_server.passexec_expiration = obj.get(
                    "PasswordExecExpiration", None)
            else:
                _load_server_passexec(new_server, obj)

            db.session.add(new_server)

            try:
                db.session.commit()
            except Exception as e:
                if from_setup:
                    print(ADD_SERVERS_MSG % (groups_added, servers_added))
                return _handle_error(gettext("Error creating server '%s': %s" %
                                             (new_server.name, e)), from_setup)

            servers_added = servers_added + 1

    msg = ADD_SERVERS_MSG % (groups_added, servers_added)
    print(msg)

    return True, msg


def clear_database_servers(load_user=current_user, from_setup=False,
                           auth_source=INTERNAL):
    """Clear groups and servers configurations.
    """
    user = _does_user_exist(load_user, from_setup, auth_source)
    if user is None:
        return False

    user_id = user.id

    # Remove all servers
    servers = Server.query.filter_by(user_id=user_id)
    for server in servers:
        db.session.delete(server)

    # Remove all servergroups except for the first
    # This matches the UI behavior in
    # web/pgadmin/browser/server_groups/__init__.py#delete
    # TODO: Investigate if we can skip the first with an `offset(1)`
    groups = ServerGroup.query.filter_by(user_id=user_id).order_by("id")
    default_sg = groups.first()
    for group in groups:
        if group.id != default_sg.id:
            db.session.delete(group)

    try:
        db.session.commit()
    except Exception as e:
        error_msg = \
            gettext("Error clearing server configuration with error (%s)" %
                    str(e))
        if from_setup:
            print(error_msg)
            sys.exit(1)

        return False, error_msg


def _does_user_exist(user, from_setup, auth_source=INTERNAL):
    """
    This function will check user is exist or not. If exist then return
    """
    if isinstance(user, User):
        auth_source = user.auth_source
        user = user.username

    new_user = User.query.filter_by(username=user,
                                    auth_source=auth_source).first()

    if new_user is None:
        print(USER_NOT_FOUND % user)
        if from_setup:
            sys.exit(1)

    return new_user


def _is_refused_leaf_symlink(e):
    """True if `e` is the kernel refusing to follow a symbolic link because
    the file was opened with O_NOFOLLOW (ELOOP, or EMLINK on some BSDs),
    rather than a genuine filesystem error."""
    from pgadmin.misc.file_manager import _refuses_leaf_symlinks
    return _refuses_leaf_symlinks() and \
        e.errno in (errno.ELOOP, errno.EMLINK)


def _handle_error(error_msg, from_setup):
    """
    This function is used to print the error msg and exit from app if
    called from setup.py
    """
    if from_setup:
        print(error_msg)
        sys.exit(1)

    return False, error_msg


# Shortcut configuration for Accesskey
ACCESSKEY_FIELDS = [
    {
        'name': 'key',
        'type': 'keyCode',
        'label': gettext('Key')
    }
]

# Shortcut configuration
SHORTCUT_FIELDS = [
    {
        'name': 'key',
        'type': 'keyCode',
        'label': gettext('Key')
    },
    {
        'name': 'shift',
        'type': 'checkbox',
        'label': gettext('Shift')
    },

    {
        'name': 'control',
        'type': 'checkbox',
        'label': gettext('Ctrl')
    },
    {
        'name': 'alt',
        'type': 'checkbox',
        'label': gettext('Alt/Option')
    }
]


class KeyManager:
    def __init__(self):
        self.users = dict()
        self.lock = Lock()

    @login_required
    def get(self):
        user = self.users.get(current_user.id, None)
        if user is not None:
            return user.get('key', None)

    @login_required
    def set(self, _key, _new_login=True):
        with self.lock:
            user = self.users.get(current_user.id, None)
            if user is None:
                self.users[current_user.id] = dict(
                    session_count=1, key=_key)
            else:
                if _new_login:
                    user['session_count'] += 1
                user['key'] = _key

    @login_required
    def reset(self):
        with self.lock:
            user = self.users.get(current_user.id, None)

            if user is not None:
                # This will not decrement if session expired
                user['session_count'] -= 1
                if user['session_count'] == 0:
                    del self.users[current_user.id]

    @login_required
    def hard_reset(self):
        with self.lock:
            user = self.users.get(current_user.id, None)

            if user is not None:
                del self.users[current_user.id]


def get_safe_post_login_redirect():
    allow_list = [
        url_for('browser.index')
    ]
    if "SCRIPT_NAME" in os.environ and os.environ["SCRIPT_NAME"]:
        allow_list.append(os.environ["SCRIPT_NAME"])

    url = get_post_login_redirect()
    for item in allow_list:
        if url.startswith(item):
            return url

    return url_for('browser.index')


def get_safe_post_logout_redirect():
    allow_list = [
        url_for('security.login')
    ]
    if "SCRIPT_NAME" in os.environ and os.environ["SCRIPT_NAME"]:
        allow_list.append(os.environ["SCRIPT_NAME"])
    url = get_post_logout_redirect()
    for item in allow_list:
        if url.startswith(item):
            return url
    return url_for('security.login')


def check_extension_exists(conn, extension_name):
    sql = (
        "SELECT 1 FROM pg_catalog.pg_extension "
        "WHERE extname = %s"
    )
    status, res = conn.execute_scalar(sql, [extension_name])
    if status:
        if res:
            return status, True
        else:
            return status, False
    else:
        # If the query fails, we assume the extension does not exist
        return status, res


def database_conninfo(database):
    """
    Build the value to pass to a utility's --dbname option so that it
    connects to the named database.

    A bare --dbname value containing "=" (or a postgresql:// URI) is expanded
    by libpq into a connection string, which would let a user redirect the
    connection, and the credentials exported with it, to another server.
    Passing a conninfo string in which the name is the quoted value of the
    dbname keyword avoids that, since libpq never expands a dbname given
    inside a connection string. Unlike the PGDATABASE environment variable,
    it also takes precedence over a dbname set in the server's service file.

    :param database: Name of the database to connect to.
    :return: A connection string such as "dbname='my db'".
    """
    # Imported here rather than at module level, because pgadmin.utils is
    # also imported where libpq is unavailable, such as the documentation
    # build, and importing psycopg needs libpq.
    from psycopg.conninfo import make_conninfo
    return make_conninfo(dbname=database)


def utility_connection_params(manager, server):
    """
    The connection parameters a utility connects with: the manager's copy,
    which reflects the live connection, else the server's.  This is the
    selection BatchProcess.set_env_variables() makes for the environment, so
    that utility_conninfo() and the environment never name different files.

    :param manager: The connection manager, or None.
    :param server: The server row, or None.
    :return: The connection parameters dict, or None.
    """
    if manager and manager.connection_params:
        return manager.connection_params
    if server and getattr(server, 'connection_params', None):
        return server.connection_params
    return None


def utility_conninfo(database, connection_params):
    """
    The --dbname value for a utility: the database name (if given) plus, in
    server mode, passfile/sslcert/sslkey (the user's own file or
    NO_CLIENT_FILE), which libpq ranks above a pg_service.conf entry; the
    PG* environment variables alone are ranked below it.

    :param database: Name of the database to connect to, or None.
    :param connection_params: The server's connection parameters.
    :return: A connection string such as "dbname='my db' passfile='...'".
    """
    params = {} if database is None else {'dbname': database}
    if client_files_isolated():
        try:
            env = connection_params_to_env(connection_params)
        except PermissionError:
            # A path escaping the storage directory: set_env_variables()
            # raises this again, inside the caller's error handling.
            env = {}
        for param in CONNECTION_PARAM_CREDENTIAL_FILES:
            params[param] = \
                env.get(CONNECTION_PARAM_ENV_VARS[param]) or NO_CLIENT_FILE
    # See database_conninfo() for why this is imported here.
    from psycopg.conninfo import make_conninfo
    return make_conninfo(**params)
