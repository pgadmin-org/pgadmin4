##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements File Manager"""

import os
import os.path
import random
import string
import time
from urllib.parse import unquote
from sys import platform as _platform
import config
import codecs
import pathlib
from werkzeug.exceptions import InternalServerError

import simplejson as json
from flask import render_template, Response, session, request as req, \
    url_for, current_app, send_from_directory
from flask_babelex import gettext
from flask_security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils import get_storage_directory
from pgadmin.utils.ajax import make_json_response
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.constants import PREF_LABEL_OPTIONS, MIMETYPE_APP_JS

# Checks if platform is Windows
if _platform == "win32":
    import ctypes
    oldmode = ctypes.c_uint()
    kernel32 = ctypes.WinDLL('kernel32')
    SEM_FAILCRITICALERRORS = 1
    SEM_NOOPENFILEERRORBOX = 0x8000
    SEM_FAIL = SEM_NOOPENFILEERRORBOX | SEM_FAILCRITICALERRORS
    file_root = ""

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

    def get_own_javascripts(self):
        return [
            {
                'name': 'pgadmin.file_manager',
                'path': url_for('file_manager.index') + 'file_manager',
                'when': None
            },
        ]

    def get_own_stylesheets(self):
        return [
            url_for('static', filename='vendor/jquery.dropzone/dropzone.css')
        ]

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
            'file_manager.filemanager',
            'file_manager.index',
            'file_manager.get_trans_id',
            'file_manager.delete_trans_id',
            'file_manager.save_last_dir',
            'file_manager.save_file_dialog_view',
            'file_manager.save_show_hidden_file_option'
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
        self.file_dialog_view = self.preference.register(
            'options', 'file_dialog_view',
            gettext("File dialog view"), 'options', 'list',
            category_label=PREF_LABEL_OPTIONS,
            options=[{'label': gettext('List'), 'value': 'list'},
                     {'label': gettext('Grid'), 'value': 'grid'}]
        )
        self.show_hidden_files = self.preference.register(
            'options', 'show_hidden_files',
            gettext("Show hidden files and folders?"), 'boolean', False,
            category_label=PREF_LABEL_OPTIONS
        )


# Initialise the module
blueprint = FileManagerModule(MODULE_NAME, __name__)


@blueprint.route("/", endpoint='index')
@login_required
def index():
    """Render the preferences dialog."""
    return render_template(
        MODULE_NAME + "/index.html", _=gettext)


@blueprint.route("/utility.js")
@login_required
def utility():
    """render the required javascript"""
    return Response(response=render_template(
        "file_manager/js/utility.js", _=gettext),
        status=200,
        mimetype=MIMETYPE_APP_JS)


@blueprint.route("/file_manager.js")
@login_required
def file_manager_js():
    """render the required javascript"""
    return Response(response=render_template(
        "file_manager/js/file_manager.js", _=gettext),
        status=200,
        mimetype=MIMETYPE_APP_JS)


@blueprint.route("/en.json")
@login_required
def language():
    """render the required javascript"""
    return Response(response=render_template(
        "file_manager/js/languages/en.json", _=gettext),
        status=200)


@blueprint.route("/file_manager_config.js")
@login_required
def file_manager_config_js():
    """render the required javascript"""
    return Response(response=render_template(
        "file_manager/js/file_manager_config.js", _=gettext),
        status=200,
        mimetype=MIMETYPE_APP_JS)


@blueprint.route("/<int:trans_id>/file_manager_config.json")
@login_required
def file_manager_config(trans_id):
    """render the required json"""
    data = Filemanager.get_trasaction_selection(trans_id)
    pref = Preferences.module('file_manager')
    file_dialog_view = pref.preference('file_dialog_view').get()
    show_hidden_files = pref.preference('show_hidden_files').get()

    return Response(response=render_template(
        "file_manager/js/file_manager_config.json",
        _=gettext,
        data=data,
        file_dialog_view=file_dialog_view,
        show_hidden_files=show_hidden_files
    ),
        status=200,
        mimetype="application/json"
    )


@blueprint.route(
    "/get_trans_id", methods=["GET", "POST"], endpoint='get_trans_id'
)
@login_required
def get_trans_id():
    if len(req.data) != 0:
        configs = json.loads(req.data)
        trans_id = Filemanager.create_new_transaction(configs)
        global transid
        transid = trans_id
    return make_json_response(
        data={'fileTransId': transid, 'status': True}
    )


