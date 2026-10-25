##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements File Manager"""

import errno
import io
import os
import os.path
import secrets
import stat
import string
import time
from urllib.parse import unquote
from sys import platform as _platform
from flask_security import current_user
from pgadmin.utils.constants import ACCESS_DENIED_MESSAGE, TWO_PARAM_STRING
import config
import codecs
import pathlib

import json
from flask import render_template, Response, session, request as req, \
    url_for, current_app, send_file
from flask_babel import gettext
from pgadmin.user_login_check import pga_login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils import get_storage_directory
from pgadmin.utils.ajax import make_json_response, unauthorized, \
    internal_server_error, bad_request
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.constants import PREF_LABEL_OPTIONS, MIMETYPE_APP_JS, \
    MY_STORAGE
from pgadmin.settings.utils import get_file_type_setting
from pgadmin.tools.user_management.PgAdminPermissions import AllPermissionTypes
from config import SHARED_STORAGE

# Checks if platform is Windows
if _platform == "win32":
    import ctypes
    oldmode = ctypes.c_uint()
    kernel32 = ctypes.WinDLL('kernel32')
    SEM_FAILCRITICALERRORS = 1
    SEM_NOOPENFILEERRORBOX = 0x8000
    SEM_FAIL = SEM_NOOPENFILEERRORBOX | SEM_FAILCRITICALERRORS
    file_root = ""


def _openat_nofollow(dir_fd, name, flags, mode, path):
    """Open `name` relative to `dir_fd` without following a symbolic link.
    `path` is the full path, for error messages only."""
    try:
        return os.open(name, flags | os.O_NOFOLLOW | os.O_CLOEXEC, mode,
                       dir_fd=dir_fd)
    except NotADirectoryError:
        # With O_DIRECTORY, Linux reports a symbolic link as ENOTDIR rather
        # than ELOOP. Say what actually happened so callers can tell the
        # refusal from a genuine error.
        if stat.S_ISLNK(os.stat(name, dir_fd=dir_fd,
                                follow_symlinks=False).st_mode):
            raise OSError(errno.ELOOP, os.strerror(errno.ELOOP), path)
        raise


def _open_parent_beneath(root, path):
    """Open the directory containing `path`, which must lie inside `root`,
    without following a symbolic link anywhere below `root`.

    Validating a path with `check_access_permission()` and then opening it
    by name leaves a window in which any component of the path, the leaf or
    a parent directory, can be swapped for a symbolic link that points
    outside the storage directory (CWE-367 / CWE-61). Rather than check and
    then trust the name, this opens `root` and walks down from it one
    component at a time with O_NOFOLLOW, each open relative to the
    descriptor of the directory above it, so the kernel refuses a symbolic
    link (with ELOOP, or EMLINK on some BSDs) wherever it appears.

    `root` itself is trusted and may be a symbolic link, since it is the
    storage directory configured by the administrator. A symbolic link
    inside the storage directory is refused even when it points elsewhere
    inside it.

    `path` is walked as written, not normalised first: a ".." goes back up
    past a directory the walk has opened, so "link/.." opens "link" (and is
    refused) rather than being collapsed in the text to a directory that
    check_access_permission(), which resolves the link first, never named.
    `path` must be written as `root` followed by its components; any other
    path is refused. The walk never goes above `root`, so this holds for a
    path that has not been through check_access_permission() too, but
    callers pass the path that it returned.

    Returns (descriptor of the parent directory, name of the leaf); the
    caller must close the descriptor.
    """
    def denied():
        return PermissionError(errno.EACCES, gettext("Access denied"), path)

    def components(p):
        if not os.path.isabs(p):
            p = os.path.join(os.getcwd(), p)
        return [c for c in p.split(os.sep) if c not in ('', os.curdir)]

    if not root:
        raise denied()
    root_parts = components(root)
    parts = components(path)
    if parts[:len(root_parts)] != root_parts:
        raise denied()
    parts = parts[len(root_parts):]
    if not parts or parts[-1] == os.pardir:
        raise denied()

    # Keep open only the ancestors a later ".." can still go back up to:
    # after each directory, as many as there are ".." segments still to
    # come, plus the current one. A path then holds at most two more
    # descriptors than it has ".." segments (one more while the next
    # directory is being opened), rather than one per directory.
    # `depth` is how far below `root` the walk is, whether or not the
    # descriptors of the directories above are still held.
    dirs = parts[:-1]
    pardirs_after = [0] * len(dirs)
    remaining = 0
    for i in range(len(dirs) - 1, -1, -1):
        pardirs_after[i] = remaining
        remaining += dirs[i] == os.pardir
    fds = [os.open(os.path.realpath(root),
                   os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)]
    depth = 0
    try:
        for i, name in enumerate(dirs):
            if name == os.pardir:
                # Never above the storage directory.
                if depth == 0:
                    raise denied()
                os.close(fds.pop())
                depth -= 1
                continue
            fds.append(_openat_nofollow(fds[-1], name,
                                        os.O_RDONLY | os.O_DIRECTORY, 0,
                                        path))
            depth += 1
            while len(fds) > pardirs_after[i] + 1:
                os.close(fds.pop(0))
    except BaseException:
        for fd in fds:
            os.close(fd)
        raise
    for fd in fds[:-1]:
        os.close(fd)
    return fds[-1], parts[-1]


def _open_beneath(root, path, flags, mode=0o777):
    """Open `path`, which must lie inside `root`, without following a
    symbolic link anywhere below `root` (see `_open_parent_beneath()`).
    Returns a raw file descriptor."""
    dir_fd, name = _open_parent_beneath(root, path)
    try:
        return _openat_nofollow(dir_fd, name, flags, mode, path)
    except OSError as e:
        # O_WRONLY | O_NONBLOCK on a FIFO with no reader fails with ENXIO
        # ("Device not configured" on macOS, "No such device or address" on
        # Linux); report it as what it means so the raw OS message, with its
        # path, never reaches the client. Done here rather than in a single
        # caller so every write path (upload, save_file, Export Servers and
        # open_utility_file) is covered. A read open of a FIFO does not raise
        # ENXIO; a non-regular file there is caught by the caller's S_ISREG
        # check instead.
        if e.errno == errno.ENXIO:
            raise OSError(errno.EINVAL, gettext("Not a regular file"), path)
        raise
    finally:
        os.close(dir_fd)


