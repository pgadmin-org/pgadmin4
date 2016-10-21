##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements File Manager"""

import os
import os.path
import random
import string
import time
from sys import platform as _platform

import simplejson as json
from flask import render_template, Response, session, request as req, url_for
from flask_babel import gettext
from flask_security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils import get_storage_directory
from pgadmin.utils.ajax import make_json_response

# Checks if platform is Windows
if _platform == "win32":
    import ctypes

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
    for unit in ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z']:
        if abs(num) < 1024.0:
            return "%3.1f %s%s" % (num, unit, suffix)
        num /= 1024.0
    return "%.1f %s%s" % (num, 'Y', suffix)


# return size of file
def getSize(path):
    st = os.stat(path)
    return st.st_size


def getDriveSize(path):
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
            attrs = ctypes.windll.kernel32.GetFileAttributesW(
                unicode(filepath))
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
            url_for('static', filename='css/jquery.dropzone/dropzone.css'),
            url_for('file_manager.static', filename='css/file_manager.css')
        ]

    def get_own_menuitems(self):
        return {
            'file_items': []
        }

    def get_file_size_preference(self):
        return self.file_upload_size

    def register_preferences(self):
        # Register 'file upload size' preference
        self.file_upload_size = self.preference.register(
            'options', 'file_upload_size',
            gettext("Maximum file upload size (MB)"), 'integer', 50,
            category_label=gettext('Options')
        )


# Initialise the module
blueprint = FileManagerModule(MODULE_NAME, __name__)


@blueprint.route("/")
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


@blueprint.route("/en.js")
@login_required
def language():
    """render the required javascript"""
    return Response(response=render_template(
        "file_manager/js/languages/en.js", _=gettext),
        status=200,
        mimetype="application/javascript")


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
    # trans_id = Filemanager.create_new_transaction()
    data = Filemanager.get_trasaction_selection(trans_id)
    return Response(response=render_template(
        "file_manager/js/file_manager_config.json", _=gettext,
        data=data),
        status=200,
        mimetype="application/json")


@blueprint.route("/get_trans_id", methods=["GET", "POST"])
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


@blueprint.route("/del_trans_id/<int:trans_id>", methods=["GET", "POST"])
@login_required
def delete_trans_id(trans_id):
    Filemanager.release_transaction(trans_id)
    return make_json_response(
        data={'status': True}
    )