@blueprint.route(
    "/del_trans_id/<int:trans_id>",
    methods=["GET", "POST"], endpoint='delete_trans_id'
)
@login_required
def delete_trans_id(trans_id):
    Filemanager.release_transaction(trans_id)
    return make_json_response(
        data={'status': True}
    )


@blueprint.route(
    "/save_last_dir/<int:trans_id>", methods=["POST"], endpoint='save_last_dir'
)
@login_required
def save_last_directory_visited(trans_id):
    blueprint.last_directory_visited.set(req.json['path'])
    return make_json_response(
        data={'status': True}
    )


@blueprint.route(
    "/save_file_dialog_view/<int:trans_id>", methods=["POST"],
    endpoint='save_file_dialog_view'
)
@login_required
def save_file_dialog_view(trans_id):
    blueprint.file_dialog_view.set(req.json['view'])
    return make_json_response(
        data={'status': True}
    )


@blueprint.route(
    "/save_show_hidden_file_option/<int:trans_id>", methods=["PUT"],
    endpoint='save_show_hidden_file_option'
)
@login_required
def save_show_hidden_file_option(trans_id):
    blueprint.show_hidden_files.set(req.json['show_hidden'])
    return make_json_response(
        data={'status': True}
    )


class Filemanager(object):
    """FileManager Class."""

    # Stores list of dict for filename & its encoding
    loaded_file_encoding_list = []

    ERROR_NOT_ALLOWED = {
        'Error': gettext('Not allowed'),
        'Code': 0
    }

    def __init__(self, trans_id):
        self.trans_id = trans_id
        self.patherror = encode_json(
            {
                'Error': gettext(
                    'No permission to operate on specified path.'
                ),
                'Code': 0
            }
        )
        self.dir = get_storage_directory()

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
        while last_dir:
            if os.path.exists(storage_dir or '' + last_dir):
                break
            index = max(last_dir.rfind('\\'), last_dir.rfind('/')) \
                if _platform == 'win32' else last_dir.rfind('/')
            last_dir = last_dir[0:index]

        if _platform == 'win32':
            if not last_dir.endswith('\\'):
                last_dir += "\\"

            return last_dir

        if not last_dir.endswith('/'):
            last_dir += "/"

        return last_dir

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

        # tuples with (capabilities, files_only, folders_only, title)
        capability_map = {
            'select_file': (
                ['select_file', 'rename', 'upload', 'create'],
                True,
                False,
                gettext("Select File")
            ),
            'select_folder': (
                ['select_folder', 'rename', 'create'],
                False,
                True,
                gettext("Select Folder")
            ),
            'create_file': (
                ['select_file', 'rename', 'create'],
                True,
                False,
                gettext("Create File")
            ),
            'storage_dialog': (
                ['select_folder', 'select_file', 'download',
                 'rename', 'delete', 'upload', 'create'],
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
        last_dir = blueprint.last_directory_visited.get()
        check_dir_exists = False
        if last_dir is None:
            last_dir = "/"
        else:
            check_dir_exists = True

        if not config.SERVER_MODE and last_dir == "/" or last_dir == "/":
            last_dir = homedir

        if check_dir_exists:
            last_dir = Filemanager.get_closest_parent(storage_dir, last_dir)

        # create configs using above configs
        configs = {
            # for JS json compatibility
            "fileroot": last_dir.replace('\\', '\\\\'),
            "homedir": homedir.replace('\\', '\\\\'),
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
        trans_id = str(random.randint(1, 9999999))

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
            return make_json_response(data={'status': True})

        # Remove the information of unique transaction id
        # from the session variable.
        file_manager_data.pop(str(trans_id), None)
        session['fileManagerData'] = file_manager_data

        return make_json_response(data={'status': True})

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
        # StackOverflow Ref: https://goo.gl/9gYdef
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
        files = {}

        for f in sorted(os.listdir(orig_path)):
            system_path = os.path.join(os.path.join(orig_path, f))

            # continue if file/folder is hidden (based on user preference)
            if not show_hidden_files and is_folder_hidden(system_path):
                continue

            user_path = os.path.join(os.path.join(user_dir, f))
            created = time.ctime(os.path.getctime(system_path))
            modified = time.ctime(os.path.getmtime(system_path))
            file_extension = str(splitext(system_path))

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
                user_path = "{0}/".format(user_path)
            # filter files based on file_type
            elif Filemanager._skip_file_extension(
                    file_type, supported_types, folders_only, file_extension):
                continue

            # create a list of files and folders
            files[f] = {
                "Filename": f,
                "Path": user_path,
                "file_type": file_extension,
                "Protected": protected,
                "Properties": {
                    "Date Created": created,
                    "Date Modified": modified,
                    "Size": sizeof_fmt(getsize(system_path))
                }
            }

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

        try:
            Filemanager.check_access_permission(in_dir, path)
        except Exception as e:
            Filemanager.resume_windows_warning()
            files = {
                'Code': 0,
                'Error': str(e)
            }
            return files

        files = {}
        if (_platform == "win32" and (path == '/' or path == '\\'))\
                and in_dir is None:
            drives = Filemanager._get_drives_with_size()
            for drive, drive_size in drives:
                path = file_name = "{0}:".format(drive)
                files[file_name] = {
                    "Filename": file_name,
                    "Path": path,
                    "file_type": 'drive',
                    "Protected": 1 if drive_size == 0 else 0,
                    "Properties": {
                        "Date Created": "",
                        "Date Modified": "",
                        "Size": drive_size
                    }
                }
            Filemanager.resume_windows_warning()
            return files

        orig_path = Filemanager.get_abs_path(in_dir, path)

        if not path_exists(orig_path):
            Filemanager.resume_windows_warning()
            return {
                'Code': 0,
                'Error': gettext("'{0}' file does not exist.").format(path)
            }

        user_dir = path
        folders_only = trans_data.get('folders_only', '')
        files_only = trans_data.get('files_only', '')
        supported_types = trans_data.get('supported_types', [])

        orig_path = unquote(orig_path)
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

            files = {
                'Code': 0,
                'Error': err_msg
            }
        Filemanager.resume_windows_warning()
        return files

    @staticmethod
    def check_access_permission(in_dir, path):
        if not config.SERVER_MODE:
            return

        in_dir = '' if in_dir is None else in_dir
        orig_path = Filemanager.get_abs_path(in_dir, path)

        # This translates path with relative path notations
        # like ./ and ../ to absolute path.
        orig_path = os.path.abspath(orig_path)

        if in_dir:
            if _platform == 'win32':
                if in_dir[-1] == '\\' or in_dir[-1] == '/':
                    in_dir = in_dir[:-1]
            else:
                if in_dir[-1] == '/':
                    in_dir = in_dir[:-1]

        # Do not allow user to access outside his storage dir
        # in server mode.
        if not orig_path.startswith(in_dir):
            raise InternalServerError(
                gettext("Access denied ({0})").format(path))

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
                return "{}/{}".format(in_dir, path)
        else:
            if path.startswith('/') or path.startswith('\\'):
                return "{}{}".format(in_dir, path)
            else:
                return "{}/{}".format(in_dir, path)

    def validate_request(self, capability):
        """
        It validates the capability with the capabilities
        stored in the session
        """
        trans_data = Filemanager.get_trasaction_selection(self.trans_id)
        return False if capability not in trans_data['capabilities'] else True

    def getinfo(self, path=None, get_size=True, name=None, req=None):
        """
        Returns a JSON object containing information
        about the given file.
        """
        date_created = 'Date Created'
        date_modified = 'Date Modified'
        path = unquote(path)
        if self.dir is None:
            self.dir = ""
        orig_path = "{0}{1}".format(self.dir, path)

        try:
            Filemanager.check_access_permission(self.dir, path)
        except Exception as e:
            thefile = {
                'Filename': split_path(path)[-1],
                'FileType': '',
                'Path': path,
                'Error': str(e),
                'Code': 0,
                'Info': '',
                'Properties': {
                    date_created: '',
                    date_modified: '',
                    'Width': '',
                    'Height': '',
                    'Size': ''
                }
            }
            return thefile

        user_dir = path
        thefile = {
            'Filename': split_path(orig_path)[-1],
            'FileType': '',
            'Path': user_dir,
            'Error': '',
            'Code': 1,
            'Info': '',
            'Properties': {
                date_created: '',
                date_modified: '',
                'Width': '',
                'Height': '',
                'Size': ''
            }
        }

        if not path_exists(orig_path):
            thefile['Error'] = gettext(
                "'{0}' file does not exist.").format(path)
            thefile['Code'] = -1
            return thefile

        if split_path(user_dir)[-1] == '/'\
                or os.path.isfile(orig_path) is False:
            thefile['FileType'] = 'Directory'
        else:
            thefile['FileType'] = splitext(user_dir)

        created = time.ctime(os.path.getctime(orig_path))
        modified = time.ctime(os.path.getmtime(orig_path))

        thefile['Properties'][date_created] = created
        thefile['Properties'][date_modified] = modified
        thefile['Properties']['Size'] = sizeof_fmt(getsize(orig_path))

        return thefile

    def getfolder(self, path=None, file_type="", name=None, req=None,
                  show_hidden=False):
        """
        Returns files and folders in give path
        """
        trans_data = Filemanager.get_trasaction_selection(self.trans_id)
        the_dir = None
        if config.SERVER_MODE:
            the_dir = self.dir
            if the_dir is not None and not the_dir.endswith('/'):
                the_dir += '/'

        filelist = self.list_filesystem(
            the_dir, path, trans_data, file_type, show_hidden)
        return filelist

    def rename(self, old=None, new=None, req=None):
        """
        Rename file or folder
        """
        if not self.validate_request('rename'):
            return self.ERROR_NOT_ALLOWED

        the_dir = self.dir if self.dir is not None else ''

        try:
            Filemanager.check_access_permission(the_dir, old)
            Filemanager.check_access_permission(the_dir, new)
        except Exception as e:
            res = {
                'Error': str(e),
                'Code': 0
            }
            return res

        # check if it's dir
        if old[-1] == '/':
            old = old[:-1]

        # extract filename
        oldname = split_path(old)[-1]
        path = old
        path = split_path(path)[0]  # extract path

        if not path[-1] == '/':
            path += '/'

        newname = new
        newpath = path + newname

        # make system old path
        oldpath_sys = "{0}{1}".format(the_dir, old)
        newpath_sys = "{0}{1}".format(the_dir, newpath)

        error_msg = gettext('Renamed successfully.')
        code = 1
        try:
            os.rename(oldpath_sys, newpath_sys)
        except Exception as e:
            code = 0
            error_msg = "{0} {1}".format(
                gettext('There was an error renaming the file:'), e)

        result = {
            'Old Path': old,
            'Old Name': oldname,
            'New Path': newpath,
            'New Name': newname,
            'Error': error_msg,
            'Code': code
        }

        return result

    def delete(self, path=None, req=None):
        """
        Delete file or folder
        """
        if not self.validate_request('delete'):
            return self.ERROR_NOT_ALLOWED

        the_dir = self.dir if self.dir is not None else ''
        orig_path = "{0}{1}".format(the_dir, path)

        try:
            Filemanager.check_access_permission(the_dir, path)
        except Exception as e:
            res = {
                'Error': str(e),
                'Code': 0
            }
            return res

        err_msg = ''
        code = 1
        try:
            if os.path.isdir(orig_path):
                os.rmdir(orig_path)
            else:
                os.remove(orig_path)
        except Exception as e:
            code = 0
            err_msg = str(e.strerror)

        result = {
            'Path': path,
            'Error': err_msg,
            'Code': code
        }

        return result

    def add(self, req=None):
        """
        File upload functionality
        """
        if not self.validate_request('upload'):
            return self.ERROR_NOT_ALLOWED

        the_dir = self.dir if self.dir is not None else ''
        err_msg = ''
        code = 1
        try:
            path = req.form.get('currentpath')

            file_obj = req.files['newfile']
            file_name = file_obj.filename
            orig_path = "{0}{1}".format(the_dir, path)
            new_name = "{0}{1}".format(orig_path, file_name)

            try:
                # Check if the new file is inside the users directory
                pathlib.Path(new_name).relative_to(the_dir)
            except ValueError as _:
                return self.ERROR_NOT_ALLOWED

            with open(new_name, 'wb') as f:
                while True:
                    # 4MB chunk (4 * 1024 * 1024 Bytes)
                    data = file_obj.read(4194304)
                    if not data:
                        break
                    f.write(data)
        except Exception as e:
            code = 0
            err_msg = str(e.strerror) if hasattr(e, 'strerror') else str(e)

        try:
            Filemanager.check_access_permission(the_dir, path)
        except Exception as e:
            res = {
                'Error': str(e),
                'Code': 0
            }
            return res

        result = {
            'Path': path,
            'Name': new_name,
            'Error': err_msg,
            'Code': code
        }
        return result

    def is_file_exist(self, path, name, req=None):
        """
        Checks whether given file exists or not
        """
        the_dir = self.dir if self.dir is not None else ''
        err_msg = ''
        code = 1

        name = unquote(name)
        path = unquote(path)
        try:
            orig_path = "{0}{1}".format(the_dir, path)
            Filemanager.check_access_permission(
                the_dir, "{}{}".format(path, name))

            new_name = "{0}{1}".format(orig_path, name)
            if not os.path.exists(new_name):
                code = 0
        except Exception as e:
            code = 0
            if hasattr(e, 'strerror'):
                err_msg = str(e.strerror)
            else:
                err_msg = str(e)

        result = {
            'Path': path,
            'Name': name,
            'Error': err_msg,
            'Code': code
        }

        return result

    @staticmethod
    def get_new_name(in_dir, path, new_name, count=1):
        """
        Utility to provide new name for folder if file
        with same name already exists
        """
        last_char = new_name[-1]
        t_new_path = "{}/{}{}_{}".format(in_dir, path, new_name, count)
        if last_char == 'r' and not path_exists(t_new_path):
            return t_new_path, new_name
        else:
            last_char = int(t_new_path[-1]) + 1
            new_path = "{}/{}{}_{}".format(in_dir, path, new_name, last_char)
            if path_exists(new_path):
                count += 1
                return Filemanager.get_new_name(in_dir, path, new_name, count)
            else:
                return new_path, new_name

    @staticmethod
    def check_file_for_bom_and_binary(filename, enc="utf-8"):
        """
        This utility function will check if file is Binary file
        and/or if it startswith BOM character

        Args:
            filename: File
            enc: Encoding for the file

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

            with open(filename, 'rb') as f:
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
            Filemanager.loaded_file_encoding_list.\
                append({os.path.basename(filename): enc})

        except IOError as ex:
            status = False
            # we don't want to expose real path of file
            # so only show error message.
            if ex.strerror == 'Permission denied':
                err_msg = str(ex.strerror)
            else:
                err_msg = str(ex)

        except Exception as ex:
            status = False
            err_msg = str(ex)

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
            return self.ERROR_NOT_ALLOWED

        the_dir = self.dir if self.dir is not None else ''

        try:
            Filemanager.check_access_permission(the_dir, "{}{}".format(
                path, name))
        except Exception as e:
            res = {
                'Error': str(e),
                'Code': 0
            }
            return res

        if the_dir != "":
            new_path = "{}/{}{}/".format(the_dir, path, name)
        else:
            new_path = "{}{}/".format(path, name)

        err_msg = ''
        code = 1
        new_name = name
        if not path_exists(new_path):
            try:
                os.mkdir(new_path)
            except Exception as e:
                code = 0
                err_msg = str(e.strerror)
        else:
            new_path, new_name = self.get_new_name(the_dir, path, name)
            try:
                os.mkdir(new_path)
            except Exception as e:
                code = 0
                err_msg = str(e.strerror)

        result = {
            'Parent': path,
            'Name': new_name,
            'Error': err_msg,
            'Code': code
        }

        return result

    def download(self, path=None, name=None, req=None):
        """
        Functionality to download file
        """
        if not self.validate_request('download'):
            return self.ERROR_NOT_ALLOWED

        the_dir = self.dir if self.dir is not None else ''
        orig_path = "{0}{1}".format(the_dir, path)

        try:
            Filemanager.check_access_permission(
                the_dir, "{}{}".format(path, path)
            )
        except Exception as e:
            resp = Response(str(e))
            resp.headers['Content-Disposition'] = \
                'attachment; filename=' + name
            return resp

        name = os.path.basename(path)
        if orig_path and len(orig_path) > 0:
            dir_path = os.path.dirname(orig_path)
        else:
            dir_path = os.path.dirname(path)

        response = send_from_directory(dir_path, name, as_attachment=True)
        response.headers["filename"] = name

        return response

    def permission(self, path=None, req=None):
        the_dir = self.dir if self.dir is not None else ''
        res = {'Code': 1}
        try:
            Filemanager.check_access_permission(the_dir, path)
        except Exception as e:
            err_msg = str(e)
            res['Code'] = 0
            res['Error'] = err_msg
        return res


@blueprint.route(
    "/filemanager/<int:trans_id>/",
    methods=["GET", "POST"], endpoint='filemanager'
)
@login_required
def file_manager(trans_id):
    """
    It is the common function for every call which is made
    and takes function name from post request and calls it.
    It gets unique transaction id from post request and
    rotate it into Filemanager class.
    """
    my_fm = Filemanager(trans_id)
    mode = ''
    kwargs = {}
    if req.method == 'POST':
        if req.files:
            mode = 'add'
            kwargs = {'req': req}
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

    try:
        func = getattr(my_fm, mode)
        res = func(**kwargs)
        return make_json_response(data={'result': res, 'status': True})
    except Exception:
        return getattr(my_fm, mode)(**kwargs)