def _open_upload_target(path, root):
    """Open a file for writing, with symlink protection in server mode.

    Used by the file upload endpoint, `save_file()` (Query Tool / ERD save)
    and Export Servers, each of which has validated `path` against the
    storage directory `root`. Returns a binary write-mode file object.

    In server mode the file is opened by `_open_beneath()`, so a symbolic
    link swapped in at the leaf or at any parent directory since the check
    is refused rather than followed out of the storage directory, and new
    files are created owner-only (0o600).

    In desktop mode there is no storage sandbox to escape, as
    `check_access_permission` is a no-op and the user may write anywhere
    they can, so neither restriction applies: symlinks are followed and new
    files get the umask default. O_NOFOLLOW must not be used there, as some
    filesystems (e.g. the xdg-document-portal FUSE mount used by Flatpak)
    return ELOOP for it even on regular files.

    On Windows, O_NOFOLLOW and descriptor-relative opens are unavailable,
    so the file is opened by name; the residual TOCTOU (a symbolic or hard
    link swapped in after the check) is mitigated by the absence of any
    in-pgAdmin primitive that creates either.
    """
    if _refuses_leaf_symlinks():
        # Open non-blocking and accept only a regular file, so a FIFO planted
        # at the path cannot hang the write waiting for a reader (a reader-less
        # FIFO fails with ENXIO, which _open_beneath() translates), and a
        # symbolic link is refused rather than followed. O_TRUNC is NOT used
        # here: a hard link is truncated only after the link check below, so
        # a second name for a file outside the storage directory is never
        # emptied.
        flags = os.O_WRONLY | os.O_CREAT | os.O_NONBLOCK
        fd = _open_beneath(root, path, flags, 0o600)
        try:
            st = os.fstat(fd)
            if not stat.S_ISREG(st.st_mode):
                raise OSError(errno.EINVAL,
                              gettext("Not a regular file"), path)
            # A hard link is an ordinary file O_NOFOLLOW cannot detect;
            # refuse a second name for the same inode. st_nlink == 0 means the
            # file was unlinked between the open and here, which is refused
            # too (and would make the "multiple hard links" wording wrong).
            if st.st_nlink > 1:
                raise OSError(errno.EPERM, gettext(
                    "Refusing a file with multiple hard links"), path)
            if st.st_nlink == 0:
                raise OSError(errno.EPERM, gettext(
                    "Refusing a file that was unlinked after opening"), path)
            os.set_blocking(fd, True)
            os.ftruncate(fd, 0)
        except BaseException:
            try:
                os.close(fd)
            except OSError:
                pass
            raise
    else:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC,
                     0o600 if config.SERVER_MODE else 0o666)
    return os.fdopen(fd, 'wb')


def _open_read_target(path, root):
    """Open a file for reading, with symlink protection in server mode.

    The read-side counterpart of `_open_upload_target()`, for callers that
    validate a path against the storage directory `root` and then open it,
    so a symbolic link swapped in at the leaf or at a parent directory in
    between cannot redirect the read outside the storage directory. Returns
    a binary read-mode file object.

    Only a regular file is accepted: the open is non-blocking so that a
    FIFO at the path cannot hang the request waiting for a writer, and
    anything that is not a regular file is refused with EINVAL. In desktop
    mode symbolic links are followed, as there is no storage directory to
    escape.
    """
    if not _refuses_leaf_symlinks():
        nonblock = getattr(os, 'O_NONBLOCK', 0)
        fd = os.open(path, os.O_RDONLY | nonblock | getattr(os, 'O_BINARY', 0))
        try:
            if not stat.S_ISREG(os.fstat(fd).st_mode):
                raise OSError(errno.EINVAL, gettext("Not a regular file"),
                              path)
            if nonblock:
                os.set_blocking(fd, True)
        except BaseException:
            os.close(fd)
            raise
        return os.fdopen(fd, 'rb')

    fd = _open_beneath(root, path, os.O_RDONLY | os.O_NONBLOCK)
    try:
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode):
            raise OSError(errno.EINVAL, gettext("Not a regular file"), path)
        # A hard link is an ordinary file that O_NOFOLLOW cannot detect, so
        # refuse a second name for the same inode, which could point at a
        # file outside the storage directory. st_nlink == 0 means the file
        # was unlinked after the open, which is refused too.
        if st.st_nlink > 1:
            raise OSError(errno.EPERM, gettext(
                "Refusing a file with multiple hard links"), path)
        if st.st_nlink == 0:
            raise OSError(errno.EPERM, gettext(
                "Refusing a file that was unlinked after opening"), path)
        os.set_blocking(fd, True)
    except BaseException:
        os.close(fd)
        raise
    return os.fdopen(fd, 'rb')


def _is_nofollow_refusal(e):
    """True if the OSError `e` is the errno O_NOFOLLOW refuses a symbolic
    link with: ELOOP, or EMLINK on the BSDs that use it. On Linux EMLINK is
    only ever a real "too many links" error (e.g. renaming a directory into
    one at its link limit), so it is not read as a refusal there."""
    return e.errno == errno.ELOOP or (
        e.errno == errno.EMLINK and not _platform.startswith('linux'))


def _acts_beneath():
    """True when `_remove_beneath()` and `_rename_beneath()` act relative
    to directories opened by `_open_parent_beneath()`."""
    return _refuses_leaf_symlinks() and \
        {os.rmdir, os.unlink, os.rename} <= os.supports_dir_fd


def _remove_beneath(path, root):
    """Remove the file or empty directory `path`, which must lie inside
    `root`, with the same protection as `_open_read_target()`: in server
    mode a symbolic link swapped in for a parent directory since the check
    is refused rather than followed, and a symbolic link at the leaf is
    removed itself.
    """
    if not _acts_beneath():
        if os.path.isdir(path):
            os.rmdir(path)
        else:
            os.remove(path)
        return

    dir_fd, name = _open_parent_beneath(root, path)
    try:
        st = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
        if stat.S_ISDIR(st.st_mode):
            os.rmdir(name, dir_fd=dir_fd)
        else:
            os.unlink(name, dir_fd=dir_fd)
    finally:
        os.close(dir_fd)


def _rename_beneath(old, new, root):
    """Rename `old` to `new`, which must both lie inside `root`, with the
    same protection as `_remove_beneath()`. A symbolic link at either leaf
    is renamed or replaced itself, never followed."""
    if not _acts_beneath():
        os.rename(old, new)
        return

    old_fd, old_name = _open_parent_beneath(root, old)
    try:
        new_fd, new_name = _open_parent_beneath(root, new)
        try:
            os.rename(old_name, new_name, src_dir_fd=old_fd,
                      dst_dir_fd=new_fd)
        finally:
            os.close(new_fd)
    finally:
        os.close(old_fd)


def _refuses_leaf_symlinks():
    """True when `_open_upload_target()` and `_open_read_target()` open
    through `_open_beneath()`, refusing symbolic links.

    Callers that translate ELOOP/EMLINK into a "refusing to write through
    a symbolic link" message must use this same condition, so that the
    message cannot drift from the behaviour: in desktop mode (or on
    Windows, where O_NOFOLLOW and descriptor-relative opens do not exist)
    those errnos mean a genuine filesystem problem, not a deliberate
    refusal.
    """
    return config.SERVER_MODE and hasattr(os, 'O_NOFOLLOW') and \
        hasattr(os, 'O_DIRECTORY') and os.open in os.supports_dir_fd


MODULE_NAME = 'file_manager'
global transid

path_exists = os.path.exists
split_path = os.path.split
encode_json = json.JSONEncoder().encode


