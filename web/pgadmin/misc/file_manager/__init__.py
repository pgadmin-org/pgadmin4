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
import sys
import time
from sys import platform as _platform
import config
import codecs

import simplejson as json
from flask import render_template, Response, session, request as req, \
    url_for, current_app
from flask_babelex import gettext
from flask_security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils import get_storage_directory
from pgadmin.utils.ajax import make_json_response
from pgadmin.utils.preferences import Preferences

# Checks if platform is Windows
if _platform == "win32":
    import ctypes
    oldmode = ctypes.c_uint()
    kernel32 = ctypes.WinDLL('kernel32')
    SEM_FAILCRITICALERRORS = 1
    SEM_NOOPENFILEERRORBOX = 0x8000
    SEM_FAIL = SEM_NOOPENFILEERRORBOX | SEM_FAILCRITICALERRORS
    file_root = ""

# uppercase supported in py2, ascii_uppercase supported in py3
try:
    letters = string.uppercase
except Exception:
    letters = string.ascii_uppercase

# import unquote from urlib for python2.x and python3.x
try:
    from urllib import unquote
except Exception as e:
    from urllib.parse import unquote

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
    return False


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
            category_label=gettext('Options')
        )
        self.last_directory_visited = self.preference.register(
            'options', 'last_directory_visited',
            gettext("Last directory visited"), 'text', '/',
            category_label=gettext('Options')
        )
        self.file_dialog_view = self.preference.register(
            'options', 'file_dialog_view',
            gettext("File dialog view"), 'options', 'list',
            category_label=gettext('Options'),
            options=[{'label': gettext('List'), 'value': 'list'},
                     {'label': gettext('Grid'), 'value': 'grid'}]
        )
        self.show_hidden_files = self.preference.register(
            'options', 'show_hidden_files',
            gettext("Show hidden files and folders?"), 'boolean', False,
            category_label=gettext('Options')
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
        mimetype="application/javascript")