class Filemanager(object):
    """FileManager Class."""

    def __init__(self, trans_id):
        self.trans_id = trans_id
        self.patherror = encode_json(
            {
                'Error': gettext('No permission to operate on \
                                  specified path.'),
                'Code': -1
            }
        )
        self.dir = get_storage_directory()

        if (self.dir is not None and isinstance(self.dir, list)):
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
        fm_type = params['dialog_type']
        storage_dir = get_storage_directory()

        # It is used in utitlity js to decide to
        # show or hide select file type options
        show_volumes = isinstance(storage_dir, list) or not storage_dir
        supp_types = allow_upload_files = params['supported_types'] \
            if 'supported_types' in params else []
        if fm_type == 'select_file':
            capabilities = ['select_file', 'rename', 'upload', 'create']
            supp_types = supp_types
            files_only = True
            folders_only = False
            title = "Select File"
        elif fm_type == 'select_folder':
            capabilities = ['select_folder', 'rename', 'create']
            files_only = False
            folders_only = True
            title = "Select Folder"
        elif fm_type == 'create_file':
            capabilities = ['select_file', 'rename', 'create']
            supp_types = supp_types
            files_only = True
            folders_only = False
            title = "Create File"
        elif fm_type == 'storage_dialog':
            capabilities = ['select_folder', 'select_file', 'download',
                            'rename', 'delete', 'upload', 'create']
            supp_types = supp_types
            files_only = True
            folders_only = False
            title = "Storage Manager"

        # create configs using above configs
        configs = {
            "fileroot": "/",
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
                    return "{0}{1}".format(drive_name, ':/')
                else:
                    return drives  # return drives if no argument is passed
            except Exception:
                return ['C:/']
        else:
            return '/'

    @staticmethod
    def list_filesystem(dir, path, trans_data, file_type):
        """
        It lists all file and folders within the given
        directory.
        """
        files = {}
        if (_platform == "win32" and path == '/') and dir is None:
            drives = Filemanager._get_drives()
            for drive in drives:
                protected = 0
                path = file_name = "{0}:/".format(drive)
                try:
                    drive_size = getDriveSize(path)
                    drive_size_in_units = sizeof_fmt(drive_size)
                except:
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
            return files

        if dir is None:
            dir = ""
        orig_path = "{0}{1}".format(dir, path)
        user_dir = path
        folders_only = trans_data['folders_only'] if 'folders_only' in \
                                                     trans_data else ''
        files_only = trans_data['files_only'] if 'files_only' in \
                                                 trans_data else ''
        supported_types = trans_data['supported_types'] \
            if 'supported_types' in trans_data else []

        orig_path = unquote(orig_path)
        try:
            mylist = [x for x in sorted(os.listdir(orig_path))]
            for f in mylist:
                protected = 0
                system_path = os.path.join(os.path.join(orig_path, f))

                # continue if file/folder is hidden
                if (is_folder_hidden(system_path) or f.startswith('.')):
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
                    file_extension = str('dir')
                    user_path = "{0}/".format(user_path)
                else:
                    # filter files based on file_type
                    if file_type is not None and file_type != "*":
                        if folders_only or len(supported_types) > 0 and \
                                        file_extension not in supported_types or \
                                        file_type != file_extension:
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
                        "Size": sizeof_fmt(getSize(system_path))
                    }
                }
        except Exception as e:
            if (hasattr(e, 'strerror') and
                    e.strerror == gettext('Permission denied')):
                err_msg = "Error: {0}".format(e.strerror)
            else:
                err_msg = "Error: {0}".format(e)
            files = {
                'Code': 0,
                'err_msg': err_msg
            }
        return files

    def validate_request(self, capability):
        """
        It validates the capability with the capabilities
        stored in the session
        """
        trans_data = Filemanager.get_trasaction_selection(self.trans_id)
        return False if capability not in trans_data['capabilities'] else True

    def getinfo(self, path=None, getsize=True, name=None, req=None):
        """
        Returns a JSON object containing information
        about the given file.
        """

        path = unquote(path)
        if self.dir is None:
            self.dir = ""
        orig_path = "{0}{1}".format(self.dir, path)
        user_dir = path
        thefile = {
            'Filename': split_path(orig_path)[-1],
            'File Type': '',
            'Path': user_dir,
            'Error': '',
            'Code': 0,
            'Properties': {
                'Date Created': '',
                'Date Modified': '',
                'Width': '',
                'Height': '',
                'Size': ''
            }
        }

        if not path_exists(orig_path):
            thefile['Error'] = gettext('File does not exist.')
            return (encode_json(thefile), None, 'application/json')

        if split_path(user_dir)[-1] == '/':
            thefile['File Type'] = 'Directory'
        else:
            thefile['File Type'] = splitext(user_dir)

        created = time.ctime(os.path.getctime(orig_path))
        modified = time.ctime(os.path.getmtime(orig_path))

        thefile['Properties']['Date Created'] = created
        thefile['Properties']['Date Modified'] = modified
        thefile['Properties']['Size'] = sizeof_fmt(getSize(orig_path))

        return thefile

    def getfolder(self, path=None, file_type="", name=None, req=None):
        """
        Returns files and folders in give path
        """
        trans_data = Filemanager.get_trasaction_selection(self.trans_id)
        dir = self.dir
        filelist = self.list_filesystem(dir, path, trans_data, file_type)
        return filelist

    def rename(self, old=None, new=None, req=None):
        """
        Rename file or folder
        """
        if not self.validate_request('rename'):
            return {
                'Error': gettext('Not allowed'),
                'Code': 1
            }

        dir = self.dir if self.dir is not None else ''
        # check if it's dir
        if old[-1] == '/':
            old = old[:-1]

        # extract filename
        oldname = split_path(old)[-1]
        path = str(old)
        path = split_path(path)[0]  # extract path

        if not path[-1] == '/':
            path += '/'

        # newname = encode_urlpath(new)
        newname = new
        newpath = path + newname

        # make system old path
        oldpath_sys = "{0}{1}".format(dir, old)
        newpath_sys = "{0}{1}".format(dir, newpath)

        error_msg = gettext('Renamed successfully.')
        code = 1
        try:
            os.rename(oldpath_sys, newpath_sys)
            code = 0
        except Exception as e:
            error_msg = "{0} {1}".format(
                gettext('There was an error renaming the file:'),
                str(e))

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
                'Code': 1
            }

        dir = self.dir if self.dir is not None else ''
        orig_path = "{0}{1}".format(dir, path)

        err_msg = ''
        code = 1
        try:
            if os.path.isdir(orig_path):
                os.rmdir(orig_path)
                code = 0
            else:
                os.remove(orig_path)
                code = 0
        except Exception as e:
            err_msg = "Error: {0}".format(e.strerror)

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
                'Code': 1
            }

        dir = self.dir if self.dir is not None else ''
        err_msg = ''
        code = 1
        try:
            path = req.form.get('currentpath')
            orig_path = "{0}{1}".format(dir, path)
            thefile = req.files['newfile']
            newName = '{0}{1}'.format(orig_path, thefile.filename)

            with open(newName, 'wb') as f:
                f.write(thefile.read())
            code = 0
        except Exception as e:
            err_msg = "Error: {0}".format(e.strerror)

        result = {
            'Path': path,
            'Name': newName,
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
        try:
            orig_path = "{0}{1}".format(dir, path)
            newName = '{0}{1}'.format(orig_path, name)
            if os.path.exists(newName):
                code = 0
            else:
                code = 1
        except Exception as e:
            err_msg = "Error: {0}".format(e.strerror)

        result = {
            'Path': path,
            'Name': name,
            'Error': err_msg,
            'Code': code
        }

        return result

    @staticmethod
    def getNewName(dir, path, newName, count=1):
        """
        Utility to provide new name for folder if file
        with same name already exists
        """
        last_char = newName[-1]
        tnewPath = dir + '/' + path + newName + '_' + str(count)
        if last_char == 'r' and not path_exists(tnewPath):
            return tnewPath, newName
        else:
            last_char = int(tnewPath[-1]) + 1
            newPath = dir + '/' + path + newName + '_' + str(last_char)
            if path_exists(newPath):
                count += 1
                return Filemanager.getNewName(dir, path, newName, count)
            else:
                return newPath, newName

    def addfolder(self, path, name):
        """
        Functionality to create new folder
        """
        if not self.validate_request('create'):
            return {
                'Error': gettext('Not allowed'),
                'Code': 1
            }

        dir = self.dir if self.dir is not None else ''
        newName = name
        if dir != "":
            newPath = dir + '/' + path + newName + '/'
        else:
            newPath = path + newName + '/'

        err_msg = ''
        code = 1
        if not path_exists(newPath):
            try:
                os.mkdir(newPath)
                code = 0
            except Exception as e:
                err_msg = "Error: {0}".format(e.strerror)
        else:
            newPath, newName = self.getNewName(dir, path, newName)
            try:
                os.mkdir(newPath)
                code = 0
            except Exception as e:
                err_msg = "Error: {0}".format(e.strerror)

        result = {
            'Parent': path,
            'Name': newName,
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
                'Code': 1
            }

        dir = self.dir if self.dir is not None else ''
        orig_path = "{0}{1}".format(dir, path)
        name = path.split('/')[-1]
        content = open(orig_path, 'r')
        resp = Response(content)
        resp.headers['Content-Disposition'] = 'attachment; filename=' + name
        return resp


@blueprint.route("/filemanager/<int:trans_id>/", methods=["GET", "POST"])
@login_required
def file_manager(trans_id):
    """
    It is the common function for every call which is made
    and takes function name from post request and calls it.
    It gets unique transaction id from post request and
    rotate it into Filemanager class.
    """
    myFilemanager = Filemanager(trans_id)
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
        func = getattr(myFilemanager, mode)
        res = func(**kwargs)
        return make_json_response(data={'result': res, 'status': True})
    except Exception:
        return getattr(myFilemanager, mode)(**kwargs)