# utility functions
# convert bytes type to human readable format
def sizeof_fmt(num, suffix='B'):
    for unit in ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z']:
        if abs(num) < 1024.0:
            return "%3.1f %s%s" % (num, unit, suffix)
        num /= 1024.0
    return "%.1f %s%s" % (num, 'Y', suffix)


# return size of file
def getsize(path):
    st = os.stat(path)
    return st.st_size


def getdrivesize(path):
    if _platform == "win32":
        free_bytes = ctypes.c_ulonglong(0)
        ctypes.windll.kernel32.GetDiskFreeSpaceExW(
            ctypes.c_wchar_p(path), None, None, ctypes.pointer(free_bytes))
        return free_bytes.value


# split extension for files
def splitext(path):
    for ext in ['.tar.gz', '.tar.bz2']:
        if path.endswith(ext):
            path, ext = path[:-len(ext)], path[-len(ext):]
            break
    else:
        path, ext = os.path.splitext(path)
    return ext[1:]


# check if file is hidden in windows platform
def is_folder_hidden(filepath):
    if _platform == "win32":
        try:
            attrs = ctypes.windll.kernel32.GetFileAttributesW(filepath)
            assert attrs != -1
            result = bool(attrs & 2)
        except (AttributeError, AssertionError):
            result = False
        return result
    else:
        return os.path.basename(filepath).startswith('.')


def _open_text(file, root, **kwargs):
    """Open `file` for reading as text. With a storage directory `root`, it
    is opened with `_open_read_target()`, so a symbolic link swapped in
    since the path was checked is not followed."""
    if root is None:
        return open(file, 'r', **kwargs)
    return io.TextIOWrapper(_open_read_target(file, root), **kwargs)


def read_file_generator(file, enc, root=None):
    """
    This will read the content of the file selected by user.

    Args:
        file: Path to the file to be read.
        enc: Initial encoding to attempt for reading the file.
        root: The storage directory `file` was checked against, if any.

    Returns:
        Generator yielding 4MB chunks of the file content.
    """
    encoding = enc
    errors = None
    if enc != 'latin-1':
        try:
            with _open_text(file, root, encoding=enc,
                            newline='') as fileObj:
                while True:
                    data = fileObj.read(4194304)
                    if not data:
                        break
        except UnicodeDecodeError:
            # This is the closest equivalent Python 3 offers to the permissive
            # Python 2 text handling model. The latin-1 encoding in Python
            # implements ISO_8859-1:1987 which maps all possible byte values
            # to the first 256 Unicode code points, and thus ensures decoding
            # errors will never occur regardless of the configured error and
            # handles most of the Windows encodings
            # handler.
            # Ref: https://tinyurl.com/yvj4u7fw
            encoding = 'latin-1'
            # Record the fallback so that saving the file writes it back
            # in the encoding it was actually read with.
            Filemanager.remember_file_encoding(file, encoding)
        except Exception as e:
            if isinstance(e, OSError):
                raise
            # As a last resort we will use the provided encoding and then
            # ignore the decoding errors
            encoding = enc
            errors = 'ignore'

    open_kwargs = {'encoding': encoding, 'newline': ''}
    if errors is not None:
        open_kwargs['errors'] = errors

    with _open_text(file, root, **open_kwargs) as fileObj:
        while True:
            # 4MB chunk (4 * 1024 * 1024 Bytes)
            data = fileObj.read(4194304)
            if not data:
                break
            yield data


class FileManagerModule(PgAdminModule):
    """
    FileManager lists files and folders and does
    following operations:
    - File selection
    - Folder selection
    - Open file
    - Create File
    and also supports:
    - Rename file
    - Delete file
    - Upload file
    - Create folder
    """

    LABEL = gettext("Storage")

    def get_own_menuitems(self):
        return {
            'file_items': []
        }

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return [
            'file_manager.init',
            'file_manager.filemanager',
            'file_manager.index',
            'file_manager.delete_trans_id',
            'file_manager.save_last_dir',
            'file_manager.save_file_dialog_view',
            'file_manager.save_show_hidden_file_option',
            'file_manager.load_file',
            'file_manager.save_file',
        ]

    def get_file_size_preference(self):
        return self.file_upload_size

    def register_preferences(self):
        # Register 'file upload size' preference
        self.file_upload_size = self.preference.register(
            'options', 'file_upload_size',
            gettext("Maximum file upload size (MB)"), 'integer', 50,
            category_label=PREF_LABEL_OPTIONS
        )
        self.last_directory_visited = self.preference.register(
            'options', 'last_directory_visited',
            gettext("Last directory visited"), 'text', '/',
            category_label=PREF_LABEL_OPTIONS
        )
        self.last_storage = self.preference.register(
            'options', 'last_storage',
            gettext("Last storage"), 'text', '',
            category_label=PREF_LABEL_OPTIONS,
            hidden=True
        )
        self.file_dialog_view = self.preference.register(
            'options', 'file_dialog_view',
            gettext("File dialog view"), 'select', 'list',
            category_label=PREF_LABEL_OPTIONS,
            options=[{'label': gettext('List'), 'value': 'list'},
                     {'label': gettext('Grid'), 'value': 'grid'}],
            control_props={
                'allowClear': False,
                'tags': False
            },
        )
        self.show_hidden_files = self.preference.register(
            'options', 'show_hidden_files',
            gettext("Show hidden files and folders?"), 'boolean', False,
            category_label=PREF_LABEL_OPTIONS
        )


# Initialise the module
blueprint = FileManagerModule(MODULE_NAME, __name__)


@blueprint.route("/", endpoint='index')
@pga_login_required
def index():
    return bad_request(
        errormsg=gettext("This URL cannot be called directly.")
    )


@blueprint.route(
    "/init", methods=["POST"], endpoint='init'
)
@pga_login_required
def init_filemanager():
    if len(req.data) != 0:
        configs = json.loads(req.data)
        trans_id = Filemanager.create_new_transaction(configs)
        data = Filemanager.get_trasaction_selection(trans_id)
        pref = Preferences.module('file_manager')
        file_dialog_view = pref.preference('file_dialog_view').get()
        if isinstance(file_dialog_view, list):
            file_dialog_view = file_dialog_view[0]

        last_selected_format = get_file_type_setting(data['supported_types'])
        # in some cases, the setting may not match with available types
        if last_selected_format not in data['supported_types']:
            last_selected_format = data['supported_types'][0]

        res_data = {
            'transId': trans_id,
            "options": {
                "culture": "en",
                "lang": "py",
                "defaultViewMode": file_dialog_view,
                "autoload": True,
                "showFullPath": False,
                "dialog_type": data['dialog_type'],
                "show_hidden_files":
                    pref.preference('show_hidden_files').get(),
                "fileRoot": data['fileroot'],
                "capabilities": data['capabilities'],
                "allowed_file_types": data['supported_types'],
                "platform_type": data['platform_type'],
                "show_volumes": data['show_volumes'],
                "homedir": data['homedir'],
                'storage_folder': data['storage_folder'],
                "last_selected_format": last_selected_format
            },
            "security": {
                "uploadPolicy": data['security']['uploadPolicy'],
                "uploadRestrictions": data['security']['uploadRestrictions'],
            },
            "upload": {
                "multiple": data['upload']['multiple'],
                "number": 20,
                "fileSizeLimit": data['upload']['fileSizeLimit'],
                "imagesOnly": False
            }
        }

    return make_json_response(data=res_data)