@blueprint.route("/file_manager.js")
@login_required
def file_manager_js():
    """render the required javascript"""
    return Response(response=render_template(
        "file_manager/js/file_manager.js", _=gettext),
        status=200,
        mimetype="application/javascript")


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
        mimetype="application/javascript")


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
        supp_types = allow_upload_files = params['supported_types'] \
            if 'supported_types' in params else []
        if fm_type == 'select_file':
            capabilities = ['select_file', 'rename', 'upload', 'create']
            files_only = True
            folders_only = False
            title = gettext("Select File")
        elif fm_type == 'select_folder':
            capabilities = ['select_folder', 'rename', 'create']
            files_only = False
            folders_only = True
            title = gettext("Select Folder")
        elif fm_type == 'create_file':
            capabilities = ['select_file', 'rename', 'create']
            files_only = True
            folders_only = False
            title = gettext("Create File")
        elif fm_type == 'storage_dialog':
            capabilities = ['select_folder', 'select_file', 'download',
                            'rename', 'delete', 'upload', 'create']
            files_only = True
            folders_only = False
            title = gettext("Storage Manager")

        # Using os.path.join to make sure we have trailing '/' or '\'
        homedir = '/' if (config.SERVER_MODE) \
            else os.path.join(os.path.expanduser('~'), '')

        # get last visited directory, if not present then traverse in reverse
        # order to find closest parent directory
        last_dir = blueprint.last_directory_visited.get()
        check_dir_exists = False
        if storage_dir is None:
            if last_dir is None:
                last_dir = "/"
            else:
                check_dir_exists = True
        else:
            if last_dir is not None:
                check_dir_exists = True
            else:
                last_dir = u"/"

        if not config.SERVER_MODE and last_dir == u"/" or last_dir == "/":
            last_dir = homedir

        if check_dir_exists:
            if len(last_dir) > 1 and \
                    (last_dir.endswith('/') or last_dir.endswith('\\')):
                last_dir = last_dir[:-1]
            while last_dir:
                if os.path.exists(
                        storage_dir
                        if storage_dir is not None else '' + last_dir):
                    break
                if _platform == 'win32':
                    index = max(last_dir.rfind('\\'), last_dir.rfind('/'))
                else:
                    index = last_dir.rfind('/')
                last_dir = last_dir[0:index]
            if not last_dir:
                last_dir = u"/"

            if _platform == 'win32':
                if not (last_dir.endswith('\\') or last_dir.endswith('/')):
                    last_dir += u"\\"
            else:
                if not last_dir.endswith('/'):
                    last_dir += u"/"

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
    def _get_drives(drive_name=None):
        """
        This is a generic function which returns the default path for storage
        manager dialog irrespective of any Platform type to list all
        files and directories.
        Platform windows:
        if no path is given, it will list volumes, else list directory
        Platform unix:
        it returns path to root directory if no path is specified.
        """
        if _platform == "win32":
            try:
                drives = []
                bitmask = ctypes.windll.kernel32.GetLogicalDrives()
                for letter in letters:
                    if bitmask & 1:
                        drives.append(letter)
                    bitmask >>= 1
                if (drive_name != '' and drive_name is not None and
                        drive_name in drives):
                    return u"{0}{1}".format(drive_name, ':')
                else:
                    return drives  # return drives if no argument is passed
            except Exception:
                return ['C:']
        else:
            return u'/'

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
    def list_filesystem(dir, path, trans_data, file_type, show_hidden):
        """
        It lists all file and folders within the given
        directory.
        """
        Filemanager.suspend_windows_warning()
        is_show_hidden_files = show_hidden

        path = unquote(path)
        if hasattr(str, 'decode'):
            path = unquote(path).encode('utf-8').decode('utf-8')

        try:
            Filemanager.check_access_permission(dir, path)
        except Exception as e:
            Filemanager.resume_windows_warning()
            err_msg = gettext(u"Error: {0}").format(e)
            files = {
                'Code': 0,
                'Error': err_msg
            }
            return files

        files = {}
        if (_platform == "win32" and (path == '/' or path == '\\'))\
                and dir is None:
            drives = Filemanager._get_drives()
            for drive in drives:
                protected = 0
                path = file_name = u"{0}:".format(drive)
                try:
                    drive_size = getdrivesize(path)
                    drive_size_in_units = sizeof_fmt(drive_size)
                except Exception:
                    drive_size = 0
                protected = 1 if drive_size == 0 else 0
                files[file_name] = {
                    "Filename": file_name,
                    "Path": path,
                    "file_type": 'drive',
                    "Protected": protected,
                    "Properties": {
                        "Date Created": "",
                        "Date Modified": "",
                        "Size": drive_size_in_units
                    }
                }
            Filemanager.resume_windows_warning()
            return files

        orig_path = Filemanager.get_abs_path(dir, path)

        if not path_exists(orig_path):
            Filemanager.resume_windows_warning()
            return {
                'Code': 0,
                'Error': gettext(u"'{0}' file does not exist.").format(path)
            }

        user_dir = path
        folders_only = trans_data['folders_only'] \
            if 'folders_only' in trans_data else ''
        files_only = trans_data['files_only'] \
            if 'files_only' in trans_data else ''
        supported_types = trans_data['supported_types'] \
            if 'supported_types' in trans_data else []

        orig_path = unquote(orig_path)
        try:
            mylist = [x for x in sorted(os.listdir(orig_path))]
            for f in mylist:
                protected = 0
                system_path = os.path.join(os.path.join(orig_path, f))

                # continue if file/folder is hidden (based on user preference)
                if not is_show_hidden_files and \
                        (is_folder_hidden(system_path) or f.startswith('.')):
                    continue

                user_path = os.path.join(os.path.join(user_dir, f))
                created = time.ctime(os.path.getctime(system_path))
                modified = time.ctime(os.path.getmtime(system_path))
                file_extension = str(splitext(system_path))

                # set protected to 1 if no write or read permission
                if (not os.access(system_path, os.R_OK) or
                        not os.access(system_path, os.W_OK)):
                    protected = 1

                # list files only or folders only
                if os.path.isdir(system_path):
                    if files_only == 'true':
                        continue
                    file_extension = u"dir"
                    user_path = u"{0}/".format(user_path)
                else:
                    # filter files based on file_type
                    if file_type is not None and file_type != "*" and \
                        (folders_only or len(supported_types) > 0 and
                         file_extension not in supported_types or
                            file_type != file_extension):
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
        except Exception as e:
            Filemanager.resume_windows_warning()
            if (hasattr(e, 'strerror') and
                    e.strerror == gettext('Permission denied')):
                err_msg = gettext(u"Error: {0}").format(e.strerror)
            else:
                err_msg = gettext(u"Error: {0}").format(e)
            files = {
                'Code': 0,
                'Error': err_msg
            }
        Filemanager.resume_windows_warning()
        return files

    @staticmethod
    def check_access_permission(dir, path):

        if not config.SERVER_MODE:
            return True

        if dir is None:
            dir = ""
        orig_path = Filemanager.get_abs_path(dir, path)

        # This translates path with relative path notations like ./ and ../ to
        # absolute path.
        orig_path = os.path.abspath(orig_path)

        if dir:
            if _platform == 'win32':
                if dir[-1] == '\\' or dir[-1] == '/':
                    dir = dir[:-1]
            else:
                if dir[-1] == '/':
                    dir = dir[:-1]

        # Do not allow user to access outside his storage dir in server mode.
        if not orig_path.startswith(dir):
            raise Exception(
                gettext(u"Access denied ({0})").format(path))
        return True

    @staticmethod
    def get_abs_path(dir, path):

        if (path.startswith('\\\\') and _platform == 'win32')\
                or config.SERVER_MODE is False or dir is None:
            return u"{}".format(path)

        if path == '/' or path == '\\':
            if _platform == 'win32':
                if dir.endswith('\\') or dir.endswith('/'):
                    return u"{}".format(dir)
                else:
                    return u"{}{}".format(dir, '\\')
            else:
                if dir.endswith('/'):
                    return u"{}".format(dir)
                else:
                    return u"{}{}".format(dir, '/')

        if dir.endswith('/') or dir.endswith('\\'):
            if path.startswith('/') or path.startswith('\\'):
                return u"{}{}".format(dir[:-1], path)
            else:
                return u"{}/{}".format(dir, path)
        else:
            if path.startswith('/') or path.startswith('\\'):
                return u"{}{}".format(dir, path)
            else:
                return u"{}/{}".format(dir, path)

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
        path = unquote(path)
        if hasattr(str, 'decode'):
            path = unquote(path).encode('utf-8').decode('utf-8')
        if self.dir is None:
            self.dir = ""
        orig_path = u"{0}{1}".format(self.dir, path)

        try:
            Filemanager.check_access_permission(self.dir, path)
        except Exception as e:
            thefile = {
                'Filename': split_path(path)[-1],
                'FileType': '',
                'Path': path,
                'Error': gettext(u"Error: {0}").format(e),
                'Code': 0,
                'Info': '',
                'Properties': {
                    'Date Created': '',
                    'Date Modified': '',
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
                'Date Created': '',
                'Date Modified': '',
                'Width': '',
                'Height': '',
                'Size': ''
            }
        }

        if not path_exists(orig_path):
            thefile['Error'] = gettext(
                u"'{0}' file does not exist.").format(path)
            thefile['Code'] = -1
            return thefile

        if split_path(user_dir)[-1] == '/'\
                or os.path.isfile(orig_path) is False:
            thefile['FileType'] = 'Directory'
        else:
            thefile['FileType'] = splitext(user_dir)

        created = time.ctime(os.path.getctime(orig_path))
        modified = time.ctime(os.path.getmtime(orig_path))

        thefile['Properties']['Date Created'] = created
        thefile['Properties']['Date Modified'] = modified
        thefile['Properties']['Size'] = sizeof_fmt(getsize(orig_path))

        return thefile

    def getfolder(self, path=None, file_type="", name=None, req=None,
                  show_hidden=False):
        """
        Returns files and folders in give path
        """
        trans_data = Filemanager.get_trasaction_selection(self.trans_id)
        dir = None
        if config.SERVER_MODE:
            dir = self.dir
            if dir is not None and not dir.endswith('/'):
                dir += u'/'

        filelist = self.list_filesystem(
            dir, path, trans_data, file_type, show_hidden)
        return filelist

    def rename(self, old=None, new=None, req=None):
        """
        Rename file or folder
        """
        if not self.validate_request('rename'):
            return {
                'Error': gettext('Not allowed'),
                'Code': 0
            }

        dir = self.dir if self.dir is not None else ''

        try:
            Filemanager.check_access_permission(dir, old)
            Filemanager.check_access_permission(dir, new)
        except Exception as e:
            res = {
                'Error': gettext(u"Error: {0}").format(e),
                'Code': 0
            }
            return res

        # check if it's dir
        if old[-1] == '/':
            old = old[:-1]

        # extract filename
        oldname = split_path(old)[-1]
        if hasattr(str, 'decode'):
            old = old.encode('utf-8').decode('utf-8')
        path = old
        path = split_path(path)[0]  # extract path

        if not path[-1] == '/':
            path += u'/'

        newname = new
        if hasattr(str, 'decode'):
            newname = new.encode('utf-8').decode('utf-8')
        newpath = path + newname

        # make system old path
        oldpath_sys = u"{0}{1}".format(dir, old)
        newpath_sys = u"{0}{1}".format(dir, newpath)

        error_msg = gettext(u'Renamed successfully.')
        code = 1
        try:
            os.rename(oldpath_sys, newpath_sys)
        except Exception as e:
            code = 0
            error_msg = u"{0} {1}".format(
                gettext(u'There was an error renaming the file:'), e)

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
            return {
                'Error': gettext('Not allowed'),
                'Code': 0
            }

        dir = self.dir if self.dir is not None else ''
        path = path.encode(
            'utf-8').decode('utf-8') if hasattr(str, 'decode') else path
        orig_path = u"{0}{1}".format(dir, path)

        try:
            Filemanager.check_access_permission(dir, path)
        except Exception as e:
            res = {
                'Error': gettext(u"Error: {0}").format(e),
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
            err_msg = gettext(u"Error: {0}").format(e.strerror)

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
            return {
                'Error': gettext('Not allowed'),
                'Code': 0
            }

        dir = self.dir if self.dir is not None else ''
        err_msg = ''
        code = 1
        try:
            path = req.form.get('currentpath')

            file_obj = req.files['newfile']
            file_name = file_obj.filename
            if hasattr(str, 'decode'):
                path = req.form.get('currentpath').encode(
                    'utf-8').decode('utf-8')
                file_name = file_obj.filename.encode('utf-8').decode('utf-8')
            orig_path = u"{0}{1}".format(dir, path)
            new_name = u"{0}{1}".format(orig_path, file_name)

            with open(new_name, 'wb') as f:
                while True:
                    # 4MB chunk (4 * 1024 * 1024 Bytes)
                    data = file_obj.read(4194304)
                    if not data:
                        break
                    f.write(data)
        except Exception as e:
            code = 0
            err_msg = gettext(u"Error: {0}").format(
                e.strerror if hasattr(e, 'strerror') else gettext(u'Unknown'))

        try:
            Filemanager.check_access_permission(dir, path)
        except Exception as e:
            res = {
                'Error': gettext(u"Error: {0}").format(e),
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
        dir = self.dir if self.dir is not None else ''
        err_msg = ''
        code = 1

        name = unquote(name)
        path = unquote(path)
        if hasattr(str, 'decode'):
            name = name.encode('utf-8').decode('utf-8')
            path = path.encode('utf-8').decode('utf-8')
        try:
            orig_path = u"{0}{1}".format(dir, path)
            Filemanager.check_access_permission(
                dir, u"{}{}".format(path, name))

            new_name = u"{0}{1}".format(orig_path, name)
            if not os.path.exists(new_name):
                code = 0
        except Exception as e:
            code = 0
            if hasattr(e, 'strerror'):
                err_msg = gettext(u"Error: {0}").format(e.strerror)
            else:
                err_msg = gettext(u"Error: {0}").format(e)

        result = {
            'Path': path,
            'Name': name,
            'Error': err_msg,
            'Code': code
        }

        return result

    @staticmethod
    def get_new_name(dir, path, new_name, count=1):
        """
        Utility to provide new name for folder if file
        with same name already exists
        """
        last_char = new_name[-1]
        t_new_path = u"{}/{}{}_{}".format(dir, path, new_name, count)
        if last_char == 'r' and not path_exists(t_new_path):
            return t_new_path, new_name
        else:
            last_char = int(t_new_path[-1]) + 1
            new_path = u"{}/{}{}_{}".format(dir, path, new_name, last_char)
            if path_exists(new_path):
                count += 1
                return Filemanager.get_new_name(dir, path, new_name, count)
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

        except IOError as ex:
            status = False
            # we don't want to expose real path of file
            # so only show error message.
            if ex.strerror == 'Permission denied':
                err_msg = gettext(u"Error: {0}").format(ex.strerror)
            else:
                err_msg = gettext(u"Error: {0}").format(str(ex))

        except Exception as ex:
            status = False
            err_msg = gettext(u"Error: {0}").format(str(ex))

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
            return {
                'Error': gettext('Not allowed'),
                'Code': 0
            }

        dir = self.dir if self.dir is not None else ''

        try:
            Filemanager.check_access_permission(dir, u"{}{}".format(
                path, name))
        except Exception as e:
            res = {
                'Error': gettext(u"Error: {0}").format(e),
                'Code': 0
            }
            return res

        if dir != "":
            new_path = u"{}/{}{}/".format(dir, path, name)
        else:
            new_path = u"{}{}/".format(path, name)

        err_msg = ''
        code = 1
        new_name = name
        if not path_exists(new_path):
            try:
                os.mkdir(new_path)
            except Exception as e:
                code = 0
                err_msg = gettext(u"Error: {0}").format(e.strerror)
        else:
            new_path, new_name = self.get_new_name(dir, path, name)
            try:
                os.mkdir(new_path)
            except Exception as e:
                code = 0
                err_msg = gettext(u"Error: {0}").format(e.strerror)

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
            return {
                'Error': gettext('Not allowed'),
                'Code': 0
            }

        dir = self.dir if self.dir is not None else ''

        if hasattr(str, 'decode'):
            path = path.encode('utf-8')
            orig_path = u"{0}{1}".format(dir, path.decode('utf-8'))
        else:
            orig_path = u"{0}{1}".format(dir, path)

        try:
            Filemanager.check_access_permission(
                dir, u"{}{}".format(path, path)
            )
        except Exception as e:
            resp = Response(gettext(u"Error: {0}").format(e))
            resp.headers['Content-Disposition'] = \
                'attachment; filename=' + name
            return resp

        name = path.split('/')[-1]
        content = open(orig_path, 'rb')
        resp = Response(content)
        resp.headers['Content-Disposition'] = 'attachment; filename=' + name
        return resp

    def permission(self, path=None, req=None):
        dir = self.dir if self.dir is not None else ''
        res = {'Code': 1}
        try:
            Filemanager.check_access_permission(dir, path)
        except Exception as e:
            err_msg = gettext(u"Error: {0}").format(e)
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
