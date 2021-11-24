##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys
import subprocess
from collections import defaultdict
from operator import attrgetter

from flask import Blueprint, current_app
from flask_babel import gettext
from flask_security import current_user, login_required
from threading import Lock

from .paths import get_storage_directory
from .preferences import Preferences
from pgadmin.model import Server
from pgadmin.utils.constants import UTILITIES_ARRAY


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

        super(PgAdminModule, self).__init__(name, import_name, **kwargs)

        def create_module_preference():
            # Create preference for each module by default
            if hasattr(self, 'LABEL'):
                self.preference = Preferences(self.name, self.LABEL)
            else:
                self.preference = Preferences(self.name, None)

            self.register_preferences()

        # Create and register the module preference object and preferences for
        # it just before the first request
        self.before_app_first_request(create_module_preference)

    def register_preferences(self):
        # To be implemented by child classes
        pass

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """

        self.submodules = list(app.find_submodules(self.import_name))

        super(PgAdminModule, self).register(app, options)

        for module in self.submodules:
            module.parentmodules.append(self)
            if app.blueprints.get(module.name) is None:
                app.register_blueprint(module)
                app.register_logout_hook(module)

    def get_own_stylesheets(self):
        """
        Returns:
            list: the stylesheets used by this module, not including any
                stylesheet needed by the submodules.
        """
        return []

    def get_own_messages(self):
        """
        Returns:
            dict: the i18n messages used by this module, not including any
                messages needed by the submodules.
        """
        return dict()

    def get_own_javascripts(self):
        """
        Returns:
            list: the javascripts used by this module, not including
                any script needed by the submodules.
        """
        return []

    def get_own_menuitems(self):
        """
        Returns:
            dict: the menuitems for this module, not including
                any needed from the submodules.
        """
        return defaultdict(list)

    def get_panels(self):
        """
        Returns:
            list: a list of panel objects to add
        """
        return []

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return []

    @property
    def stylesheets(self):
        stylesheets = self.get_own_stylesheets()
        for module in self.submodules:
            stylesheets.extend(module.stylesheets)
        return stylesheets

    @property
    def messages(self):
        res = self.get_own_messages()

        for module in self.submodules:
            res.update(module.messages)
        return res

    @property
    def javascripts(self):
        javascripts = self.get_own_javascripts()
        for module in self.submodules:
            javascripts.extend(module.javascripts)
        return javascripts

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


def get_complete_file_path(file, validate=True):
    """
    Args:
        file: File returned by file manager

    Returns:
         Full path for the file
    """
    if not file:
        return None

    # If desktop mode
    if current_app.PGADMIN_RUNTIME or not current_app.config['SERVER_MODE']:
        return file if os.path.isfile(file) else None

    storage_dir = get_storage_directory()
    if storage_dir:
        file = os.path.join(
            storage_dir,
            file.lstrip('/').lstrip('\\')
        )
        if IS_WIN:
            file = file.replace('\\', '/')
            file = fs_short_path(file)

    if validate:
        return file if os.path.isfile(file) else None
    else:
        return file


def does_utility_exist(file):
    """
    This function will check the utility file exists on given path.
    :return:
    """
    error_msg = None
    if file is None:
        error_msg = gettext("Utility file not found. Please correct the Binary"
                            " Path in the Preferences dialog")
        return error_msg

    if not os.path.exists(file):
        error_msg = gettext("'%s' file not found. Please correct the Binary"
                            " Path in the Preferences dialog" % file)
    return error_msg


def get_server(sid):
    """
    # Fetch the server  etc
    :param sid:
    :return: server
    """
    server = Server.query.filter_by(id=sid).first()
    return server


def set_binary_path(binary_path, bin_paths, server_type,
                    version_number=None, set_as_default=False):
    """
    This function is used to iterate through the utilities and set the
    default binary path.
    """
    path_with_dir = binary_path if "$DIR" in binary_path else None

    # Check if "$DIR" present in binary path
    binary_path = replace_binary_path(binary_path)

    for utility in UTILITIES_ARRAY:
        full_path = os.path.abspath(
            os.path.join(binary_path, (utility if os.name != 'nt' else
                                       (utility + '.exe'))))

        try:
            # if version_number is provided then no need to fetch it.
            if version_number is None:
                # Get the output of the '--version' command
                version_string = \
                    subprocess.getoutput('"{0}" --version'.format(full_path))

                # Get the version number by splitting the result string
                version_number = \
                    version_string.split(") ", 1)[1].split('.', 1)[0]
            elif version_number.find('.'):
                version_number = version_number.split('.', 1)[0]

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