@blueprint.route(
    "/delete_trans_id/<int:trans_id>",
    methods=["DELETE"], endpoint='delete_trans_id'
)
@pga_login_required
def delete_trans_id(trans_id):
    Filemanager.release_transaction(trans_id)
    return make_json_response(
        data={'status': True}
    )


@blueprint.route(
    "/save_last_dir/<int:trans_id>", methods=["POST"], endpoint='save_last_dir'
)
@pga_login_required
def save_last_directory_visited(trans_id):
    blueprint.last_directory_visited.set(req.json['path'])
    blueprint.last_storage.set(req.json['storage_folder'])
    return make_json_response(status=200)


@blueprint.route(
    "/save_file_dialog_view/<int:trans_id>", methods=["POST"],
    endpoint='save_file_dialog_view'
)
@pga_login_required
def save_file_dialog_view(trans_id):
    blueprint.file_dialog_view.set(req.json['view'])
    return make_json_response(status=200)


@blueprint.route(
    "/save_show_hidden_file_option/<int:trans_id>", methods=["PUT"],
    endpoint='save_show_hidden_file_option'
)
@pga_login_required
def save_show_hidden_file_option(trans_id):
    blueprint.show_hidden_files.set(req.json['show_hidden'])
    return make_json_response(status=200)


@blueprint.route('/load_file/', methods=["PUT", "POST"],
                 endpoint='load_file')
@pga_login_required
def load_file():
    """
    This function gets name of file from request data
    reads the data and sends back in response
    """
    if req.data:
        file_data = json.loads(req.data)

    file_path = unquote(file_data['file_name'])

    # get the current storage from request if available
    # or get it from last_storage preference.
    if 'storage' in file_data:
        storage_folder = file_data['storage']
    else:
        storage_folder = Preferences.module('file_manager').preference(
            'last_storage').get()

    # retrieve storage directory path
    storage_manager_path = get_storage_directory(
        shared_storage=storage_folder)

    try:
        checked_path = Filemanager.check_access_permission(
            storage_manager_path, file_path)
    except Exception as e:
        return internal_server_error(errormsg=str(e))

    if storage_manager_path:
        # The full path of the file is the one that was checked.
        file_path = checked_path

    (status, err_msg, is_binary,
     is_startswith_bom, enc) = Filemanager.check_file_for_bom_and_binary(
        file_path, root=storage_manager_path
    )

    if not status:
        # Already translated, or the operating system's own message.
        return internal_server_error(errormsg=err_msg)

    if is_binary:
        return internal_server_error(
            errormsg=gettext("File type not supported")
        )

    return Response(read_file_generator(file_path, enc, storage_manager_path),
                    mimetype='text/plain')


@blueprint.route('/save_file/', methods=["PUT", "POST"],
                 endpoint='save_file')
@pga_login_required
def save_file():
    """
    This function retrieves file_name and data from request.
    and then save the data to the file
    """
    if req.data:
        file_data = json.loads(req.data)

    # retrieve storage directory path
    last_storage = Preferences.module('file_manager').preference(
        'last_storage').get()
    if last_storage != MY_STORAGE:
        selected_dir_list = [sdir for sdir in SHARED_STORAGE if
                             sdir['name'] == last_storage]
        selected_dir = selected_dir_list[0] if len(
            selected_dir_list) == 1 else None

        if selected_dir and selected_dir['restricted_access'] and \
                not current_user.has_role("Administrator"):
            return make_json_response(success=0,
                                      errormsg=ACCESS_DENIED_MESSAGE,
                                      info='ACCESS_DENIED',
                                      status=403)
        storage_manager_path = get_storage_directory(
            shared_storage=last_storage)
    else:
        storage_manager_path = get_storage_directory()

    # generate full path of file
    file_path = unquote(file_data['file_name'])

    try:
        checked_path = Filemanager.check_access_permission(
            storage_manager_path, file_path)
    except Exception as e:
        return internal_server_error(errormsg=str(e))

    if storage_manager_path is not None:
        # The full path of the file is the one that was checked.
        file_path = checked_path

    # Save in the encoding the file was loaded with, if it was loaded.
    enc = Filemanager.get_file_encoding(file_path)
    try:
        file_content = file_data['file_content'].encode(enc)
    except UnicodeEncodeError:
        # The edited content has characters the original encoding (in
        # practice latin-1) cannot represent, so fall back to UTF-8 rather
        # than refusing the save or losing them.
        enc = 'utf-8'
        file_content = file_data['file_content'].encode(enc)
    error_str = gettext("Error: {0}")

    # write to file
    try:
        with _open_upload_target(file_path,
                                 storage_manager_path) as output_file:
            output_file.write(file_content)
    except IOError as e:
        # O_NOFOLLOW makes the kernel refuse a leaf symlink with ELOOP
        # (EMLINK on some BSDs). Report that specifically: the raw strerror
        # ("Too many levels of symbolic links") tells the user nothing
        # about why their save was rejected. Only when O_NOFOLLOW was
        # actually set, though: otherwise the errno is a real filesystem
        # error (a symlink loop, say) and the raw strerror is the truth.
        if _refuses_leaf_symlinks() and \
                _is_nofollow_refusal(e):
            return internal_server_error(errormsg=gettext(
                "Refusing to write through a symbolic link."))
        err_msg = error_str.format(e.strerror)
        return internal_server_error(errormsg=err_msg)
    except Exception as e:
        # A non-OSError has no strerror; fall back to its string form so the
        # handler itself never raises AttributeError (a 500).
        err_msg = error_str.format(getattr(e, 'strerror', None) or str(e))
        return internal_server_error(errormsg=err_msg)

    # Record the encoding only once the file has actually been written in it.
    Filemanager.remember_file_encoding(file_path, enc)

    return make_json_response(
        data={
            'status': True,
        }
    )


class Filemanager():
    """FileManager Class."""

    # Maps the real path of each file loaded into the Query Tool to the
    # encoding it was read with, so that saving it writes the same encoding.
    loaded_file_encodings = {}

    ERROR_NOT_ALLOWED = {
        'Error': gettext('Not allowed'),
        'Code': 0
    }

    def __init__(self, trans_id, ss=''):
        self.trans_id = trans_id
        self.dir = get_storage_directory()
        self.shared_dir = get_storage_directory(shared_storage=ss)

        if self.dir is not None and isinstance(self.dir, list):
            self.dir = ""

    @staticmethod
    def get_closest_parent(storage_dir, last_dir):
        """
        Check if path exists and if not then get closest parent which exists
        :param storage_dir: Base dir
        :param last_dir: check dir
        :return: exist dir
        """
        if len(last_dir) > 1 and \
                (last_dir.endswith('/') or last_dir.endswith('\\')):
            last_dir = last_dir[:-1]

        def exists_in_storage(path):
            # A folder outside the storage directory counts as missing, so
            # its existence is never tested or revealed.
            # A remembered folder the path cannot even be resolved for
            # (e.g. one with a NUL byte) counts as missing too.
            try:
                abs_path = Filemanager.check_access_permission(
                    storage_dir, path)
            except (OSError, ValueError):
                return False
            return os.path.exists(abs_path)

        while last_dir:
            if exists_in_storage(last_dir):
                break
            index = max(last_dir.rfind('\\'), last_dir.rfind('/')) \
                if _platform == 'win32' else last_dir.rfind('/')
            # Without a separator there is no parent left to try.
            last_dir = last_dir[0:index] if index >= 0 else ''

        if _platform == 'win32':
            if not last_dir.endswith('\\'):
                last_dir += "\\"

            return last_dir

        if not last_dir.endswith('/'):
            last_dir += "/"

        return last_dir

    @staticmethod
    def check_capability_permission(capability):
        """
        Check if the user has permission for the capability
        """
        if capability == 'create':
            return current_user.has_permission(
                AllPermissionTypes.storage_add_folder)
        elif capability == 'delete':
            return current_user.has_permission(
                AllPermissionTypes.storage_remove_folder)

        return True

    @staticmethod
    def create_new_transaction(params):
        """
        It will also create a unique transaction id and
        store the information into session variable.
        Args:
            capabilities: Allow/Disallow user to perform
            selection, rename, delete etc.
        """

        # Define configs for dialog types
        # select file, select folder, create mode
        Filemanager.suspend_windows_warning()
        fm_type = params['dialog_type']
        storage_dir = get_storage_directory()

        # It is used in utitlity js to decide to
        # show or hide select file type options
        show_volumes = isinstance(storage_dir, list) or not storage_dir
        supp_types = allow_upload_files = params.get('supported_types', [])

        allow_folder_create = ['create'] if \
            Filemanager.check_capability_permission('create') else []
        allow_folder_delete = ['delete'] if \
            Filemanager.check_capability_permission('delete') else []
        # tuples with (capabilities, files_only, folders_only, title)
        capability_map = {
            'select_file': (
                ['select_file', 'rename', 'upload'] + allow_folder_delete,
                True,
                False,
                gettext("Select File")
            ),
            'select_folder': (
                ['select_folder', 'rename'] + allow_folder_create,
                False,
                True,
                gettext("Select Folder")
            ),
            'open_file': (
                ['open_file'],
                True,
                False,
                gettext("Select File")
            ),
            'create_file': (
                ['select_file', 'rename'] + allow_folder_create,
                True,
                False,
                gettext("Create File")
            ),
            'storage_dialog': (
                ['select_folder', 'select_file', 'download', 'rename',
                 'upload'] + allow_folder_delete + allow_folder_create,
                True,
                False,
                gettext("Storage Manager")
            ),
        }

        capabilities, files_only, folders_only, title = capability_map[fm_type]

        # Using os.path.join to make sure we have trailing '/' or '\'
        homedir = '/' if (config.SERVER_MODE) \
            else os.path.join(os.path.expanduser('~'), '')

        # get last visited directory, if not present then traverse in reverse
        # order to find closest parent directory
        if 'init_path' in params:
            blueprint.last_directory_visited.get(params['init_path'])
        last_dir = blueprint.last_directory_visited.get()
        last_ss_name = blueprint.last_storage.get()
        if last_ss_name and last_ss_name != MY_STORAGE \
                and len(config.SHARED_STORAGE) > 0:
            selected_dir = [sdir for sdir in config.SHARED_STORAGE if
                            sdir['name'] == last_ss_name]
            last_ss = selected_dir[0]['path'] if len(
                selected_dir) == 1 else storage_dir
        else:
            if last_ss_name != MY_STORAGE:
                last_dir = '/'
                blueprint.last_storage.set(MY_STORAGE)

            last_ss = storage_dir

        check_dir_exists = False
        if last_dir is None:
            last_dir = "/"
        else:
            check_dir_exists = True

        if not config.SERVER_MODE and last_dir == "/" or last_dir == "/":
            last_dir = homedir

        if check_dir_exists:
            last_dir = Filemanager.get_closest_parent(last_ss, last_dir)

        # create configs using above configs
        configs = {
            "fileroot": last_dir,
            "homedir": homedir,
            'storage_folder': last_ss_name,
            "dialog_type": fm_type,
            "title": title,
            "upload": {
                "multiple": True
            },
            "capabilities": capabilities,
            "security": {
                "uploadPolicy": "",
                "uploadRestrictions": allow_upload_files
            },
            "files_only": files_only,
            "folders_only": folders_only,
            "supported_types": supp_types,
            "platform_type": _platform,
            "show_volumes": show_volumes
        }

        # Create a unique id for the transaction
        trans_id = str(secrets.choice(range(1, 9999999)))

        if 'fileManagerData' not in session:
            file_manager_data = dict()
        else:
            file_manager_data = session['fileManagerData']

        file_upload_size = blueprint.get_file_size_preference().get()
        configs['upload']['fileSizeLimit'] = file_upload_size
        file_manager_data[trans_id] = configs
        session['fileManagerData'] = file_manager_data
        Filemanager.resume_windows_warning()

        return trans_id

    @staticmethod
    def get_trasaction_selection(trans_id):
        """
        This method returns the information of unique transaction
        id from the session variable.

        Args:
            trans_id: unique transaction id
        """
        file_manager_data = session['fileManagerData']

        # Return from the function if transaction id not found
        if str(trans_id) in file_manager_data:
            return file_manager_data[str(trans_id)]

    @staticmethod
    def release_transaction(trans_id):
        """
        This method is to remove the information of unique transaction
        id from the session variable.

        Args:
            trans_id: unique transaction id
        """
        file_manager_data = session['fileManagerData']
        # Return from the function if transaction id not found
        if str(trans_id) not in file_manager_data:
            return make_json_response(status=200)

        # Remove the information of unique transaction id
        # from the session variable.
        file_manager_data.pop(str(trans_id), None)
        session['fileManagerData'] = file_manager_data

        return make_json_response(status=200)

    @staticmethod
    def _get_drives_with_size(drive_name=None):
        """
        This is a generic function which returns the default path for storage
        manager dialog irrespective of any Platform type to list all
        files and directories.
        Platform windows:
        if no path is given, it will list volumes, else list directory
        Platform unix:
        it returns path to root directory if no path is specified.
        """
        def _get_drive_size(path):
            try:
                drive_size = getdrivesize(path)
                return sizeof_fmt(drive_size)
            except Exception:
                return 0

        if _platform == "win32":
            try:
                drives = []
                bitmask = ctypes.windll.kernel32.GetLogicalDrives()
                for letter in string.ascii_uppercase:
                    if bitmask & 1:
                        drives.append((letter, _get_drive_size(letter)))
                    bitmask >>= 1
                if (drive_name != '' and drive_name is not None and
                        drive_name in drives):
                    letter = "{0}{1}".format(drive_name, ':')
                    return (letter, _get_drive_size(letter))
                else:
                    return drives  # return drives if no argument is passed
            except Exception:
                return [('C:', _get_drive_size('C:'))]
        else:
            return '/'

    @staticmethod
    def suspend_windows_warning():
        """
        Prevents 'there is no disk in drive' waning on windows
        """
        # StackOverflow Ref: https://stackoverflow.com/q/29059399/164233
        if _platform == "win32":
            kernel32.SetThreadErrorMode(SEM_FAIL, ctypes.byref(oldmode))

    @staticmethod
    def resume_windows_warning():
        """
        Resumes waning on windows
        """
        if _platform == "win32":
            # Resume windows error
            kernel32.SetThreadErrorMode(oldmode, ctypes.byref(oldmode))

    @staticmethod
    def _skip_file_extension(
            file_type, supported_types, folders_only, file_extension):
        """
        Used internally by get_files_in_path to check if
        the file extn to be skipped
        """
        return file_type is not None and file_type != "*" and (
            folders_only or len(supported_types) > 0 and
            file_extension not in supported_types or
            file_type != file_extension)

    @staticmethod
    def get_files_in_path(
        show_hidden_files, files_only, folders_only, supported_types,
            file_type, user_dir, orig_path):
        """
        Get list of files and dirs in the path
        :param show_hidden_files: boolean
        :param files_only: boolean
        :param folders_only: boolean
        :param supported_types: array of supported types
        :param file_type: file type
        :param user_dir: base user dir
        :param orig_path: path after user dir
        :return:
        """
        files = []

        for f in sorted(os.listdir(orig_path)):
            system_path = os.path.join(os.path.join(orig_path, f))

            # continue if file/folder is hidden (based on user preference)
            if not show_hidden_files and is_folder_hidden(system_path):
                continue
            try:
                user_path = os.path.join(os.path.join(user_dir, f))
                created = time.ctime(os.path.getctime(system_path))
                modified = time.ctime(os.path.getmtime(system_path))
                file_extension = str(splitext(system_path))
            except Exception:
                continue

            # set protected to 1 if no write or read permission
            protected = 0
            if (not os.access(system_path, os.R_OK) or
                    not os.access(system_path, os.W_OK)):
                protected = 1

            # list files only or folders only
            if os.path.isdir(system_path):
                if files_only == 'true':
                    continue
                file_extension = "dir"
            # filter files based on file_type
            elif Filemanager._skip_file_extension(
                    file_type, supported_types, folders_only, file_extension):
                continue

            # create a list of files and folders
            files.append({
                "Filename": f,
                "Path": user_path,
                "file_type": file_extension,
                "Protected": protected,
                "Properties": {
                    "Date Created": created,
                    "Date Modified": modified,
                    "Size": sizeof_fmt(getsize(system_path))
                }
            })

        return files

    @staticmethod
    def list_filesystem(in_dir, path, trans_data, file_type, show_hidden):
        """
        It lists all file and folders within the given
        directory.
        """
        Filemanager.suspend_windows_warning()
        is_show_hidden_files = show_hidden

        path = unquote(path)

        Filemanager.check_access_permission(in_dir, path)
        Filemanager.resume_windows_warning()

        files = []
        if (_platform == "win32" and (path == '/' or path == '\\'))\
                and in_dir is None:
            drives = Filemanager._get_drives_with_size()
            for drive, drive_size in drives:
                path = file_name = "{0}:".format(drive)
                files.append({
                    "Filename": file_name,
                    "Path": path,
                    "file_type": 'drive',
                    "Protected": 1 if drive_size == 0 else 0,
                    "Properties": {
                        "Date Created": "",
                        "Date Modified": "",
                        "Size": drive_size
                    }
                })
            Filemanager.resume_windows_warning()
            return files

        orig_path = Filemanager.get_abs_path(in_dir, path)

        if not path_exists(orig_path):
            Filemanager.resume_windows_warning()
            return make_json_response(
                status=404,
                errormsg=gettext("'{0}' file does not exist.").format(path))

        user_dir = path
        folders_only = trans_data.get('folders_only', '')
        files_only = trans_data.get('files_only', '')
        supported_types = trans_data.get('supported_types', [])

        try:
            files = Filemanager.get_files_in_path(
                is_show_hidden_files, files_only, folders_only,
                supported_types, file_type, user_dir, orig_path
            )
        except Exception as e:
            Filemanager.resume_windows_warning()
            err_msg = str(e)
            if (hasattr(e, 'strerror') and
                    e.strerror == gettext('Permission denied')):
                err_msg = str(e.strerror)
            return unauthorized(err_msg)
        Filemanager.resume_windows_warning()
        return files

    @staticmethod
    def check_access_permission(in_dir, path, skip_permission_check=False):
        """Check that `path`, relative to the storage directory `in_dir`,
        stays inside it in server mode, and return the absolute path that
        was checked.

        Callers must do the file operation on the returned path rather
        than build their own from `in_dir` and `path`: any other way of
        joining them can name a different file from the one checked.
        """
        abs_path = Filemanager.get_abs_path(in_dir, path)
        if not config.SERVER_MODE or skip_permission_check:
            return abs_path

        in_dir = '' if in_dir is None else in_dir
        orig_path = Filemanager.get_abs_path(in_dir, path)

        # Resolve symbolic links AND .. notation. abspath() alone resolves
        # only .., leaving a gap where a symlink inside the user's storage
        # directory could escape the sandbox at the kernel-syscall layer
        # (CWE-61 / CWE-22). realpath() closes that gap.
        orig_path = os.path.realpath(orig_path)

        if in_dir:
            if _platform == 'win32':
                if in_dir[-1] == '\\' or in_dir[-1] == '/':
                    in_dir = in_dir[:-1]
            else:
                if in_dir[-1] == '/':
                    in_dir = in_dir[:-1]
            # Resolve in_dir too: a symlinked storage root would otherwise
            # compare unequal to the resolved target path and break legit
            # access.
            in_dir = os.path.realpath(in_dir)

        # Do not allow user to access outside his storage dir
        # in server mode.
        try:
            pathlib.Path(orig_path).relative_to(in_dir)
        except ValueError:
            raise PermissionError(gettext("Access denied ({0})").format(path))

        return abs_path

    @staticmethod
    def get_abs_path(in_dir, path):

        if (path.startswith('\\\\') and _platform == 'win32')\
                or config.SERVER_MODE is False or in_dir is None:
            return "{}".format(path)

        if path == '/' or path == '\\':
            if _platform == 'win32':
                if in_dir.endswith('\\') or in_dir.endswith('/'):
                    return "{}".format(in_dir)
                else:
                    return "{}{}".format(in_dir, '\\')
            else:
                if in_dir.endswith('/'):
                    return "{}".format(in_dir)
                else:
                    return "{}{}".format(in_dir, '/')

        if in_dir.endswith('/') or in_dir.endswith('\\'):
            if path.startswith('/') or path.startswith('\\'):
                return "{}{}".format(in_dir[:-1], path)
            else:
                return TWO_PARAM_STRING.format(in_dir, path)
        else:
            if path.startswith('/') or path.startswith('\\'):
                return "{}{}".format(in_dir, path)
            else:
                return TWO_PARAM_STRING.format(in_dir, path)

    def validate_request(self, capability):
        """
        It validates the capability with the capabilities
        stored in the session
        """
        trans_data = Filemanager.get_trasaction_selection(self.trans_id)
        # capability
        return False if capability not in trans_data['capabilities'] \
            else Filemanager.check_capability_permission(capability)

    def getfolder(self, path=None, file_type="", show_hidden=False):
        """
        Returns files and folders in give path
        """
        trans_data = Filemanager.get_trasaction_selection(self.trans_id)
        the_dir = None
        if config.SERVER_MODE:
            if self.shared_dir and len(config.SHARED_STORAGE) > 0:
                the_dir = self.shared_dir
            else:
                the_dir = self.dir

            if the_dir is not None and not the_dir.endswith('/'):
                the_dir += '/'

        filelist = self.list_filesystem(
            the_dir, path, trans_data, file_type, show_hidden)
        return filelist

    def check_access(self, ss):
        if self.shared_dir:
            selected_dir_list = [sdir for sdir in config.SHARED_STORAGE if
                                 sdir['name'] == ss]
            selected_dir = selected_dir_list[0] if len(
                selected_dir_list) == 1 else None

            if selected_dir and selected_dir['restricted_access'] and \
                    not current_user.has_role("Administrator"):
                raise PermissionError(ACCESS_DENIED_MESSAGE)

    def rename(self, old=None, new=None):
        """
        Rename file or folder
        """
        if not self.validate_request('rename'):
            return unauthorized(self.ERROR_NOT_ALLOWED['Error'])

        if self.shared_dir:
            the_dir = self.shared_dir
        else:
            the_dir = self.dir if self.dir is not None else ''

        # check if it's dir
        if old[-1] == '/':
            old = old[:-1]

        # extract filename
        oldname = split_path(old)[-1]
        path = old
        path = split_path(path)[0]  # extract path

        if path[-1] != '/':
            path += '/'

        newname = new
        newpath = path + newname

        # Check the paths that are renamed: the new name is relative to the
        # old one's directory, not to the storage directory.
        oldpath_sys = Filemanager.check_access_permission(the_dir, old)
        newpath_sys = Filemanager.check_access_permission(the_dir, newpath)

        try:
            _rename_beneath(oldpath_sys, newpath_sys, the_dir)
        except OSError as e:
            if _acts_beneath() and _is_nofollow_refusal(e):
                return internal_server_error(gettext(
                    "Refusing to rename through a symbolic link."))
            return internal_server_error("{0} {1}".format(
                gettext('There was an error renaming the file:'), e.strerror))

        return {
            'Old Path': old,
            'Old Name': oldname,
            'New Path': newpath,
            'New Name': newname,
        }

    def delete(self, path=None):
        """
        Delete file or folder
        """
        if not self.validate_request('delete'):
            return unauthorized(self.ERROR_NOT_ALLOWED['Error'])
        if self.shared_dir:
            the_dir = self.shared_dir
        else:
            the_dir = self.dir if self.dir is not None else ''
        orig_path = Filemanager.check_access_permission(the_dir, path)

        # The storage directory itself lies "inside" it for the check, but
        # is not the user's to delete.
        if config.SERVER_MODE and \
                os.path.realpath(orig_path) == os.path.realpath(the_dir):
            raise PermissionError(gettext("Access denied ({0})").format(path))

        try:
            _remove_beneath(orig_path, the_dir)
        except OSError as e:
            if _acts_beneath() and _is_nofollow_refusal(e):
                return internal_server_error(gettext(
                    "Refusing to delete through a symbolic link."))
            return internal_server_error("{0} {1}".format(
                gettext('There was an error deleting the file:'), e.strerror))

        return make_json_response(status=200)

    def add(self, req=None):
        """
        File upload functionality
        """
        if not self.validate_request('upload'):
            return unauthorized(self.ERROR_NOT_ALLOWED['Error'])

        if self.shared_dir:
            the_dir = self.shared_dir
        else:
            the_dir = self.dir if self.dir is not None else ''

        try:
            path = req.form.get('currentpath')

            file_obj = req.files['newfile']
            file_name = file_obj.filename
            # Check the new file's path is inside the user's storage
            # directory, and write to the path that was checked.
            try:
                new_name = Filemanager.check_access_permission(
                    the_dir, "{0}{1}".format(path, file_name))
            except PermissionError:
                return unauthorized(self.ERROR_NOT_ALLOWED['Error'])

            with _open_upload_target(new_name, the_dir) as f:
                while True:
                    # 4MB chunk (4 * 1024 * 1024 Bytes)
                    data = file_obj.read(4194304)
                    if not data:
                        break
                    f.write(data)
        except OSError as e:
            return internal_server_error("{0} {1}".format(
                gettext('There was an error adding the file:'), e.strerror))

        return {
            'Path': path,
            # new_name is prefixed with the_dir (the user's absolute storage
            # directory); return the storage-relative path instead so the
            # response never leaks the real on-disk location.
            'Name': "{0}{1}".format(path, file_name),
        }

    def is_file_exist(self, path, name):
        """
        Checks whether given file exists or not
        """
        if self.shared_dir:
            the_dir = self.shared_dir
        else:
            the_dir = self.dir if self.dir is not None else ''
        code = 1

        name = unquote(name)
        path = unquote(path)

        new_name = Filemanager.check_access_permission(
            the_dir, "{}{}".format(path, name))
        if not os.path.exists(new_name):
            code = 0

        return {
            'Path': path,
            'Name': name,
            'Code': code,
        }

    @staticmethod
    def get_new_name(in_dir, path, name):
        """
        Utility to provide new name for folder if file
        with same name already exists
        """
        new_name = name
        count = 0
        while True:
            if not (path.endswith("/") or name.startswith("/")):
                path = path + "/"
            file_path = "{}{}/".format(path, new_name)
            create_path = file_path
            if in_dir != "":
                create_path = TWO_PARAM_STRING.format(in_dir, file_path)

            if not path_exists(create_path):
                return create_path, file_path, new_name
            else:
                count += 1
                new_name = "{}_{}".format(name, count)

    @staticmethod
    def remember_file_encoding(filename, enc):
        """Record the encoding a file was read with."""
        Filemanager.loaded_file_encodings[os.path.realpath(filename)] = enc

    @staticmethod
    def get_file_encoding(filename, default='utf-8'):
        """Return the encoding a file was read with, or the default."""
        return Filemanager.loaded_file_encodings.get(
            os.path.realpath(filename), default)

    @staticmethod
    def check_file_for_bom_and_binary(filename, enc="utf-8", root=None):
        """
        This utility function will check if file is Binary file
        and/or if it startswith BOM character

        Args:
            filename: File
            enc: Encoding for the file
            root: The storage directory `filename` was checked against, if
                any; the file is then opened with `_open_read_target()`

        Returns:
            Status(Error?), Error message, Binary file flag,
            BOM character flag and Encoding to open file
        """
        status = True
        err_msg = None
        is_startswith_bom = False
        is_binary = False

        # check if file type is text or binary
        text_chars = bytearray([7, 8, 9, 10, 12, 13, 27]) \
            + bytearray(range(0x20, 0x7f)) \
            + bytearray(range(0x80, 0x100))

        def is_binary_string(bytes_data):
            """Checks if string data is binary"""
            return bool(
                bytes_data.translate(None, text_chars)
            )

        # read the file
        try:

            with (open(filename, 'rb') if root is None
                  else _open_read_target(filename, root)) as f:
                file_data = f.read(1024)

            # Check for BOM in file data
            for encoding, boms in \
                    ('utf-8-sig', (codecs.BOM_UTF8,)), \
                    ('utf-16', (codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE)), \
                    ('utf-32', (codecs.BOM_UTF32_LE, codecs.BOM_UTF32_BE)):
                if any(file_data.startswith(bom) for bom in boms):
                    is_startswith_bom = True
                    enc = encoding

            # No need to check for binary file, a BOM marker already
            # indicates that text stream afterwards
            if not is_startswith_bom:
                # Check if string is binary
                is_binary = is_binary_string(file_data)

            # Store encoding for future use
            Filemanager.remember_file_encoding(filename, enc)

        except IOError as ex:
            # we don't want to expose real path of file
            # so only show error message. Callers unpack the result, so
            # report the failure in it rather than returning a response.
            status = False
            if root is not None and _refuses_leaf_symlinks() and \
                    _is_nofollow_refusal(ex):
                err_msg = gettext("Refusing to read through a symbolic link.")
            else:
                err_msg = str(ex.strerror)

        except Exception as ex:
            status = False
            err_msg = str(getattr(ex, 'strerror', None) or ex)

        # Remove root storage path from error message
        # when running in Server mode
        if not status and not current_app.PGADMIN_RUNTIME:
            storage_directory = get_storage_directory()
            if storage_directory:
                err_msg = err_msg.replace(storage_directory, '')

        return status, err_msg, is_binary, is_startswith_bom, enc

    def addfolder(self, path, name):
        """
        Functionality to create new folder
        """
        if not self.validate_request('create'):
            return unauthorized(self.ERROR_NOT_ALLOWED['Error'])

        if self.shared_dir and len(config.SHARED_STORAGE) > 0:
            user_dir = self.shared_dir
        else:
            user_dir = self.dir if self.dir is not None else ''

        # Check the folder that will be created: get_new_name() puts a
        # separator between `path` and `name` that a check of the two
        # joined as they are would not see.
        Filemanager.check_access_permission(user_dir, "{}/{}".format(
            path, name))
        create_path, new_path, new_name = \
            self.get_new_name(user_dir, path, name)
        create_path = Filemanager.check_access_permission(user_dir, new_path)
        try:
            os.mkdir(create_path)
        except OSError as e:
            return internal_server_error(str(e.strerror))

        result = {
            'Parent': path,
            'Path': new_path,
            'Name': new_name,
            'Date Modified': time.ctime(time.time())
        }

        return result

    def download(self, path=None):
        """
        Functionality to download file
        """
        if not self.validate_request('download'):
            return unauthorized(self.ERROR_NOT_ALLOWED['Error'])

        if self.shared_dir and len(config.SHARED_STORAGE) > 0:
            the_dir = self.shared_dir
        else:
            the_dir = self.dir if self.dir is not None else ''

        # Open the path that was checked without following a symbolic link
        # swapped in since the check.
        orig_path = Filemanager.check_access_permission(the_dir, path)

        filename = os.path.basename(path)
        try:
            download_file = _open_read_target(orig_path, the_dir)
        except FileNotFoundError:
            return make_json_response(
                status=404,
                errormsg=gettext("'{0}' file does not exist.").format(path))
        except OSError as e:
            if _refuses_leaf_symlinks() and \
                    _is_nofollow_refusal(e):
                return internal_server_error(errormsg=gettext(
                    "Refusing to read through a symbolic link."))
            return internal_server_error(errormsg=e.strerror)

        # A file object gives send_file() no size or modification time, so
        # set them from the descriptor; range requests are not offered.
        st = os.fstat(download_file.fileno())
        response = send_file(download_file,
                             mimetype='application/octet-stream',
                             as_attachment=True, download_name=filename,
                             conditional=False, etag=False,
                             last_modified=st.st_mtime)
        response.content_length = st.st_size
        response.headers["filename"] = filename

        return response

    def permission(self, path=None):
        if self.shared_dir:
            the_dir = self.shared_dir
        else:
            the_dir = self.dir if self.dir is not None else ''
        res = {'Code': 1}
        Filemanager.check_access_permission(the_dir, path)
        return res


@blueprint.route(
    "/filemanager/<int:trans_id>/",
    methods=["POST"], endpoint='filemanager'
)
@pga_login_required
def file_manager(trans_id):
    """
    It is the common function for every call which is made
    and takes function name from post request and calls it.
    It gets unique transaction id from post request and
    rotate it into Filemanager class.
    """
    mode = ''
    kwargs = {}
    if req.method == 'POST':
        if req.files:
            mode = 'add'
            kwargs = {'req': req,
                      'storage_folder': req.form.get('storage_folder', None)}
        else:
            kwargs = json.loads(req.data)
            kwargs['req'] = req
            mode = kwargs['mode']
            del kwargs['mode']
    elif req.method == 'GET':
        kwargs = {
            'path': req.args['path'],
            'name': req.args['name'] if 'name' in req.args else ''
        }
        mode = req.args['mode']
    ss = kwargs['storage_folder'] if 'storage_folder' in kwargs else None
    my_fm = Filemanager(trans_id, ss)

    if ss and mode in ['upload', 'rename', 'delete', 'addfolder', 'add',
                       'permission']:
        my_fm.check_access(ss)
    func = getattr(my_fm, mode)
    try:
        if mode in ['getfolder', 'download']:
            kwargs.pop('name', None)

        if mode in ['add']:
            kwargs.pop('storage_folder', None)

        if mode in ['addfolder', 'getfolder', 'rename', 'delete',
                    'is_file_exist', 'req', 'permission', 'download']:
            kwargs.pop('req', None)
            kwargs.pop('storage_folder', None)

        res = func(**kwargs)
    except PermissionError as e:
        return unauthorized(str(e))

    if isinstance(res, Response):
        return res
    return make_json_response(data={'result': res, 'status': True})
